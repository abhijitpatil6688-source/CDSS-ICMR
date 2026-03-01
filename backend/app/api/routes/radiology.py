from __future__ import annotations

import re
from fastapi import APIRouter

from app.models.radiology import RadiologyRequest, RadiologyResponse, BodySystem
from app.rule_engine.engine import RadiologyRuleEngine
from app.ai.claude_client import claude

router = APIRouter(prefix="/radiology", tags=["Radiology CDSS"])

# Single shared engine instance (guidelines loaded once at startup)
_engine = RadiologyRuleEngine()


def _keyword_fallback(notes: str, engine: RadiologyRuleEngine) -> tuple[list[str], str | None]:
    """
    Simple keyword extraction from free-text when Claude is unavailable.
    Matches words in the notes against known symptoms and conditions.
    """
    notes_lower = notes.lower()
    words = set(re.findall(r'\b\w+\b', notes_lower))

    # Match against known symptoms
    matched_symptoms: list[str] = []
    for sym in engine.get_all_symptoms():
        sym_words = set(re.findall(r'\b\w+\b', sym.lower()))
        if sym_words & words:           # any word overlap
            matched_symptoms.append(sym)

    # Match against known conditions — pick the highest overlap
    best_condition: str | None = None
    best_overlap = 0
    for cond in engine.get_all_conditions():
        cond_words = set(re.findall(r'\b\w+\b', cond.lower()))
        overlap = len(cond_words & words)
        if overlap > best_overlap:
            best_overlap = overlap
            best_condition = cond

    return matched_symptoms[:10], best_condition   # cap symptoms at 10


@router.post("/recommend", response_model=RadiologyResponse, summary="Get imaging recommendations")
async def get_recommendations(request: RadiologyRequest) -> RadiologyResponse:
    """
    Main CDSS endpoint. Accepts clinical input (symptoms, suspected diagnosis,
    free-text notes, patient context) and returns ranked imaging recommendations
    based on ICMR + ACR Appropriateness Criteria.
    """
    ai_insight = None

    # ── Step 1: Parse free-text notes ────────────────────────────────────────
    if request.clinical_notes:
        if request.use_ai_parsing and claude.is_available:
            # Primary path: Claude AI extraction
            ai_insight = await claude.extract_clinical_info(request.clinical_notes)
            if ai_insight:
                if not request.symptoms and ai_insight.extracted_symptoms:
                    request.symptoms = ai_insight.extracted_symptoms
                if not request.suspected_diagnosis and ai_insight.extracted_diagnosis:
                    request.suspected_diagnosis = ai_insight.extracted_diagnosis
                if not request.body_system and ai_insight.extracted_system:
                    try:
                        request.body_system = BodySystem(ai_insight.extracted_system)
                    except ValueError:
                        pass
        else:
            # Fallback path: keyword extraction (no API key needed)
            fb_symptoms, fb_condition = _keyword_fallback(request.clinical_notes, _engine)
            if not request.symptoms and fb_symptoms:
                request.symptoms = fb_symptoms
            if not request.suspected_diagnosis and fb_condition:
                request.suspected_diagnosis = fb_condition

    # ── Step 2: Run rule engine ───────────────────────────────────────────────
    response = _engine.recommend(request)

    # ── Step 3: Attach AI insight ─────────────────────────────────────────────
    if ai_insight:
        response.ai_insight = ai_insight

    return response


@router.get("/systems", summary="List available body systems")
async def list_systems() -> dict:
    return {
        "systems": [
            {"value": s, "label": s.replace("_", " ").title()}
            for s in _engine.get_systems()
        ]
    }


@router.get("/symptoms", summary="List all symptom keywords for autocomplete")
async def list_symptoms() -> dict:
    return {"symptoms": _engine.get_all_symptoms()}


@router.get("/conditions", summary="List all clinical conditions / diagnoses")
async def list_conditions() -> dict:
    return {"conditions": _engine.get_all_conditions()}


@router.get("/health", summary="Engine health check")
async def engine_health() -> dict:
    return {
        "status": "ok",
        "loaded_systems": _engine.get_systems(),
        "ai_available": claude.is_available,
    }
