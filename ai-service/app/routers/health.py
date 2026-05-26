from fastapi import APIRouter
from app.core.config import settings
import sqlalchemy
from sqlalchemy import create_engine, text

router = APIRouter()

@router.get("/health")
async def health_check():
    db_ok = False
    try:
        engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    return {
        "status": "ok" if db_ok else "degraded",
        "service": "NSE AI Service",
        "database": "connected" if db_ok else "error",
        "version": "1.0.0",
    }
