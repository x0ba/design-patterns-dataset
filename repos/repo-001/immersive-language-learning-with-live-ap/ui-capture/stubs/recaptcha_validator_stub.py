"""
Offline stand-in for server/recaptcha_validator.py (reCAPTCHA Enterprise
createAssessment). Accepts any non-empty token with a human-like score.
"""
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


class RecaptchaValidator:
    def __init__(self, project_id: str, recaptcha_key: str, score_threshold: float = 0.5):
        self.project_id = project_id
        self.recaptcha_key = recaptcha_key
        self.score_threshold = score_threshold

    def validate_token(self, token: str, recaptcha_action: str) -> Dict[str, Any]:
        if not token:
            return {"valid": False, "score": 0.0, "error": "Invalid token: MALFORMED", "reasons": []}
        score = 0.9
        return {"valid": True, "score": score, "passes_threshold": score >= self.score_threshold,
                "reasons": [], "action": recaptcha_action}
