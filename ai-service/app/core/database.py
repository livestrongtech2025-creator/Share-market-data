from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

async_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
connect_args = {}
if "sslmode=require" in async_url:
    async_url = async_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
    connect_args["ssl"] = True
engine = create_async_engine(async_url, pool_size=5, max_overflow=10, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
