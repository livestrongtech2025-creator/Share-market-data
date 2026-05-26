import numpy as np
import pandas as pd
from typing import Dict, Optional, List
from loguru import logger
import joblib
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

class MLPredictionService:
    """ML-based stock price direction prediction."""

    def __init__(self, models_dir: str = "./models"):
        self.models_dir = models_dir
        self.scaler = StandardScaler()
        self.model = None
        os.makedirs(models_dir, exist_ok=True)

    def build_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Build feature matrix from OHLCV data."""
        if len(df) < 20:
            return pd.DataFrame()

        df = df.copy()
        df["close"] = pd.to_numeric(df.get("close_price", df.get("close", 0)), errors="coerce")
        df["volume"] = pd.to_numeric(df.get("total_traded_qty", df.get("volume", 0)), errors="coerce")
        df["high"] = pd.to_numeric(df.get("high_price", df.get("high", df["close"])), errors="coerce")
        df["low"] = pd.to_numeric(df.get("low_price", df.get("low", df["close"])), errors="coerce")

        df.dropna(subset=["close"], inplace=True)

        # Price-based features
        df["returns"] = df["close"].pct_change()
        df["returns_2"] = df["close"].pct_change(2)
        df["returns_5"] = df["close"].pct_change(5)
        df["returns_10"] = df["close"].pct_change(10)

        # Moving averages
        df["sma_5"] = df["close"].rolling(5).mean()
        df["sma_10"] = df["close"].rolling(10).mean()
        df["sma_20"] = df["close"].rolling(20).mean()
        df["ema_12"] = df["close"].ewm(span=12).mean()
        df["ema_26"] = df["close"].ewm(span=26).mean()

        # MA ratios
        df["close_to_sma20"] = df["close"] / df["sma_20"]
        df["sma5_to_sma20"] = df["sma_5"] / df["sma_20"]

        # Volatility
        df["volatility_10"] = df["returns"].rolling(10).std()
        df["volatility_20"] = df["returns"].rolling(20).std()

        # Volume features
        df["volume_ma5"] = df["volume"].rolling(5).mean()
        df["volume_ratio"] = df["volume"] / df["volume_ma5"].replace(0, np.nan)

        # RSI
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        df["rsi"] = 100 - (100 / (1 + rs))

        # Bollinger Bands
        bb_mean = df["close"].rolling(20).mean()
        bb_std = df["close"].rolling(20).std()
        df["bb_upper"] = bb_mean + 2 * bb_std
        df["bb_lower"] = bb_mean - 2 * bb_std
        df["bb_pct"] = (df["close"] - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"]).replace(0, np.nan)

        # High-low range
        df["hl_range"] = (df["high"] - df["low"]) / df["close"].replace(0, np.nan)

        # MACD
        df["macd"] = df["ema_12"] - df["ema_26"]
        df["macd_signal"] = df["macd"].ewm(span=9).mean()
        df["macd_hist"] = df["macd"] - df["macd_signal"]

        features = [
            "returns", "returns_2", "returns_5", "returns_10",
            "close_to_sma20", "sma5_to_sma20", "volatility_10", "volatility_20",
            "volume_ratio", "rsi", "bb_pct", "hl_range", "macd", "macd_signal", "macd_hist",
        ]

        df_features = df[features].dropna()
        return df_features

    def train_simple_model(self, df: pd.DataFrame) -> Optional[Dict]:
        """Train a simple Random Forest model."""
        features_df = self.build_features(df)
        if len(features_df) < 30:
            return None

        # Target: next day direction
        target = (df["close"].pct_change().shift(-1) > 0).astype(int)
        target = target.loc[features_df.index].dropna()
        X = features_df.loc[target.index]

        if len(X) < 20:
            return None

        X_train, X_test, y_train, y_test = train_test_split(X, target, test_size=0.2, shuffle=False)
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42, n_jobs=-1)
        model.fit(X_train_scaled, y_train)
        accuracy = model.score(X_test_scaled, y_test)

        self.model = model
        logger.info(f"Model trained with accuracy: {accuracy:.3f}")
        return {"accuracy": accuracy, "samples": len(X)}

    def predict_direction(self, df: pd.DataFrame) -> Dict:
        """Predict next-day price direction."""
        features_df = self.build_features(df)
        if features_df.empty:
            return {"direction": "unknown", "probability": 0.5, "confidence": "low"}

        if self.model is None:
            # Fallback: use RSI and momentum
            rsi = features_df["rsi"].iloc[-1] if "rsi" in features_df else 50
            momentum = features_df["returns_5"].iloc[-1] if "returns_5" in features_df else 0
            if rsi < 30 or momentum < -0.05:
                direction = "down"
                prob = 0.6
            elif rsi > 70 or momentum > 0.05:
                direction = "up"
                prob = 0.6
            else:
                direction = "sideways"
                prob = 0.5
            return {"direction": direction, "probability": float(prob), "confidence": "low",
                    "disclaimer": "Predictions are probabilistic and not financial advice."}

        try:
            last_features = features_df.iloc[-1:].values
            last_scaled = self.scaler.transform(last_features)
            proba = self.model.predict_proba(last_scaled)[0]
            direction = "up" if proba[1] > 0.5 else "down"
            confidence = "high" if max(proba) > 0.7 else "medium" if max(proba) > 0.6 else "low"

            return {
                "direction": direction,
                "probability": float(max(proba)),
                "up_probability": float(proba[1]),
                "down_probability": float(proba[0]),
                "confidence": confidence,
                "disclaimer": "Predictions are probabilistic and not financial advice.",
            }
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return {"direction": "unknown", "probability": 0.5, "confidence": "low",
                    "disclaimer": "Predictions are probabilistic and not financial advice."}

    def calculate_risk_scores(self, df: pd.DataFrame) -> Dict:
        """Calculate comprehensive risk scores."""
        if df.empty or len(df) < 5:
            return {"volatility_risk": 50, "liquidity_risk": 50, "circuit_risk": 50, "overall_risk": 50}

        close = pd.to_numeric(df.get("close_price", pd.Series()), errors="coerce").dropna()
        volume = pd.to_numeric(df.get("total_traded_qty", pd.Series()), errors="coerce").dropna()

        # Volatility risk
        returns = close.pct_change().dropna()
        vol = returns.std() * np.sqrt(252) * 100 if len(returns) > 1 else 50
        volatility_risk = min(vol * 2, 100)

        # Liquidity risk (inverse of volume)
        avg_volume = volume.mean() if len(volume) > 0 else 0
        liquidity_risk = max(0, min(100, 100 - (np.log10(avg_volume + 1) / 7) * 100)) if avg_volume > 0 else 80

        # Circuit risk: high volatility + low volume = circuit risk
        circuit_risk = (volatility_risk * 0.6 + liquidity_risk * 0.4)

        overall_risk = (volatility_risk * 0.4 + liquidity_risk * 0.3 + circuit_risk * 0.3)

        return {
            "volatility_risk": round(float(volatility_risk), 2),
            "liquidity_risk": round(float(liquidity_risk), 2),
            "circuit_risk": round(float(circuit_risk), 2),
            "overall_risk": round(float(overall_risk), 2),
        }
