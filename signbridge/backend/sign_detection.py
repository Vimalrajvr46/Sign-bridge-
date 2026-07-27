"""Sign language detection using MediaPipe hand landmarks and gesture classification."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

from config import get_settings

logger = logging.getLogger(__name__)

# Common ASL / gesture vocabulary mapped from hand landmark patterns
SIGN_VOCABULARY: dict[str, str] = {
    "hello": "Hello",
    "thank_you": "Thank you",
    "yes": "Yes",
    "no": "No",
    "help": "Help",
    "good": "Good",
    "please": "Please",
    "sorry": "Sorry",
    "love": "I love you",
    "water": "Water",
    "eat": "Eat",
    "more": "More",
    "stop": "Stop",
    "wait": "Wait",
    "understand": "I understand",
    "name": "What is your name?",
    "how_are_you": "How are you?",
}

_mediapipe_hands = None


def _load_mediapipe():
    global _mediapipe_hands
    if _mediapipe_hands is not None:
        return _mediapipe_hands
    try:
        import importlib

        mp = importlib.import_module('mediapipe')
        mp_solutions = getattr(mp, 'solutions')
        hands_module = getattr(mp_solutions, 'hands')
        Hands = getattr(hands_module, 'Hands')

        _mediapipe_hands = Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.5,
        )
        logger.info("MediaPipe Hands loaded successfully")
    except Exception as exc:
        logger.warning("MediaPipe unavailable (%s). Using landmark fallback.", exc)
        _mediapipe_hands = False
    return _mediapipe_hands


class SignDetectionService:
    """Detects sign language gestures from hand landmarks."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._gesture_buffer: list[str] = []
        self._buffer_size = 5

    def extract_landmarks_from_frame(self, frame_bytes: bytes) -> list[float] | None:
        """Extract 21 hand landmarks from a JPEG/PNG frame."""
        hands = _load_mediapipe()
        if hands is False:
            return self._mock_landmarks()

        try:
            import cv2

            nparr = np.frombuffer(frame_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                return None

            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)

            if not results.multi_hand_landmarks:
                return None

            landmarks = []
            for hand_landmarks in results.multi_hand_landmarks:
                for lm in hand_landmarks.landmark:
                    landmarks.extend([lm.x, lm.y, lm.z])
            return landmarks
        except Exception as exc:
            logger.error("Landmark extraction failed: %s", exc)
            return None

    def classify_gesture(self, landmarks: list[float]) -> dict[str, Any]:
        """
        Classify gesture from flattened landmark array.
        Uses heuristic finger-state detection; replace with SLT/WLASL model in production.
        """
        if len(landmarks) < 63:
            return {"gesture": None, "confidence": 0.0, "text": ""}

        gesture, confidence = self._heuristic_classify(landmarks)

        if gesture:
            self._gesture_buffer.append(gesture)
            if len(self._gesture_buffer) > self._buffer_size:
                self._gesture_buffer.pop(0)

        stable_gesture = self._get_stable_gesture()
        text = SIGN_VOCABULARY.get(stable_gesture, "") if stable_gesture else ""

        return {
            "gesture": stable_gesture,
            "confidence": confidence,
            "text": text,
            "landmarks_count": len(landmarks) // 3,
        }

    def _heuristic_classify(self, landmarks: list[float]) -> tuple[str | None, float]:
        """Heuristic finger extended detection for basic ASL gestures."""
        try:
            # Thumb tip (4) vs thumb IP (3)
            thumb_extended = landmarks[4 * 3 + 1] < landmarks[3 * 3 + 1]
            # Index tip (8) vs index PIP (6)
            index_extended = landmarks[8 * 3 + 1] < landmarks[6 * 3 + 1]
            # Middle tip (12) vs middle PIP (10)
            middle_extended = landmarks[12 * 3 + 1] < landmarks[10 * 3 + 1]
            # Ring tip (16) vs ring PIP (14)
            ring_extended = landmarks[16 * 3 + 1] < landmarks[14 * 3 + 1]
            # Pinky tip (20) vs pinky PIP (18)
            pinky_extended = landmarks[20 * 3 + 1] < landmarks[18 * 3 + 1]

            extended = [
                thumb_extended,
                index_extended,
                middle_extended,
                ring_extended,
                pinky_extended,
            ]
            count = sum(extended)

            if count == 5:
                return "hello", 0.75
            if count == 0:
                return "no", 0.7
            if index_extended and middle_extended and not ring_extended and not pinky_extended:
                return "yes", 0.72
            if index_extended and not middle_extended:
                return "help", 0.68
            if thumb_extended and index_extended and pinky_extended:
                return "love", 0.7
            if index_extended and middle_extended and ring_extended and pinky_extended and not thumb_extended:
                return "good", 0.71
            if index_extended:
                return "please", 0.65

            return None, 0.0
        except (IndexError, TypeError):
            return None, 0.0

    def _get_stable_gesture(self) -> str | None:
        if not self._gesture_buffer:
            return None
        from collections import Counter

        counts = Counter(self._gesture_buffer)
        gesture, freq = counts.most_common(1)[0]
        if freq >= 2:
            return gesture
        return None

    def _mock_landmarks(self) -> list[float]:
        """Return mock landmarks when MediaPipe is unavailable."""
        return [0.5] * 63

    def process_frame(self, frame_bytes: bytes) -> dict[str, Any]:
        """Full pipeline: frame -> landmarks -> gesture -> text."""
        landmarks = self.extract_landmarks_from_frame(frame_bytes)
        if landmarks is None:
            return {
                "gesture": None,
                "confidence": 0.0,
                "text": "",
                "landmarks": None,
            }
        result = self.classify_gesture(landmarks)
        result["landmarks"] = landmarks[:21] if landmarks else None
        return result

    def get_vocabulary(self) -> dict[str, str]:
        return SIGN_VOCABULARY.copy()

    def autocorrect_gesture(self, gesture: str, context: str) -> str:
        """Simple gesture autocorrection based on conversation context."""
        context_lower = context.lower()
        corrections = {
            "no": "yes" if "agree" in context_lower or "correct" in context_lower else "no",
            "help": "please" if "request" in context_lower else "help",
        }
        return corrections.get(gesture, gesture)


sign_detection_service = SignDetectionService()
