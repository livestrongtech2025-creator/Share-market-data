from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://nse_user:nse_secure_pass_2024@localhost:5432/nse_market"
    REDIS_URL: str = "redis://:redis_secure_pass_2024@localhost:6379"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AI_MODEL: str = "gpt-4o-mini"
    LOG_LEVEL: str = "INFO"
    MODELS_DIR: str = "./models"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
