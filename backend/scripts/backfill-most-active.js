/**
 * Backfill most_active_equities columns from raw_json. Repairs rows ingested by
 * the buggy NestJS path (market-data.service.ts pre-fix), which:
 *   • mapped only bhav-copy snake_case fields, so dayHigh/dayLow/previousClose
 *     from the NSE live API landed as NULL in high_price/low_price/prev_close
 *   • multiplied totalTradedValue by 1e5 (Lakhs→Rupees) even though the live
 *     API already returns Rupees, inflating value 100,000×
 *
 * Live API shape (stored in raw_json):
 *   { symbol, series, open, dayHigh, dayLow, previousClose, lastPrice,
 *     change, pChange, totalTradedVolume, totalTradedValue, numberOfTrades, ... }
 *
 * Bhav-copy backfill rows are left alone (they have TURNOVER_LACS, not
 * totalTradedValue, in raw_json).
 *
 * Env: same DATABASE_URL / POSTGRES_* / POSTGRES_SSL as ingest-today.js.
 */
const { Client } = require('pg');

function makeDbClient() {
  const url = process.env.DATABASE_URL;
  const ssl = process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false;
  if (url) return new Client({ connectionString: url, ssl });
  return new Client({
    host:     process.env.POSTGRES_HOST     || 'localhost',
    port:     parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB       || 'nse_market',
    user:     process.env.POSTGRES_USER     || 'nse_user',
    password: process.env.POSTGRES_PASSWORD || 'nse_secure_pass_2024',
    ssl,
  });
}

async function main() {
  const db = makeDbClient();
  await db.connect();
  console.log('DB connected\n');

  // 1) Fill NULL columns from raw_json for rows sourced from the NSE live API.
  //    COALESCE keeps any already-correct values; only nulls get hydrated.
  const hydrate = await db.query(`
    UPDATE most_active_equities SET
      series      = COALESCE(NULLIF(series, ''), raw_json->>'series'),
      open_price  = COALESCE(open_price,
                             (raw_json->>'open')::numeric,
                             (raw_json->>'openPrice')::numeric),
      high_price  = COALESCE(high_price,
                             (raw_json->>'dayHigh')::numeric,
                             (raw_json->>'highPrice')::numeric,
                             (raw_json->>'high')::numeric),
      low_price   = COALESCE(low_price,
                             (raw_json->>'dayLow')::numeric,
                             (raw_json->>'lowPrice')::numeric,
                             (raw_json->>'low')::numeric),
      prev_close  = COALESCE(prev_close,
                             (raw_json->>'previousClose')::numeric,
                             (raw_json->>'prevClose')::numeric,
                             CASE WHEN raw_json->>'lastPrice' IS NOT NULL AND raw_json->>'change' IS NOT NULL
                                  THEN ROUND(((raw_json->>'lastPrice')::numeric - (raw_json->>'change')::numeric)::numeric, 2)
                             END),
      ltp         = COALESCE(ltp,
                             (raw_json->>'lastPrice')::numeric,
                             (raw_json->>'ltp')::numeric),
      chng        = COALESCE(chng, (raw_json->>'change')::numeric),
      pct_chng    = COALESCE(pct_chng,
                             (raw_json->>'pChange')::numeric,
                             (raw_json->>'perChange')::numeric),
      volume      = COALESCE(volume,
                             (raw_json->>'totalTradedVolume')::bigint,
                             (raw_json->>'quantityTraded')::bigint),
      trades      = COALESCE(trades,
                             (raw_json->>'numberOfTrades')::bigint,
                             (raw_json->>'totalTrades')::bigint)
    WHERE raw_json IS NOT NULL
      AND (series IS NULL OR series = ''
           OR open_price IS NULL OR high_price IS NULL OR low_price IS NULL
           OR prev_close IS NULL OR ltp IS NULL OR chng IS NULL OR pct_chng IS NULL
           OR volume IS NULL OR trades IS NULL)
  `);
  console.log(`most_active_equities: hydrated ${hydrate.rowCount} rows from raw_json`);

  // 2) Repair the inflated value column. The buggy path stored
  //    value = totalTradedValue × 1e5. For any row whose raw_json carries the
  //    live-API totalTradedValue, overwrite value with the raw rupee amount.
  const fixValue = await db.query(`
    UPDATE most_active_equities
    SET value = (raw_json->>'totalTradedValue')::numeric
    WHERE raw_json->>'totalTradedValue' IS NOT NULL
      AND (value IS NULL
           OR value <> (raw_json->>'totalTradedValue')::numeric)
  `);
  console.log(`most_active_equities: corrected value on ${fixValue.rowCount} rows`);

  // 3) Derive chng = ltp - prev_close where still missing.
  const chng = await db.query(`
    UPDATE most_active_equities
    SET chng = ROUND((ltp - prev_close)::numeric, 2)
    WHERE chng IS NULL AND ltp IS NOT NULL AND prev_close IS NOT NULL
  `);
  console.log(`most_active_equities: derived chng for ${chng.rowCount} rows`);

  // 4) Report leftovers (rows that raw_json could not repair).
  const leftover = await db.query(`
    SELECT COUNT(*)::int AS still_null
    FROM most_active_equities
    WHERE high_price IS NULL OR low_price IS NULL OR prev_close IS NULL
       OR ltp IS NULL OR value IS NULL
  `);
  console.log(`most_active_equities: ${leftover.rows[0].still_null} rows still missing core columns`);

  await db.end();
  console.log('\nBackfill complete.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
