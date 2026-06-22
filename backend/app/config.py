from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str = ""
    groq_api_key: str = ""
    model_provider: str = "openai"  # "openai" or "groq"
    chroma_persist_dir: str = "./chroma_db"
    documents_dir: str = "./app/data/documents"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
