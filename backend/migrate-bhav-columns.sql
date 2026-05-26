-- Migration: Add avg_price, deliv_qty, deliv_per columns and backfill from raw_json
-- Run this once against your existing database BEFORE re-running the ingest scripts.
-- Safe to run multiple times (uses IF NOT EXISTS / does nothing if already done).

-- Step 1: Add new columns (idempotent)
ALTER TABLE bhav_copy ADD COLUMN IF NOT EXISTS avg_price   NUMERIC(15,2);
ALTER TABLE bhav_copy ADD COLUMN IF NOT EXISTS deliv_qty   BIGINT;
ALTER TABLE bhav_copy ADD COLUMN IF NOT EXISTS deliv_per   NUMERIC(8,2);

-- Step 2: Fix turnover — the CSV column is TURNOVER_LACS (value in Lakhs).
--         Backfill rows where total_traded_value is NULL or 0 from raw_json.
UPDATE bhav_copy
SET total_traded_value = NULLIF(TRIM(raw_json->>'TURNOVER_LACS'), '')::NUMERIC
WHERE (total_traded_value IS NULL OR total_traded_value = 0)
  AND raw_json->>'TURNOVER_LACS' IS NOT NULL
  AND TRIM(raw_json->>'TURNOVER_LACS') NOT IN ('', '-');

-- Step 3: Fix total_traded_qty from raw_json if missing
UPDATE bhav_copy
SET total_traded_qty = NULLIF(TRIM(raw_json->>'TTL_TRD_QNTY'), '')::BIGINT
WHERE (total_traded_qty IS NULL OR total_traded_qty = 0)
  AND raw_json->>'TTL_TRD_QNTY' IS NOT NULL
  AND TRIM(raw_json->>'TTL_TRD_QNTY') NOT IN ('', '-');

-- Step 4: Fix total_trades from raw_json if missing
UPDATE bhav_copy
SET total_trades = NULLIF(TRIM(raw_json->>'NO_OF_TRADES'), '')::BIGINT
WHERE (total_trades IS NULL OR total_trades = 0)
  AND raw_json->>'NO_OF_TRADES' IS NOT NULL
  AND TRIM(raw_json->>'NO_OF_TRADES') NOT IN ('', '-');

-- Step 5: Backfill avg_price
UPDATE bhav_copy
SET avg_price = NULLIF(TRIM(raw_json->>'AVG_PRICE'), '')::NUMERIC
WHERE avg_price IS NULL
  AND raw_json->>'AVG_PRICE' IS NOT NULL
  AND TRIM(raw_json->>'AVG_PRICE') NOT IN ('', '-');

-- Step 6: Backfill deliv_qty
UPDATE bhav_copy
SET deliv_qty = NULLIF(TRIM(raw_json->>'DELIV_QTY'), '')::BIGINT
WHERE deliv_qty IS NULL
  AND raw_json->>'DELIV_QTY' IS NOT NULL
  AND TRIM(raw_json->>'DELIV_QTY') NOT IN ('', '-');

-- Step 7: Backfill deliv_per
UPDATE bhav_copy
SET deliv_per = NULLIF(TRIM(raw_json->>'DELIV_PER'), '')::NUMERIC
WHERE deliv_per IS NULL
  AND raw_json->>'DELIV_PER' IS NOT NULL
  AND TRIM(raw_json->>'DELIV_PER') NOT IN ('', '-');

-- Verify: check a sample of rows after migration
SELECT symbol, series, source_date,
       total_traded_value, avg_price, deliv_qty, deliv_per
FROM bhav_copy
ORDER BY source_date DESC
LIMIT 10;
