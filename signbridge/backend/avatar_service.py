"""Avatar animation mapping and gesture orchestration service."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from config import get_settings

logger = logging.getLogger(__name__)

# Gesture to GLB animation file mapping
GESTURE_ANIMATIONS: dict[str, str] = {
    "hello": "hello.glb",
    "thank_you": "thank_you.glb",
    "yes": "yes.glb",
    "no": "no.glb",
    "help": "help.glb",
    "good": "good.glb",
    "please": "hello.glb",  # fallback animation
    "love": "hello.glb",
    "sorry": "no.glb",
    "stop": "no.glb",
    "wait": "help.glb",
}

# Keyword to gesture mapping from speech text
SPEECH_TO_GESTURE: dict[str, str] = {
    "hello": "hello",
    "hi": "hello",
    "hey": "hello",
    "thank": "thank_you",
    "thanks": "thank_you",
    "yes": "yes",
    "yeah": "yes",
    "yep": "yes",
    "no": "no",
    "nope": "no",
    "help": "help",
    "assist": "help",
    "good": "good",
    "great": "good",
    "bye": "good",
    "goodbye": "good",
    "please": "please",
    "sorry": "sorry",
    "love": "love",
    "stop": "stop",
    "wait": "wait",
}

AVATAR_PRESETS = {
    "male": {
        "genders": ["male"],
        "skin_tones": ["light", "medium", "dark", "olive"],
        "outfits": ["casual", "business", "formal"],
    },
    "female": {
        "genders": ["female"],
        "skin_tones": ["light", "medium", "dark", "olive"],
        "outfits": ["casual", "business", "formal"],
    },
}


class AvatarService:
    """Maps text/speech to avatar gestures and manages animation state."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.animations_dir = (
            Path(__file__).resolve().parent.parent / "frontend" / "src" / "assets" / "animations"
        )

    def get_available_animations(self) -> list[dict[str, str]]:
        """List all registered gesture animations."""
        animations = []
        for gesture, filename in GESTURE_ANIMATIONS.items():
            path = self.animations_dir / filename
            animations.append(
                {
                    "gesture": gesture,
                    "filename": filename,
                    "available": path.exists(),
                    "url": f"/animations/{filename}",
                }
            )
        return animations

    def text_to_gesture(self, text: str) -> str | None:
        """Extract the best matching gesture from spoken/written text."""
        normalized = text.lower().strip()
        for keyword, gesture in SPEECH_TO_GESTURE.items():
            if keyword in normalized:
                return gesture
        return None

    def build_avatar_message(
        self,
        text: str,
        translated_text: str | None = None,
        source: str = "speech",
    ) -> dict[str, Any]:
        """
        Build a complete avatar animation message for WebSocket broadcast.
        """
        gesture = self.text_to_gesture(text)
        animation_file = GESTURE_ANIMATIONS.get(gesture, "hello.glb") if gesture else None

        return {
            "type": "avatar",
            "source": source,
            "text": text,
            "translated_text": translated_text or text,
            "gesture": gesture,
            "animation": animation_file,
            "animation_url": f"/animations/{animation_file}" if animation_file else None,
            "duration_ms": 2500,
            "blend_mode": "crossfade",
            "expressions": self._infer_expressions(text),
            "lip_sync": self._generate_lip_sync_frames(translated_text or text),
        }

    def _infer_expressions(self, text: str) -> dict[str, float]:
        """Infer facial expression weights from text sentiment."""
        lower = text.lower()
        expressions = {"neutral": 0.5, "happy": 0.0, "sad": 0.0, "surprised": 0.0}

        if any(w in lower for w in ("thank", "good", "great", "love", "happy", "yes")):
            expressions["happy"] = 0.8
            expressions["neutral"] = 0.2
        elif any(w in lower for w in ("sorry", "sad", "no", "help")):
            expressions["sad"] = 0.6
            expressions["neutral"] = 0.4
        elif any(w in lower for w in ("wow", "what", "?")):
            expressions["surprised"] = 0.7
            expressions["neutral"] = 0.3

        return expressions

    def _generate_lip_sync_frames(self, text: str) -> list[dict[str, Any]]:
        """Generate simple viseme frames for lip sync from text."""
        viseme_map = {
            "a": "AA", "e": "E", "i": "I", "o": "O", "u": "U",
            "m": "PP", "b": "PP", "p": "PP",
            "f": "FF", "v": "FF",
            "t": "DD", "d": "DD",
            "s": "SS", "z": "SS",
            "r": "RR", "l": "RR",
        }
        frames = []
        for i, char in enumerate(text.lower()[:100]):
            viseme = viseme_map.get(char, "sil")
            frames.append({"time_ms": i * 80, "viseme": viseme, "weight": 0.8})
        return frames

    def get_avatar_config_options(self) -> dict[str, Any]:
        return {
            "presets": AVATAR_PRESETS,
            "default_avatar_url": "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb",
            "animations": self.get_available_animations(),
        }

    def validate_avatar_config(self, config: dict[str, Any]) -> dict[str, Any]:
        """Validate and normalize avatar configuration."""
        gender = config.get("gender", "male")
        if gender not in ("male", "female"):
            gender = "male"
        return {
            "gender": gender,
            "skin_tone": config.get("skin_tone", "medium"),
            "outfit": config.get("outfit", "casual"),
            "avatar_url": config.get(
                "avatar_url",
                "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb",
            ),
        }


avatar_service = AvatarService()
