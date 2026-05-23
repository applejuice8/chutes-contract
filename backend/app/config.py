from functools import lru_cache
from os import getenv

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Chutes Contract Backend"
    api_prefix: str = "/api/v1"

    supabase_db_uri: str = Field(default_factory=lambda: getenv("SUPABASE_DB_URI", ""))

    chutes_api_key: str = Field(default_factory=lambda: getenv("CHUTES_API_KEY", ""))
    chutes_base_url: str = Field(
      default_factory=lambda: getenv("CHUTES_BASE_URL", "https://llm.chutes.ai/v1")
    )
    chutes_model: str = Field(default_factory=lambda: getenv("CHUTES_MODEL", ""))
    chutes_timeout_seconds: float = 90.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
