from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys

from app.routers import indicators, insights, chat, health
from app.core.config import settings
from app.core.database import engine, Base

# Configure loguru
logger.remove()
logger.add(sys.stdout, format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}", level="INFO")
logger.add("logs/ai-service-{time:YYYY-MM-DD}.log", rotation="1 day", retention="30 days", level="DEBUG")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Service starting up...")
    # Create tables on startup
    try:
        async with engine.begin() as conn:
            pass
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    yield
    logger.info("AI Service shutting down...")

app = FastAPI(
    title="NSE Market AI Service",
    description="AI analytics, technical indicators, and ML predictions for NSE market data",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(health.router, tags=["health"])
app.include_router(indicators.router, prefix="/api/indicators", tags=["indicators"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
