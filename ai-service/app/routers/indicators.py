from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from app.services.technical_indicators import TechnicalIndicatorService
from app.services.ml_prediction import MLPredictionService
from app.core.config import settings
import pandas as pd
import sqlalchemy
from sqlalchemy import create_engine, text

router = APIRouter()
indicator_service = TechnicalIndicatorService()
ml_service = MLPredictionService(settings.MODELS_DIR)

def get_engine():
    return create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))

class IndicatorRequest(BaseModel):
    symbol: str
    days: Optional[int] = 90

@router.get("/stock/{symbol}")
async def get_stock_indicators(symbol: str, days: int = Query(90, ge=10, le=365)):
    """Calculate all technical indicators for a stock."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT source_date, open_price, high_price, low_price, close_price,
                           total_traded_qty, total_traded_value
                    FROM bhav_copy
                    WHERE symbol = :symbol AND series = 'EQ'
                    ORDER BY source_date DESC
                    LIMIT :days
                """),
                {"symbol": symbol.upper(), "days": days}
            )
            rows = result.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")

        df = pd.DataFrame(rows, columns=["source_date", "open_price", "high_price", "low_price", "close_price", "total_traded_qty", "total_traded_value"])
        df = df.sort_values("source_date")

        indicators = indicator_service.calculate_all(df)
        prediction = ml_service.predict_direction(df)
        risk = ml_service.calculate_risk_scores(df)

        return {
            "symbol": symbol.upper(),
            "dataPoints": len(df),
            "lastDate": str(df["source_date"].iloc[-1]),
            "lastClose": float(df["close_price"].iloc[-1]),
            "indicators": indicators,
            "prediction": prediction,
            "risk": risk,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-breadth")
async def get_market_breadth(date: Optional[str] = None):
    """Calculate market breadth indicators."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            if not date:
                res = conn.execute(text("SELECT MAX(source_date) FROM bhav_copy"))
                date = str(res.scalar())

            result = conn.execute(
                text("""
                    SELECT symbol, close_price, prev_close, total_traded_qty
                    FROM bhav_copy WHERE source_date = :date AND series = 'EQ'
                """),
                {"date": date}
            )
            rows = result.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No data for date")

        advance = sum(1 for r in rows if float(r[1] or 0) > float(r[2] or 0))
        decline = sum(1 for r in rows if float(r[1] or 0) < float(r[2] or 0))
        unchanged = len(rows) - advance - decline
        total = len(rows)

        breadth_ratio = advance / (advance + decline) if (advance + decline) > 0 else 0.5
        fear_greed = round(breadth_ratio * 100, 2)

        sentiment = (
            "very_bullish" if fear_greed > 70 else
            "bullish" if fear_greed > 55 else
            "very_bearish" if fear_greed < 30 else
            "bearish" if fear_greed < 45 else "neutral"
        )

        return {
            "date": date,
            "advance": advance,
            "decline": decline,
            "unchanged": unchanged,
            "total": total,
            "breadth_ratio": round(breadth_ratio, 4),
            "fear_greed_score": fear_greed,
            "sentiment": sentiment,
            "advance_decline_ratio": round(advance / (decline + 1), 4),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-signals")
async def get_top_signals(date: Optional[str] = None, limit: int = Query(20, ge=1, le=100)):
    """Get top trading signals based on technical indicators."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            if not date:
                res = conn.execute(text("SELECT MAX(source_date) FROM bhav_copy"))
                date = str(res.scalar())

            result = conn.execute(
                text("""
                    SELECT symbol, close_price, prev_close, total_traded_qty, high_price, low_price
                    FROM bhav_copy WHERE source_date = :date AND series = 'EQ'
                    ORDER BY total_traded_qty DESC LIMIT 200
                """),
                {"date": date}
            )
            rows = result.fetchall()

        signals = []
        for row in rows:
            symbol, close, prev_close, volume = str(row[0]), float(row[1] or 0), float(row[2] or 0), float(row[3] or 0)
            if prev_close == 0:
                continue
            pct = (close - prev_close) / prev_close * 100
            signal_type = "bullish" if pct > 3 else "bearish" if pct < -3 else "neutral"
            signals.append({
                "symbol": symbol,
                "close": close,
                "pct_change": round(pct, 2),
                "volume": int(volume),
                "signal": signal_type,
                "strength": min(abs(pct) * 10, 100),
            })

        signals.sort(key=lambda x: abs(x["pct_change"]), reverse=True)
        return {"date": date, "signals": signals[:limit], "total": len(signals)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
