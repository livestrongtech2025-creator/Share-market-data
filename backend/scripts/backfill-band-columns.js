/**
 * Backfill upper_band/lower_band and value columns for existing rows where
 * the daily ingest left them NULL. Safe to re-run — only touches rows whose
 * target column is NULL and whose source column (ltp, volume) is populated.
 *
 *   upper_band : if NULL, fall back to ltp (the band price equals LTP because
 *                the stock hit the circuit)
 *   lower_band : same as above
 *   value      : if NULL, compute ltp * volume
 *
 * Also fills these columns from raw_json (close/vol/pctChange) when ltp/volume
 * themselves are NULL — covers rows ingested by the buggy ingest-today.js
 * before the field-name fix.
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

  // Hydrate core columns from raw_json. NSE band-hitters has shipped two
  // response shapes — handle both:
  //   Format A (legacy):  close (LTP), prev, vol, pctChange, open, high, low
  //   Format B (current): ltp, change, pChange, highPrice, lowPrice,
  //                        totalTradedVol (in LAKHS), turnover (in CRORES),
  //                        yearHigh, yearLow  — no open, no prev_close
  for (const table of ['upper_band_hitters', 'lower_band_hitters']) {
    const r = await db.query(`
      UPDATE ${table} SET
        ltp        = COALESCE(ltp,
                              (raw_json->>'ltp')::numeric,
                              (raw_json->>'close')::numeric),
        prev_close = COALESCE(prev_close,
                              (raw_json->>'prev')::numeric,
                              CASE WHEN raw_json->>'ltp' IS NOT NULL AND raw_json->>'change' IS NOT NULL
                                   THEN ROUND(((raw_json->>'ltp')::numeric - (raw_json->>'change')::numeric)::numeric, 2)
                              END),
        volume     = COALESCE(volume,
                              (raw_json->>'vol')::bigint,
                              ROUND((raw_json->>'totalTradedVol')::numeric * 1e5)::bigint),
        pct_chng   = COALESCE(pct_chng,
                              (raw_json->>'pctChange')::numeric,
                              (raw_json->>'pChange')::numeric),
        open_price = COALESCE(open_price, (raw_json->>'open')::numeric),
        high_price = COALESCE(high_price,
                              (raw_json->>'high')::numeric,
                              (raw_json->>'highPrice')::numeric),
        low_price  = COALESCE(low_price,
                              (raw_json->>'low')::numeric,
                              (raw_json->>'lowPrice')::numeric),
        week_52_high = COALESCE(week_52_high, (raw_json->>'yearHigh')::numeric),
        week_52_low  = COALESCE(week_52_low,  (raw_json->>'yearLow')::numeric)
      WHERE raw_json IS NOT NULL
        AND (ltp IS NULL OR prev_close IS NULL OR volume IS NULL OR pct_chng IS NULL
             OR open_price IS NULL OR high_price IS NULL OR low_price IS NULL
             OR week_52_high IS NULL OR week_52_low IS NULL)
    `);
    console.log(`${table}: hydrated ${r.rowCount} rows from raw_json`);
  }

  // Derive chng = ltp - prev_close where missing.
  for (const table of ['upper_band_hitters', 'lower_band_hitters']) {
    const r = await db.query(`
      UPDATE ${table}
      SET chng = ROUND((ltp - prev_close)::numeric, 2)
      WHERE chng IS NULL AND ltp IS NOT NULL AND prev_close IS NOT NULL
    `);
    console.log(`${table}: derived chng for ${r.rowCount} rows`);
  }

  // Fill value: prefer turnover from raw_json (in CRORES → ×1e7 rupees);
  // fall back to ltp × volume.
  for (const table of ['upper_band_hitters', 'lower_band_hitters']) {
    const r1 = await db.query(`
      UPDATE ${table}
      SET value = ROUND(((raw_json->>'turnover')::numeric * 1e7)::numeric, 2)
      WHERE value IS NULL AND raw_json->>'turnover' IS NOT NULL
    `);
    const r2 = await db.query(`
      UPDATE ${table}
      SET value = ROUND((ltp * volume)::numeric, 2)
      WHERE value IS NULL AND ltp IS NOT NULL AND volume IS NOT NULL
    `);
    console.log(`${table}: filled value for ${r1.rowCount + r2.rowCount} rows (turnover:${r1.rowCount} ltp×vol:${r2.rowCount})`);
  }

  // Fill upper_band / lower_band = ltp where missing (stock hit the band, so
  // LTP equals the band price by definition).
  const ub = await db.query(`
    UPDATE upper_band_hitters SET upper_band = ltp
    WHERE upper_band IS NULL AND ltp IS NOT NULL
  `);
  console.log(`upper_band_hitters: filled upper_band for ${ub.rowCount} rows`);

  const lb = await db.query(`
    UPDATE lower_band_hitters SET lower_band = ltp
    WHERE lower_band IS NULL AND ltp IS NOT NULL
  `);
  console.log(`lower_band_hitters: filled lower_band for ${lb.rowCount} rows`);

  // Report any rows still missing the columns (likely empty raw_json).
  for (const table of ['upper_band_hitters', 'lower_band_hitters']) {
    const bandCol = table === 'upper_band_hitters' ? 'upper_band' : 'lower_band';
    const r = await db.query(`
      SELECT COUNT(*)::int AS still_null
      FROM ${table}
      WHERE ${bandCol} IS NULL OR value IS NULL
    `);
    console.log(`${table}: ${r.rows[0].still_null} rows still missing ${bandCol} or value`);
  }

  await db.end();
  console.log('\nBackfill complete.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
