from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

async_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(async_url, pool_size=5, max_overflow=10, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
