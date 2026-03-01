"""
ICMR Radiology Rule Engine
Matches clinical input against guideline scenarios and returns ranked recommendations.
"""
import json
import os
import uuid
from pathlib import Path
from typing import Optional

from app.models.radiology import (
    RadiologyRequest, RadiologyResponse, GuidelineScenario,
    ModalityRecommendation, Appropriateness, RadiationLevel, BodySystem,
)
from app.core.config import settings


# ─── Radiation level enum → numeric for sorting ─────────────────────────────
RL_ORDER = {
    RadiationLevel.NONE: 0,
    RadiationLevel.MINIMAL: 1,
    RadiationLevel.LOW: 2,
    RadiationLevel.MODERATE: 3,
    RadiationLevel.HIGH: 4,
}

APP_ORDER = {
    Appropriateness.USUALLY_APPROPRIATE: 0,
    Appropriateness.MAY_BE_APPROPRIATE: 1,
    Appropriateness.USUALLY_NOT_APPROPRIATE: 2,
}


class RadiologyRuleEngine:

    def __init__(self):
        self._guidelines: dict[str, list[dict]] = {}
        self._load_guidelines()

    # ─── Loading ─────────────────────────────────────────────────────────────

    def _load_guidelines(self):
        """Load all guideline JSON files from the guidelines directory."""
        # engine.py is at: backend/app/rule_engine/engine.py
        # guidelines are at: backend/guidelines/radiology
        base = Path(__file__).resolve().parent.parent.parent / "guidelines" / "radiology"
        for json_file in base.glob("*.json"):
            system = json_file.stem  # e.g. "chest"
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._guidelines[system] = data.get("scenarios", [])

    def get_all_symptoms(self) -> list[str]:
        """Return deduplicated list of all symptom keywords across all guidelines."""
        symptoms: set[str] = set()
        for scenarios in self._guidelines.values():
            for sc in scenarios:
                symptoms.update(sc.get("symptoms", []))
        return sorted(symptoms)

    def get_all_conditions(self) -> list[str]:
        """Return all clinical conditions / diagnoses."""
        conditions: set[str] = set()
        for scenarios in self._guidelines.values():
            for sc in scenarios:
                conditions.update(sc.get("clinical_conditions", []))
        return sorted(conditions)

    def get_systems(self) -> list[str]:
        return list(self._guidelines.keys())

    # ─── Matching ─────────────────────────────────────────────────────────────

    def _score_scenario(
        self,
        scenario: dict,
        symptoms: list[str],
        suspected_dx: Optional[str],
    ) -> float:
        """Score a scenario against clinical inputs (0.0 – 1.0).
        Note: system-level filtering is done in recommend() before calling this.
        """
        score = 0.0
        symptom_tokens = {s.lower() for s in symptoms}
        dx_token = suspected_dx.lower() if suspected_dx else ""

        # --- Condition match (highest weight) --------------------------------
        conditions = [c.lower() for c in scenario.get("clinical_conditions", [])]
        if dx_token:
            for cond in conditions:
                if dx_token in cond or cond in dx_token:
                    score += 0.6
                    break
            # Partial word overlap
            dx_words = set(dx_token.split())
            for cond in conditions:
                cond_words = set(cond.split())
                overlap = dx_words & cond_words
                if overlap:
                    score += 0.3 * (len(overlap) / max(len(dx_words), 1))
                    break

        # --- Symptom match ---------------------------------------------------
        scenario_symptoms = [s.lower() for s in scenario.get("symptoms", [])]
        matched = 0
        for sym in symptom_tokens:
            for ssym in scenario_symptoms:
                if sym in ssym or ssym in sym:
                    matched += 1
                    break
        if scenario_symptoms:
            score += 0.4 * (matched / len(scenario_symptoms))

        # --- Tag match -------------------------------------------------------
        tags = [t.lower() for t in scenario.get("tags", [])]
        if dx_token:
            for tag in tags:
                if tag in dx_token or dx_token in tag:
                    score += 0.1
                    break

        return min(score, 1.0)

    def _apply_patient_adjustments(
        self,
        recommendations: list[ModalityRecommendation],
        request: RadiologyRequest,
    ) -> tuple[list[ModalityRecommendation], list[str]]:
        """Apply patient-specific adjustments (pregnancy, paediatric, contrast allergy)."""
        notes: list[str] = []
        patient = request.patient
        adjusted = []

        for rec in recommendations:
            mod = rec.model_copy()

            # Pregnancy — radiation concern
            if patient.is_pregnant:
                if mod.radiation_level in (RadiationLevel.MODERATE, RadiationLevel.HIGH):
                    mod.special_notes = (
                        f"⚠️ PREGNANCY: {mod.modality} involves ionising radiation. "
                        "Use only if clinical benefit clearly outweighs risk. "
                        "Consider MRI or ultrasound as alternatives."
                    )
                    if mod.appropriateness == Appropriateness.USUALLY_APPROPRIATE:
                        mod.appropriateness = Appropriateness.MAY_BE_APPROPRIATE
                        mod.rating = max(mod.rating - 2, 4)

                if "pregnancy" not in [c.lower() for c in mod.contraindicated_if]:
                    adjusted.append(mod)
                else:
                    notes.append(
                        f"{mod.modality} is contraindicated in pregnancy — excluded from recommendations."
                    )
                    continue

            # Paediatric — reduce radiation preference
            elif patient.is_paediatric:
                if mod.radiation_level == RadiationLevel.HIGH:
                    mod.special_notes = (
                        f"⚠️ PAEDIATRIC: Prefer lower-radiation alternatives where possible (ALARA principle). "
                        "Use paediatric dose reduction protocol if CT is necessary."
                    )

            # Contrast allergy
            if patient.comorbidities:
                comorbid_lower = [c.lower() for c in patient.comorbidities]
                if "contrast allergy" in comorbid_lower:
                    if "contrast allergy" in [c.lower() for c in mod.contraindicated_if]:
                        notes.append(
                            f"{mod.modality} excluded — patient has contrast allergy."
                        )
                        continue
                if "renal failure" in comorbid_lower or "ckd" in comorbid_lower:
                    if any("renal" in c.lower() for c in mod.contraindicated_if):
                        notes.append(
                            f"{mod.modality} excluded — patient has renal impairment (contrast risk)."
                        )
                        continue

            adjusted.append(mod)

        if patient.is_pregnant:
            notes.insert(0, "Patient is pregnant: ionising radiation minimised. Ultrasound and MRI preferred.")
        if patient.is_paediatric:
            notes.insert(0, f"Paediatric patient (age {patient.age}): ALARA principle applied. Use lowest effective dose.")

        return adjusted, notes

    def _build_recommendation(self, raw: dict) -> ModalityRecommendation:
        return ModalityRecommendation(
            modality=raw["modality"],
            code=raw["code"],
            rating=raw["rating"],
            appropriateness=Appropriateness(raw["appropriateness"]),
            radiation_level=RadiationLevel(raw["radiation_level"]),
            radiation_msv_range=raw["radiation_msv_range"],
            rationale=raw["rationale"],
            india_context=raw["india_context"],
            special_notes=raw.get("special_notes"),
            contraindicated_if=raw.get("contraindicated_if", []),
        )

    # ─── Public API ───────────────────────────────────────────────────────────

    def recommend(self, request: RadiologyRequest) -> RadiologyResponse:
        body_system = request.body_system.value if request.body_system else None

        # Gather candidate scenarios from all (or filtered) systems
        candidates = []
        for system, scenarios in self._guidelines.items():
            if body_system and system != body_system:
                continue
            for sc in scenarios:
                score = self._score_scenario(
                    sc,
                    request.symptoms,
                    request.suspected_diagnosis,
                )
                candidates.append((score, system, sc))

        # Sort by score descending
        candidates.sort(key=lambda x: x[0], reverse=True)

        # Always return top 3 — if nothing scored above threshold use top results anyway
        # (better to show closest match with low confidence than an empty page)
        HIGH_THRESHOLD = 0.05
        above = [c for c in candidates if c[0] >= HIGH_THRESHOLD]
        top_candidates = (above if above else candidates)[:3]

        matched: list[GuidelineScenario] = []
        all_patient_notes: list[str] = []

        for score, system, sc in top_candidates:
            recs_raw = sc.get("recommendations", [])
            recs = [self._build_recommendation(r) for r in recs_raw]

            # Sort recs: usually appropriate first, then by rating desc
            recs.sort(key=lambda r: (APP_ORDER[r.appropriateness], -r.rating))

            # Apply patient-specific adjustments
            recs, p_notes = self._apply_patient_adjustments(recs, request)
            all_patient_notes.extend(p_notes)

            matched.append(GuidelineScenario(
                id=sc["id"],
                title=sc["title"],
                body_system=BodySystem(system),
                recommendations=recs,
                references=sc.get("references", []),
                tags=sc.get("tags", []),
                match_score=round(score, 2),
            ))

        # Deduplicate patient notes
        seen = set()
        unique_notes = []
        for n in all_patient_notes:
            if n not in seen:
                seen.add(n)
                unique_notes.append(n)

        return RadiologyResponse(
            request_id=str(uuid.uuid4()),
            matched_scenarios=matched,
            patient_specific_notes=unique_notes,
        )
