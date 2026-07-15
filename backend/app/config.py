from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str = ""
    groq_api_key: str = ""
    model_provider: str = "openai"  # "openai" or "groq"
    chroma_persist_dir: str = "./chroma_db"
    documents_dir: str = "./app/data/documents"
    api_key: str = ""  # simple API key for server-to-server auth (X-API-KEY)
    audit_log_path: str = "./logs/audit.log"
    enable_auth: bool = False
    # JWT / RBAC
    jwt_secret: str = "change-me-secret"
    jwt_algo: str = "HS256"
    jwt_exp_seconds: int = 3600
    admin_user: str = "admin"
    admin_password: str = "admin"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
