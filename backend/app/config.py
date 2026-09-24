from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    supabase_url: str
    supabase_publishable_key: str
    supabase_secret_key: str
    database_url: str
    gemini_api_key: str
    allowed_teacher_emails: str = ""
    frontend_origin: str = "http://localhost:3000"

    primary_model: str = "gemini-3.5-flash-lite"
    second_model: str = "gemini-3.1-flash-lite"
    embed_model: str = "gemini-embedding-2"
    embed_fallback_model: str = "gemini-embedding-001"
    embed_dims: int = 768
    # Free tier limits vary by account (roughly 15 to 30 RPM for Flash-Lite, 100 RPM and 30k TPM for
    # embeddings), so stay safely below them.
    generate_rpm: int = 12
    embed_rpm: int = 80
    embed_tpm: int = 24000

    storage_bucket: str = "deskwork"
    data_dir: Path = BACKEND_DIR / "data"

    @property
    def api_keys(self) -> list[str]:
        """GEMINI_API_KEY may hold several comma separated keys; the next one is used when one hits a daily limit."""
        return [k.strip() for k in self.gemini_api_key.split(",") if k.strip()]

    @property
    def allowed_emails(self) -> set[str]:
        return {e.strip().lower() for e in self.allowed_teacher_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
