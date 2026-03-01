from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────────────

class Appropriateness(str, Enum):
    USUALLY_APPROPRIATE = "usually_appropriate"
    MAY_BE_APPROPRIATE = "may_be_appropriate"
    USUALLY_NOT_APPROPRIATE = "usually_not_appropriate"


class RadiationLevel(str, Enum):
    NONE = "none"           # MRI, Ultrasound — 0 mSv
    MINIMAL = "minimal"     # CXR — <0.1 mSv
    LOW = "low"             # Mammography — 0.1–1 mSv
    MODERATE = "moderate"   # CT chest/abdomen — 1–10 mSv
    HIGH = "high"           # PET-CT, CT whole body — >10 mSv


class BodySystem(str, Enum):
    CHEST = "chest"
    ABDOMEN = "abdomen"
    NEURO = "neuro"
    MUSCULOSKELETAL = "musculoskeletal"
    URINARY = "urinary"
    GYNAECOLOGY = "gynaecology"
    CARDIOVASCULAR = "cardiovascular"


class Sex(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


# ─── Request Models ──────────────────────────────────────────────────────────

class PatientContext(BaseModel):
    age: Optional[int] = Field(None, ge=0, le=120, description="Patient age in years")
    sex: Optional[Sex] = None
    is_pregnant: Optional[bool] = False
    is_paediatric: Optional[bool] = None   # auto-derived if age < 18
    comorbidities: list[str] = Field(default_factory=list,
                                     description="e.g. ['diabetes', 'renal failure', 'contrast allergy']")

    def model_post_init(self, __context):
        if self.age is not None and self.is_paediatric is None:
            self.is_paediatric = self.age < 18


class RadiologyRequest(BaseModel):
    # Structured input
    body_system: Optional[BodySystem] = None
    symptoms: list[str] = Field(default_factory=list,
                                description="List of presenting symptoms")
    suspected_diagnosis: Optional[str] = Field(None,
                                               description="Clinical suspicion / working diagnosis")
    clinical_notes: Optional[str] = Field(None,
                                          description="Free-text clinical description (AI will parse this)")
    patient: PatientContext = Field(default_factory=PatientContext)

    # Flags
    use_ai_parsing: bool = Field(True, description="Use Claude to parse free-text notes")


# ─── Response Models ─────────────────────────────────────────────────────────

class ModalityRecommendation(BaseModel):
    modality: str
    code: str
    rating: int = Field(..., ge=1, le=9, description="ACR-style 1–9 appropriateness rating")
    appropriateness: Appropriateness
    radiation_level: RadiationLevel
    radiation_msv_range: str
    rationale: str
    india_context: str
    special_notes: Optional[str] = None
    contraindicated_if: list[str] = Field(default_factory=list)


class GuidelineScenario(BaseModel):
    id: str
    title: str
    body_system: BodySystem
    recommendations: list[ModalityRecommendation]
    references: list[str]
    tags: list[str]
    match_score: float = 0.0     # how well it matched the input


class AIInsight(BaseModel):
    extracted_symptoms: list[str]
    extracted_diagnosis: Optional[str]
    extracted_system: Optional[str]
    clinical_summary: str
    additional_considerations: str
    red_flags: list[str]


class RadiologyResponse(BaseModel):
    request_id: str
    matched_scenarios: list[GuidelineScenario]
    ai_insight: Optional[AIInsight] = None
    patient_specific_notes: list[str] = Field(default_factory=list,
                                               description="Pregnancy/paediatric/contrast allergy adjustments")
    disclaimer: str = (
        "This tool provides guideline-based decision support only. "
        "Clinical judgement must always take precedence. "
        "Based on ICMR guidelines and ACR Appropriateness Criteria (India-adapted)."
    )
