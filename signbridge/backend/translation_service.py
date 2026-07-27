"""Translation service using Meta NLLB-200 with MarianMT fallback."""

from __future__ import annotations

import logging
from typing import Any

from config import get_settings

logger = logging.getLogger(__name__)

# NLLB language codes
LANGUAGE_CODES: dict[str, str] = {
    "english": "eng_Latn",
    "en": "eng_Latn",
    "tamil": "tam_Taml",
    "ta": "tam_Taml",
    "hindi": "hin_Deva",
    "hi": "hin_Deva",
    "malayalam": "mal_Mlym",
    "ml": "mal_Mlym",
    "telugu": "tel_Telu",
    "te": "tel_Telu",
    "kannada": "kan_Knda",
    "kn": "kan_Knda",
    "french": "fra_Latn",
    "fr": "fra_Latn",
    "spanish": "spa_Latn",
    "es": "spa_Latn",
    "german": "deu_Latn",
    "de": "deu_Latn",
    "japanese": "jpn_Jpan",
    "ja": "jpn_Jpan",
    "chinese": "zho_Hans",
    "zh": "zho_Hans",
    "arabic": "arb_Arab",
    "ar": "arb_Arab",
}

_translator = None
_translator_type: str | None = None


def _resolve_lang_code(language: str) -> str:
    key = language.lower().strip()
    return LANGUAGE_CODES.get(key, "eng_Latn")


def _load_translator():
    """Lazy-load translation model."""
    global _translator, _translator_type
    if _translator is not None:
        return _translator, _translator_type

    settings = get_settings()
    try:
        import importlib

        transformers = importlib.import_module("transformers")
        torch = importlib.import_module("torch")

        AutoModelForSeq2SeqLM = getattr(transformers, "AutoModelForSeq2SeqLM")
        AutoTokenizer = getattr(transformers, "AutoTokenizer")

        model_name = settings.translation_model
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        device = "cuda" if settings.use_gpu and torch.cuda.is_available() else "cpu"
        model = model.to(device)
        _translator = (tokenizer, model, device)
        _translator_type = "nllb"
        logger.info("Loaded NLLB translation model: %s", model_name)
    except Exception as exc:
        logger.warning("NLLB unavailable (%s). Using passthrough translation.", exc)
        _translator = False
        _translator_type = "passthrough"
    return _translator, _translator_type


class TranslationService:
    """Translates text between supported languages."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def get_supported_languages(self) -> list[dict[str, str]]:
        seen = set()
        languages = []
        display_names = {
            "eng_Latn": "English",
            "tam_Taml": "Tamil",
            "hin_Deva": "Hindi",
            "mal_Mlym": "Malayalam",
            "tel_Telu": "Telugu",
            "kan_Knda": "Kannada",
            "fra_Latn": "French",
            "spa_Latn": "Spanish",
            "deu_Latn": "German",
            "jpn_Jpan": "Japanese",
            "zho_Hans": "Chinese",
            "arb_Arab": "Arabic",
        }
        for code in LANGUAGE_CODES.values():
            if code not in seen:
                seen.add(code)
                languages.append({"code": code, "name": display_names.get(code, code)})
        return languages

    def translate(
        self,
        text: str,
        source_lang: str = "en",
        target_lang: str = "en",
    ) -> dict[str, Any]:
        if not text.strip():
            return {
                "original": text,
                "translated": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "model": "none",
            }

        src_code = _resolve_lang_code(source_lang)
        tgt_code = _resolve_lang_code(target_lang)

        if src_code == tgt_code:
            return {
                "original": text,
                "translated": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "model": "passthrough",
            }

        translator, translator_type = _load_translator()

        if translator is False or translator_type == "passthrough":
            return {
                "original": text,
                "translated": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "model": "passthrough",
            }

        try:
            tokenizer, model, device = translator
            tokenizer.src_lang = src_code
            inputs = tokenizer(text, return_tensors="pt").to(device)
            forced_bos = tokenizer.convert_tokens_to_ids(tgt_code)
            outputs = model.generate(
                **inputs,
                forced_bos_token_id=forced_bos,
                max_length=512,
            )
            translated = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
            return {
                "original": text,
                "translated": translated.strip(),
                "source_lang": source_lang,
                "target_lang": target_lang,
                "model": self.settings.translation_model,
            }
        except Exception as exc:
            logger.error("Translation failed: %s", exc)
            return {
                "original": text,
                "translated": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "model": "error",
            }

    def predict_next_words(self, context: str, count: int = 3) -> list[str]:
        """Simple sentence prediction based on common phrases."""
        predictions_map = {
            "how are": ["you?", "you doing?", "things?"],
            "thank": ["you", "you very much", "you so much"],
            "can you": ["help me?", "repeat that?", "wait?"],
            "i need": ["help", "water", "a break"],
            "good": ["morning", "afternoon", "night"],
        }
        lower = context.lower().strip()
        for prefix, suggestions in predictions_map.items():
            if lower.endswith(prefix):
                return suggestions[:count]
        return ["...", "please", "thank you"][:count]


translation_service = TranslationService()
