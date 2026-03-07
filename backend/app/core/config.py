from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Duolingo Factory API"
    app_env: str = "dev"
    debug: bool = True

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/duofactory"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
