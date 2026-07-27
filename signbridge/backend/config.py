"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for SignBridge backend services."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "SignBridge API"
    app_version: str = "1.0.0"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Security
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    # AI Models
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    translation_model: str = "facebook/nllb-200-distilled-600M"
    sign_model_path: str = ""
    use_gpu: bool = False

    # Paths
    base_dir: Path = Path(__file__).resolve().parent
    logs_dir: Path = base_dir / "logs"
    models_dir: Path = base_dir / "models"

    # Room Settings
    max_room_participants: int = 10
    room_id_length: int = 8


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.logs_dir.mkdir(parents=True, exist_ok=True)
    settings.models_dir.mkdir(parents=True, exist_ok=True)
    return settings