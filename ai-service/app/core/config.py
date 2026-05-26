from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://nse_user:nse_secure_pass_2024@localhost:5432/nse_market"

    # Redis — accept either a full URL or individual components
    REDIS_URL: Optional[str] = None
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None

    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AI_MODEL: str = "gpt-4o-mini"
    LOG_LEVEL: str = "INFO"
    MODELS_DIR: str = "./models"

    @model_validator(mode="after")
    def build_redis_url(self) -> "Settings":
        if not self.REDIS_URL:
            if self.REDIS_PASSWORD:
                self.REDIS_URL = f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}"
            else:
                self.REDIS_URL = f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"
        return self

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
