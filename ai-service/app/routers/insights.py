from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.core.config import settings
from app.services.technical_indicators import TechnicalIndicatorService
from app.services.ml_prediction import MLPredictionService
import pandas as pd
import sqlalchemy
from sqlalchemy import create_engine, text

router = APIRouter()
indicator_service = TechnicalIndicatorService()
ml_service = MLPredictionService(settings.MODELS_DIR)

def get_engine():
    return create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))

@router.get("/sector-analysis")
async def get_sector_analysis(date: Optional[str] = None):
    """Get sector-level analysis."""
    sector_map = {
        "Banking": ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "INDUSINDBK", "FEDERALBNK"],
        "IT": ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM", "LTIM", "MPHASIS", "COFORGE"],
        "Pharma": ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "BIOCON", "LUPIN"],
        "Auto": ["MARUTI", "TATAMOTORS", "M&M", "BAJAJ-AUTO", "HEROMOTOCO", "EICHERMOT"],
        "FMCG": ["HINDUNILVR", "ITC", "NESTLEIND", "BRITANNIA", "DABUR"],
        "Energy": ["RELIANCE", "ONGC", "BPCL", "IOC", "NTPC", "POWERGRID"],
        "Realty": ["DLF", "GODREJPROP", "OBEROIRLTY", "PRESTIGE"],
        "Metals": ["TATASTEEL", "JSWSTEEL", "HINDALCO", "VEDL", "COALINDIA"],
    }

    try:
        engine = get_engine()
        with engine.connect() as conn:
            if not date:
                res = conn.execute(text("SELECT MAX(source_date) FROM bhav_copy"))
                date = str(res.scalar())

            result = conn.execute(
                text("SELECT symbol, close_price, prev_close, total_traded_qty FROM bhav_copy WHERE source_date = :date AND series = 'EQ'"),
                {"date": date}
            )
            rows = {str(r[0]): r for r in result.fetchall()}

        analysis = []
        for sector, symbols in sector_map.items():
            sector_stocks = []
            for sym in symbols:
                if sym in rows:
                    row = rows[sym]
                    close, prev = float(row[1] or 0), float(row[2] or 0)
                    if prev > 0:
                        pct = (close - prev) / prev * 100
                        sector_stocks.append({"symbol": sym, "close": close, "pct_change": round(pct, 2)})
            if sector_stocks:
                avg_change = sum(s["pct_change"] for s in sector_stocks) / len(sector_stocks)
                sentiment = "bullish" if avg_change > 0.5 else "bearish" if avg_change < -0.5 else "neutral"
                analysis.append({
                    "sector": sector,
                    "avg_change": round(avg_change, 2),
                    "sentiment": sentiment,
                    "stocks": sector_stocks,
                    "stock_count": len(sector_stocks),
                })
        analysis.sort(key=lambda x: x["avg_change"], reverse=True)
        return {"date": date, "sectors": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/historical/{symbol}")
async def get_historical(symbol: str, days: int = Query(90, ge=1, le=365)):
    """Get historical price data for charting."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT source_date, open_price, high_price, low_price, close_price, total_traded_qty
                    FROM bhav_copy WHERE symbol = :symbol AND series = 'EQ'
                    ORDER BY source_date DESC LIMIT :days
                """),
                {"symbol": symbol.upper(), "days": days}
            )
            rows = result.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail=f"No historical data for {symbol}")

        data = [
            {
                "date": str(r[0]),
                "open": float(r[1] or 0),
                "high": float(r[2] or 0),
                "low": float(r[3] or 0),
                "close": float(r[4] or 0),
                "volume": int(r[5] or 0),
            }
            for r in reversed(rows)
        ]
        return {"symbol": symbol.upper(), "data": data, "count": len(data)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
