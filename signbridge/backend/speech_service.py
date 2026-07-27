"""Speech-to-text service using Faster-Whisper with graceful fallback."""

from __future__ import annotations

import io
import logging
from typing import Any

from config import get_settings

logger = logging.getLogger(__name__)

_whisper_model = None


def _load_whisper():
    """Lazy-load Faster-Whisper model."""
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model

    settings = get_settings()
    try:
        from faster_whisper import WhisperModel

        device = "cuda" if settings.use_gpu else settings.whisper_device
        compute_type = "float16" if device == "cuda" else "int8"
        _whisper_model = WhisperModel(
            settings.whisper_model,
            device=device,
            compute_type=compute_type,
        )
        logger.info("Loaded Whisper model: %s on %s", settings.whisper_model, device)
    except Exception as exc:
        logger.warning("Whisper unavailable (%s). Using fallback transcription.", exc)
        _whisper_model = False
    return _whisper_model


class SpeechService:
    """Transcribes audio bytes to text using Whisper."""

    SUPPORTED_FORMATS = {"wav", "webm", "mp3", "ogg", "flac"}

    def __init__(self) -> None:
        self.settings = get_settings()

    def transcribe(
        self,
        audio_bytes: bytes,
        language: str | None = None,
    ) -> dict[str, Any]:
        """
        Transcribe audio data.

        Returns dict with text, language, confidence, and segments.
        """
        model = _load_whisper()

        if model is False:
            return self._fallback_transcribe(audio_bytes, language)

        try:
            segments, info = model.transcribe(
                io.BytesIO(audio_bytes),
                language=language,
                beam_size=5,
                vad_filter=True,
            )
            text_parts = []
            all_segments = []
            for segment in segments:
                text_parts.append(segment.text.strip())
                all_segments.append(
                    {
                        "start": segment.start,
                        "end": segment.end,
                        "text": segment.text.strip(),
                    }
                )

            return {
                "text": " ".join(text_parts).strip(),
                "language": info.language,
                "confidence": info.language_probability,
                "segments": all_segments,
                "model": self.settings.whisper_model,
            }
        except Exception as exc:
            logger.error("Transcription failed: %s", exc)
            return self._fallback_transcribe(audio_bytes, language)

    def _fallback_transcribe(
        self, audio_bytes: bytes, language: str | None
    ) -> dict[str, Any]:
        """Fallback when Whisper is not installed — returns placeholder."""
        if len(audio_bytes) < 100:
            return {
                "text": "",
                "language": language or "en",
                "confidence": 0.0,
                "segments": [],
                "model": "fallback",
            }
        return {
            "text": "[Speech detected — install faster-whisper for transcription]",
            "language": language or "en",
            "confidence": 0.5,
            "segments": [],
            "model": "fallback",
        }

    def map_to_avatar_gesture(self, text: str) -> str | None:
        """Map recognized speech keywords to avatar animation gestures."""
        normalized = text.lower().strip()
        gesture_map = {
            "hello": "hello",
            "hi": "hello",
            "hey": "hello",
            "thank you": "thank_you",
            "thanks": "thank_you",
            "yes": "yes",
            "yeah": "yes",
            "no": "no",
            "nope": "no",
            "help": "help",
            "good": "good",
            "goodbye": "good",
            "bye": "good",
        }
        for keyword, gesture in gesture_map.items():
            if keyword in normalized:
                return gesture
        return None


speech_service = SpeechService()
