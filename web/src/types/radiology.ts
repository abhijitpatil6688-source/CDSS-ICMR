export type Appropriateness =
  | 'usually_appropriate'
  | 'may_be_appropriate'
  | 'usually_not_appropriate'

export type RadiationLevel = 'none' | 'minimal' | 'low' | 'moderate' | 'high'

export type BodySystem =
  | 'chest'
  | 'abdomen'
  | 'neuro'
  | 'musculoskeletal'
  | 'urinary'
  | 'gynaecology'
  | 'cardiovascular'

export interface PatientContext {
  age?: number
  sex?: 'male' | 'female' | 'other'
  is_pregnant?: boolean
  comorbidities?: string[]
}

export interface RadiologyRequest {
  body_system?: BodySystem
  symptoms: string[]
  suspected_diagnosis?: string
  clinical_notes?: string
  patient: PatientContext
  use_ai_parsing: boolean
}

export interface ModalityRecommendation {
  modality: string
  code: string
  rating: number
  appropriateness: Appropriateness
  radiation_level: RadiationLevel
  radiation_msv_range: string
  rationale: string
  india_context: string
  special_notes?: string
  contraindicated_if: string[]
}

export interface GuidelineScenario {
  id: string
  title: string
  body_system: BodySystem
  recommendations: ModalityRecommendation[]
  references: string[]
  tags: string[]
  match_score: number
}

export interface AIInsight {
  extracted_symptoms: string[]
  extracted_diagnosis?: string
  extracted_system?: string
  clinical_summary: string
  additional_considerations: string
  red_flags: string[]
}

export interface RadiologyResponse {
  request_id: string
  matched_scenarios: GuidelineScenario[]
  ai_insight?: AIInsight
  patient_specific_notes: string[]
  disclaimer: string
}
