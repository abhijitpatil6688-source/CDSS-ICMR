"""
Claude AI integration layer for ICMR CDSS.
Handles:
  1. Parsing free-text clinical notes into structured input
  2. Generating clinical insight and red-flag detection
  3. Enriching recommendations with explanations
"""
import json
from typing import Optional

import anthropic

from app.core.config import settings
from app.models.radiology import AIInsight


EXTRACTION_SYSTEM_PROMPT = """You are a clinical decision support assistant helping Indian clinicians.
Your task is to extract structured clinical information from free-text clinical notes.

Always respond with valid JSON only — no markdown, no explanation outside the JSON object.

Extract:
- symptoms: list of presenting symptoms (strings)
- suspected_diagnosis: the most likely working diagnosis or clinical suspicion (string or null)
- body_system: one of "chest", "abdomen", "neuro", "musculoskeletal", "urinary", "gynaecology", or null
- clinical_summary: 2-3 sentence summary of the clinical picture
- additional_considerations: specific imaging considerations (e.g. pregnancy, contrast allergy, renal function, paediatric)
- red_flags: list of any clinical red flags mentioned that require urgent attention

Return exactly this JSON structure:
{
  "symptoms": [],
  "suspected_diagnosis": null,
  "body_system": null,
  "clinical_summary": "",
  "additional_considerations": "",
  "red_flags": []
}"""


INSIGHT_SYSTEM_PROMPT = """You are a specialist radiology advisor supporting clinicians in India.
You are provided with:
1. A clinical scenario
2. Matched ICMR/ACR guideline recommendations

Generate a concise clinical insight commentary (3–5 sentences) that:
- Explains WHY certain modalities are recommended for this specific presentation
- Highlights India-specific considerations (resource availability, TB prevalence, radiation concern, cost)
- Mentions any important technical points or sequencing
- Notes any red flags or urgent actions needed

Be direct, practical, and evidence-based. Write for a junior doctor at a district hospital level."""


class ClaudeClient:
    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            self._client = None
        else:
            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    @property
    def is_available(self) -> bool:
        return self._client is not None

    async def extract_clinical_info(self, clinical_notes: str) -> Optional[AIInsight]:
        """Parse free-text clinical notes into structured clinical information."""
        if not self.is_available:
            return None

        try:
            response = self._client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=1024,
                system=EXTRACTION_SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"Extract structured clinical information from these notes:\n\n{clinical_notes}",
                    }
                ],
            )

            raw = response.content[0].text.strip()
            # Strip potential markdown fences
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            data = json.loads(raw)

            return AIInsight(
                extracted_symptoms=data.get("symptoms", []),
                extracted_diagnosis=data.get("suspected_diagnosis"),
                extracted_system=data.get("body_system"),
                clinical_summary=data.get("clinical_summary", ""),
                additional_considerations=data.get("additional_considerations", ""),
                red_flags=data.get("red_flags", []),
            )

        except Exception as e:
            # Non-critical — return None, rule engine still runs
            print(f"[Claude] Extraction failed: {e}")
            return None

    async def generate_clinical_insight(
        self,
        clinical_notes: str,
        scenario_title: str,
        top_recommendations: list[str],
    ) -> Optional[str]:
        """Generate a clinical commentary on the matched recommendations."""
        if not self.is_available:
            return None

        try:
            rec_text = "\n".join(f"- {r}" for r in top_recommendations)
            user_msg = (
                f"Clinical presentation:\n{clinical_notes}\n\n"
                f"Matched guideline scenario: {scenario_title}\n\n"
                f"Top recommended investigations:\n{rec_text}\n\n"
                "Provide a concise clinical insight commentary."
            )

            response = self._client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=512,
                system=INSIGHT_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )

            return response.content[0].text.strip()

        except Exception as e:
            print(f"[Claude] Insight generation failed: {e}")
            return None


# Module-level singleton
claude = ClaudeClient()
