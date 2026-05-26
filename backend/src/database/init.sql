-- NSE Market Analytics Platform - Database Initialization
-- Version: 1.0.0

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'analyst')),
    is_active BOOLEAN DEFAULT true,
    telegram_chat_id VARCHAR(100),
    notification_email BOOLEAN DEFAULT true,
    notification_telegram BOOLEAN DEFAULT false,
    notification_slack BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOWER BAND HITTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS lower_band_hitters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_date DATE NOT NULL,
    symbol VARCHAR(50),
    series VARCHAR(10),
    open_price NUMERIC(15,2),
    high_price NUMERIC(15,2),
    low_price NUMERIC(15,2),
    prev_close NUMERIC(15,2),
    ltp NUMERIC(15,2),
    chng NUMERIC(15,2),
    pct_chng NUMERIC(10,4),
    volume BIGINT,
    value NUMERIC(20,2),
    week_52_high NUMERIC(15,2),
    week_52_low NUMERIC(15,2),
    lower_band NUMERIC(15,2),
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lbh_source_date ON lower_band_hitters(source_date DESC);
CREATE INDEX IF NOT EXISTS idx_lbh_symbol ON lower_band_hitters(symbol);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lbh_unique ON lower_band_hitters(symbol, source_date);

-- ============================================================
-- UPPER BAND HITTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS upper_band_hitters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_date DATE NOT NULL,
    symbol VARCHAR(50),
    series VARCHAR(10),
    open_price NUMERIC(15,2),
    high_price NUMERIC(15,2),
    low_price NUMERIC(15,2),
    prev_close NUMERIC(15,2),
    ltp NUMERIC(15,2),
    chng NUMERIC(15,2),
    pct_chng NUMERIC(10,4),
    volume BIGINT,
    value NUMERIC(20,2),
    week_52_high NUMERIC(15,2),
    week_52_low NUMERIC(15,2),
    upper_band NUMERIC(15,2),
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ubh_source_date ON upper_band_hitters(source_date DESC);
CREATE INDEX IF NOT EXISTS idx_ubh_symbol ON upper_band_hitters(symbol);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ubh_unique ON upper_band_hitters(symbol, source_date);

-- ============================================================
-- VOLUME GAINERS
-- ============================================================
CREATE TABLE IF NOT EXISTS volume_gainers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_date DATE NOT NULL,
    symbol VARCHAR(50),
    series VARCHAR(10),
    open_price NUMERIC(15,2),
    high_price NUMERIC(15,2),
    low_price NUMERIC(15,2),
    prev_close NUMERIC(15,2),
    ltp NUMERIC(15,2),
    chng NUMERIC(15,2),
    pct_chng NUMERIC(10,4),
    volume BIGINT,
    prev_volume BIGINT,
    volume_ratio NUMERIC(10,4),
    value NUMERIC(20,2),
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vg_source_date ON volume_gainers(source_date DESC);
CREATE INDEX IF NOT EXISTS idx_vg_symbol ON volume_gainers(symbol);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vg_unique ON volume_gainers(symbol, source_date);

-- ============================================================
-- MOST ACTIVE EQUITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS most_active_equities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_date DATE NOT NULL,
    symbol VARCHAR(50),
    series VARCHAR(10),
    open_price NUMERIC(15,2),
    high_price NUMERIC(15,2),
    low_price NUMERIC(15,2),
    prev_close NUMERIC(15,2),
    ltp NUMERIC(15,2),
    chng NUMERIC(15,2),
    pct_chng NUMERIC(10,4),
    volume BIGINT,
    value NUMERIC(20,2),
    trades BIGINT,
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mae_source_date ON most_active_equities(source_date DESC);
CREATE INDEX IF NOT EXISTS idx_mae_symbol ON most_active_equities(symbol);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mae_unique ON most_active_equities(symbol, source_date);

