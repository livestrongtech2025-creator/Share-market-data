import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from loguru import logger

class TechnicalIndicatorService:
    """Calculate technical indicators for stock data."""

    def calculate_rsi(self, prices: List[float], period: int = 14) -> Optional[float]:
        if len(prices) < period + 1:
            return None
        prices_series = pd.Series(prices)
        delta = prices_series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        val = rsi.iloc[-1]
        return float(val) if not pd.isna(val) else None

    def calculate_macd(self, prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, Optional[float]]:
        if len(prices) < slow + signal:
            return {"macd": None, "signal": None, "histogram": None}
        prices_series = pd.Series(prices)
        ema_fast = prices_series.ewm(span=fast, adjust=False).mean()
        ema_slow = prices_series.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return {
            "macd": float(macd_line.iloc[-1]) if not pd.isna(macd_line.iloc[-1]) else None,
            "signal": float(signal_line.iloc[-1]) if not pd.isna(signal_line.iloc[-1]) else None,
            "histogram": float(histogram.iloc[-1]) if not pd.isna(histogram.iloc[-1]) else None,
        }

    def calculate_ema(self, prices: List[float], period: int) -> Optional[float]:
        if len(prices) < period:
            return None
        series = pd.Series(prices)
        ema = series.ewm(span=period, adjust=False).mean()
        val = ema.iloc[-1]
        return float(val) if not pd.isna(val) else None

    def calculate_sma(self, prices: List[float], period: int) -> Optional[float]:
        if len(prices) < period:
            return None
        return float(np.mean(prices[-period:]))

    def calculate_bollinger_bands(self, prices: List[float], period: int = 20, std_dev: float = 2.0) -> Dict[str, Optional[float]]:
        if len(prices) < period:
            return {"upper": None, "middle": None, "lower": None, "width": None, "percent_b": None}
        series = pd.Series(prices)
        sma = series.rolling(window=period).mean()
        std = series.rolling(window=period).std()
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        middle_val = float(sma.iloc[-1])
        upper_val = float(upper.iloc[-1])
        lower_val = float(lower.iloc[-1])
        current = prices[-1]
        width = (upper_val - lower_val) / middle_val * 100 if middle_val != 0 else None
        percent_b = (current - lower_val) / (upper_val - lower_val) if (upper_val - lower_val) != 0 else None
        return {
            "upper": upper_val,
            "middle": middle_val,
            "lower": lower_val,
            "width": width,
            "percent_b": percent_b,
        }

    def calculate_atr(self, highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> Optional[float]:
        if len(highs) < period + 1:
            return None
        df = pd.DataFrame({"high": highs, "low": lows, "close": closes})
        df["prev_close"] = df["close"].shift(1)
        df["tr"] = df[["high", "low", "prev_close"]].apply(
            lambda r: max(r["high"] - r["low"], abs(r["high"] - r["prev_close"]), abs(r["low"] - r["prev_close"])) if pd.notna(r["prev_close"]) else r["high"] - r["low"],
            axis=1,
        )
        atr = df["tr"].rolling(window=period).mean()
        val = atr.iloc[-1]
        return float(val) if not pd.isna(val) else None

    def calculate_vwap(self, highs: List[float], lows: List[float], closes: List[float], volumes: List[float]) -> Optional[float]:
        if not highs or not volumes:
            return None
        typical_prices = [(h + l + c) / 3 for h, l, c in zip(highs, lows, closes)]
        tp_vol = sum(tp * v for tp, v in zip(typical_prices, volumes))
        total_vol = sum(volumes)
        return float(tp_vol / total_vol) if total_vol > 0 else None

    def calculate_stochastic_rsi(self, prices: List[float], rsi_period: int = 14, k_period: int = 3, d_period: int = 3) -> Dict[str, Optional[float]]:
        if len(prices) < rsi_period + k_period + d_period:
            return {"k": None, "d": None}
        series = pd.Series(prices)
        delta = series.diff()
        gain = delta.where(delta > 0, 0).rolling(window=rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi_series = 100 - (100 / (1 + rs))
        rsi_min = rsi_series.rolling(window=rsi_period).min()
        rsi_max = rsi_series.rolling(window=rsi_period).max()
        stoch_rsi = (rsi_series - rsi_min) / (rsi_max - rsi_min + 1e-10)
        k_line = stoch_rsi.rolling(window=k_period).mean() * 100
        d_line = k_line.rolling(window=d_period).mean()
        k_val = k_line.iloc[-1]
        d_val = d_line.iloc[-1]
        return {
            "k": float(k_val) if not pd.isna(k_val) else None,
            "d": float(d_val) if not pd.isna(d_val) else None,
        }

    def detect_patterns(self, df: pd.DataFrame) -> List[str]:
        """Detect chart patterns."""
        patterns = []
        if len(df) < 5:
            return patterns
        close = df["close_price"].astype(float)
        volume = df["total_traded_qty"].astype(float) if "total_traded_qty" in df else pd.Series([0] * len(df))
        pct_change = close.pct_change() * 100
        last = pct_change.iloc[-1] if len(pct_change) > 0 else 0

        # Gap up/down
        if len(close) >= 2:
            open_price = df["open_price"].astype(float).iloc[-1] if "open_price" in df else close.iloc[-1]
            prev_close = close.iloc[-2]
            gap = (open_price - prev_close) / prev_close * 100
            if gap > 2:
                patterns.append("gap_up")
            elif gap < -2:
                patterns.append("gap_down")

        # Volume spike
        if len(volume) >= 10:
            avg_vol = volume.iloc[-10:-1].mean()
            if avg_vol > 0 and volume.iloc[-1] > avg_vol * 3:
                patterns.append("volume_spike")

        # Strong momentum
        if last > 5:
            patterns.append("strong_bullish_momentum")
        elif last < -5:
            patterns.append("strong_bearish_momentum")

        # Breakout (price at 52-week high area)
        if len(close) >= 20:
            high_20 = close.rolling(20).max().iloc[-1]
            if close.iloc[-1] >= high_20 * 0.98:
                patterns.append("breakout")

        # Consolidation
        if len(close) >= 10:
            std_10 = close.iloc[-10:].std()
            mean_10 = close.iloc[-10:].mean()
            if mean_10 > 0 and (std_10 / mean_10) < 0.02:
                patterns.append("consolidation")

        return patterns

    def calculate_all(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate all indicators from a DataFrame with OHLCV data."""
        if df.empty or len(df) < 2:
            return {}

        closes = df["close_price"].astype(float).tolist() if "close_price" in df else []
        highs = df["high_price"].astype(float).tolist() if "high_price" in df else closes
        lows = df["low_price"].astype(float).tolist() if "low_price" in df else closes
        volumes = df["total_traded_qty"].astype(float).tolist() if "total_traded_qty" in df else []

        if not closes:
            return {}

        result = {
            "rsi": self.calculate_rsi(closes),
            "macd": self.calculate_macd(closes),
            "ema_10": self.calculate_ema(closes, 10),
            "ema_20": self.calculate_ema(closes, 20),
            "ema_50": self.calculate_ema(closes, 50),
            "sma_20": self.calculate_sma(closes, 20),
            "sma_50": self.calculate_sma(closes, 50),
            "sma_200": self.calculate_sma(closes, 200),
            "bollinger_bands": self.calculate_bollinger_bands(closes),
            "stochastic_rsi": self.calculate_stochastic_rsi(closes),
            "patterns": self.detect_patterns(df),
        }

        if highs and lows:
            result["atr"] = self.calculate_atr(highs, lows, closes)

        if volumes:
            result["vwap"] = self.calculate_vwap(highs, lows, closes, volumes)

        return result
