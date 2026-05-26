from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.config import settings
from loguru import logger
import sqlalchemy
from sqlalchemy import create_engine, text

router = APIRouter()

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    response: str
    data: Optional[dict] = None

def get_engine():
    return create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))

def query_market_context(question: str) -> str:
    """Query database for relevant market context."""
    context_parts = []
    engine = get_engine()

    try:
        with engine.connect() as conn:
            # Get latest market summary
            res = conn.execute(text(
                "SELECT market_date, market_sentiment, generated_summary, fear_greed_score, breadth_advance, breadth_decline "
                "FROM ai_market_summary ORDER BY market_date DESC LIMIT 1"
            ))
            summary = res.fetchone()
            if summary:
                context_parts.append(
                    f"Latest Market Summary ({summary[0]}): Sentiment={summary[1]}, "
                    f"Fear/Greed={summary[3]}, Advances={summary[4]}, Declines={summary[5]}. "
                    f"Summary: {summary[2]}"
                )

            # Check if asking about specific stock
            words = question.upper().split()
            for word in words:
                if len(word) >= 3 and word.isalpha():
                    res = conn.execute(
                        text("SELECT symbol, close_price, prev_close, total_traded_qty FROM bhav_copy WHERE symbol = :s AND series = 'EQ' ORDER BY source_date DESC LIMIT 1"),
                        {"s": word}
                    )
                    stock = res.fetchone()
                    if stock:
                        close, prev = float(stock[1] or 0), float(stock[2] or 0)
                        pct = (close - prev) / prev * 100 if prev > 0 else 0
                        context_parts.append(
                            f"Stock {stock[0]}: Close=₹{close}, Change={pct:.2f}%, Volume={stock[3]}"
                        )
                        # Get AI insight if available
                        res2 = conn.execute(
                            text("SELECT ai_summary, trend, momentum_score FROM ai_stock_insights WHERE symbol = :s ORDER BY market_date DESC LIMIT 1"),
                            {"s": word}
                        )
                        insight = res2.fetchone()
                        if insight:
                            context_parts.append(f"AI Insight for {word}: {insight[0]}")

            # Top movers
            res = conn.execute(text(
                "SELECT symbol, ltp, pct_chng FROM upper_band_hitters ORDER BY created_at DESC LIMIT 5"
            ))
            upper = res.fetchall()
            if upper:
                context_parts.append(
                    "Recent Upper Circuit: " + ", ".join([f"{r[0]}({r[2]:.1f}%)" for r in upper if r[2]])
                )

    except Exception as e:
        logger.error(f"Context query error: {e}")

    return "\n".join(context_parts) if context_parts else "No recent market data available."

@router.post("/ask")
async def ask_ai(request: ChatMessage) -> ChatResponse:
    """AI chatbot endpoint for market queries."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Get market context
    context = query_market_context(request.message)

    # Try OpenAI
    if settings.OPENAI_API_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

            system_prompt = f"""You are an expert NSE India market analyst assistant.
Answer questions about Indian stock markets using the provided market data context.
Be concise, professional, and factual. Always add disclaimer for predictions.

Current Market Context:
{context}

Rules:
1. Only discuss Indian stock market topics
2. Use INR (₹) for prices
3. Add "Not financial advice" for buy/sell suggestions
4. Be specific about symbols (NSE format)"""

            messages = [{"role": "system", "content": system_prompt}]
            for h in (request.history or [])[-4:]:
                messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
            messages.append({"role": "user", "content": request.message})

            response = client.chat.completions.create(
                model=settings.AI_MODEL,
                messages=messages,
                max_tokens=400,
                temperature=0.7,
            )
            answer = response.choices[0].message.content
            return ChatResponse(response=answer, data={"context_used": True})
        except Exception as e:
            logger.error(f"OpenAI error: {e}")

    # Fallback: rule-based response
    msg_lower = request.message.lower()
    if "market" in msg_lower and ("trend" in msg_lower or "today" in msg_lower):
        answer = f"Based on current data:\n{context}\n\nThis is not financial advice."
    elif "breakout" in msg_lower:
        answer = f"Breakout stocks are those with strong price action and volume. Recent upper circuit hitters may indicate breakouts:\n{context}"
    elif "rsi" in msg_lower:
        answer = "RSI (Relative Strength Index): RSI > 70 = overbought, RSI < 30 = oversold. Check individual stock RSI using the technical indicators endpoint."
    else:
        answer = f"Here's the current market context:\n{context}\n\nFor detailed analysis, please configure your OpenAI API key."

    return ChatResponse(response=answer, data={"context_used": bool(context)})