-- ============================================================
-- BHAV COPY
-- ============================================================
CREATE TABLE IF NOT EXISTS bhav_copy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_date DATE NOT NULL,
    symbol VARCHAR(50),
    series VARCHAR(10),
    open_price NUMERIC(15,2),
    high_price NUMERIC(15,2),
    low_price NUMERIC(15,2),
    close_price NUMERIC(15,2),
    last_price NUMERIC(15,2),
    prev_close NUMERIC(15,2),
    avg_price NUMERIC(15,2),
    total_traded_qty BIGINT,
    total_traded_value NUMERIC(20,2),
    total_trades BIGINT,
    deliv_qty BIGINT,
    deliv_per NUMERIC(8,2),
    isin VARCHAR(20),
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bc_source_date ON bhav_copy(source_date DESC);
CREATE INDEX IF NOT EXISTS idx_bc_symbol ON bhav_copy(symbol);
CREATE INDEX IF NOT EXISTS idx_bc_isin ON bhav_copy(isin);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bc_unique ON bhav_copy(symbol, series, source_date);

-- Full text search on symbol
CREATE INDEX IF NOT EXISTS idx_bc_symbol_trgm ON bhav_copy USING GIN (symbol gin_trgm_ops);

-- ============================================================
-- AI STOCK INSIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_stock_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(50) NOT NULL,
    market_date DATE NOT NULL,
    trend VARCHAR(20) CHECK (trend IN ('bullish', 'bearish', 'sideways', 'strong_bullish', 'strong_bearish')),
    momentum_score NUMERIC(5,2),
    sentiment_score NUMERIC(5,2),
    risk_score NUMERIC(5,2),
    volume_anomaly_score NUMERIC(5,2),
    relative_strength NUMERIC(5,2),
    volatility_score NUMERIC(5,2),
    breakout_probability NUMERIC(5,2),
    ai_confidence NUMERIC(5,2),
    ai_summary TEXT,
    prediction VARCHAR(20),
    predicted_direction VARCHAR(10),
    rsi NUMERIC(5,2),
    macd NUMERIC(10,4),
    macd_signal NUMERIC(10,4),
    ema_20 NUMERIC(15,2),
    ema_50 NUMERIC(15,2),
    sma_200 NUMERIC(15,2),
    bb_upper NUMERIC(15,2),
    bb_lower NUMERIC(15,2),
    bb_middle NUMERIC(15,2),
    atr NUMERIC(10,4),
    vwap NUMERIC(15,2),
    patterns JSONB DEFAULT '[]',
    sector VARCHAR(100),
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asi_symbol ON ai_stock_insights(symbol);
CREATE INDEX IF NOT EXISTS idx_asi_date ON ai_stock_insights(market_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asi_unique ON ai_stock_insights(symbol, market_date);

-- ============================================================
-- AI MARKET SUMMARY
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_market_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_date DATE UNIQUE NOT NULL,
    market_sentiment VARCHAR(20) CHECK (market_sentiment IN ('very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish')),
    fear_greed_score NUMERIC(5,2),
    sector_summary JSONB,
    top_ai_signals JSONB,
    generated_summary TEXT,
    breadth_advance INT,
    breadth_decline INT,
    breadth_unchanged INT,
    total_volume BIGINT,
    total_value NUMERIC(25,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ams_date ON ai_market_summary(market_date DESC);

-- ============================================================
-- AI ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(50),
    alert_type VARCHAR(50) NOT NULL,
    alert_message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    is_read BOOLEAN DEFAULT false,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aa_symbol ON ai_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_aa_triggered ON ai_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_aa_severity ON ai_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_aa_unread ON ai_alerts(is_read) WHERE is_read = false;

-- ============================================================
-- JOB LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('started', 'running', 'completed', 'failed', 'skipped')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms BIGINT,
    records_processed INT DEFAULT 0,
    records_inserted INT DEFAULT 0,
    records_failed INT DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jl_job_name ON job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_jl_started ON job_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_jl_status ON job_logs(status);

-- ============================================================
-- WATCHLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    symbols TEXT[] DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wl_user_id ON watchlists(user_id);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rt_token_hash ON refresh_tokens(token_hash);

-- ============================================================
-- SEED DEFAULT ADMIN
-- ============================================================
INSERT INTO users (email, password_hash, name, role)
VALUES (
    'admin@nseanalytics.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFBFuR6A4t8K3.K',  -- password: Admin@123
    'System Admin',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- UPDATED AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMIT;
