/**
 * Daily NSE data ingestion — runs as a Render Cron Job at 18:30 IST (Mon-Fri).
 * Fetches: band hitters, volume gainers, most active equities, bhav copy.
 *
 * DB connection: uses DATABASE_URL env var (Render), falls back to individual
 * POSTGRES_* vars (local dev). SSL is enabled only when POSTGRES_SSL=true.
 */

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { Client } = require('pg');
const { parse } = require('csv-parse/sync');

// ── Date (IST timezone, or DATE_OVERRIDE env var for manual runs) ─────────────
// Targets the most recently COMPLETED trading day in IST. This is resilient to
// scheduler delays — a 20:00 IST cron that fires hours late (e.g. 03:00 IST
// next day) still picks the previous weekday, whose bhav copy IS published.
//   - Weekday and time >= 19:00 IST (NSE bhav publish): today
//   - Otherwise: walk back to the previous weekday
let TARGET_DATE, BHAV_DATE_STR;
if (process.env.DATE_OVERRIDE && /^\d{4}-\d{2}-\d{2}$/.test(process.env.DATE_OVERRIDE)) {
  TARGET_DATE   = process.env.DATE_OVERRIDE;
  const [yr, mo, dy] = TARGET_DATE.split('-');
  BHAV_DATE_STR = `${dy}${mo}${yr}`;
} else {
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const beforePublish = istNow.getUTCHours() < 19;
  const target = new Date(istNow);
  const isWeekend = d => d.getUTCDay() === 0 || d.getUTCDay() === 6;
  if (beforePublish || isWeekend(target)) {
    do { target.setUTCDate(target.getUTCDate() - 1); } while (isWeekend(target));
  }
  const yr = target.getUTCFullYear();
  const mo = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(target.getUTCDate()).padStart(2, '0');
  TARGET_DATE   = `${yr}-${mo}-${dy}`;
  BHAV_DATE_STR = `${dy}${mo}${yr}`;
}

// ── DB connection ─────────────────────────────────────────────────────────────
function makeDbClient() {
  const url  = process.env.DATABASE_URL;
  const ssl  = process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false;
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

// ── HTTP client ───────────────────────────────────────────────────────────────
const jar = new CookieJar();
const http = wrapper(axios.create({ jar, timeout: 45000, withCredentials: true, maxRedirects: 5 }));

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none', 'Sec-Fetch-User': '?1', 'Cache-Control': 'max-age=0',
};
const API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Referer': 'https://www.nseindia.com/',
  'Sec-Fetch-Dest': 'empty', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'same-origin',
};

const p   = v => { const n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) ? null : n; };
const bi  = v => { const n = parseInt(String(v || '').replace(/,/g, '')); return isNaN(n) ? null : n; };
const tr  = v => String(v || '').trim();
const delay = ms => new Promise(r => setTimeout(r, ms));

async function initSession() {
  console.log('Initializing NSE session...');
  await http.get('https://www.nseindia.com/', { headers: BROWSER_HEADERS });
  await delay(2500);
  await http.get('https://www.nseindia.com/market-data/live-equity-market', { headers: BROWSER_HEADERS });
  await delay(2000);
  await http.get('https://www.nseindia.com/market-data/upper-band-hitters', { headers: BROWSER_HEADERS });
  await delay(2000);
  await http.get('https://www.nseindia.com/market-data/most-active-equities', { headers: BROWSER_HEADERS });
  await delay(2000);
  console.log('Session ready\n');
}

async function fetchJson(url, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await delay(1500 + Math.random() * 1500);
      const res = await http.get(url, { headers: API_HEADERS });
      return res.data;
    } catch (e) {
      console.log(`  [${label}] attempt ${attempt}/3: ${e.message}`);
      if (attempt < 3) { await initSession(); await delay(3000); }
    }
  }
  return null;
}

async function fetchBhavCopy() {
  const url = `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${BHAV_DATE_STR}.csv`;
  console.log(`Fetching bhav copy: ${url}`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await delay(1500);
      const res = await http.get(url, {
        headers: { ...API_HEADERS, Accept: 'text/csv,application/csv,*/*' },
        responseType: 'text', timeout: 60000,
      });
      if (!res.data || !res.data.trim()) { console.log('  Empty bhav copy'); return []; }
      const rows = parse(res.data, { columns: true, skip_empty_lines: true, trim: true, relax_quotes: true });
      console.log(`Bhav copy: ${rows.length} records`);
      return rows;
    } catch (e) {
      console.log(`  [bhav copy] attempt ${attempt}/3: ${e.message}`);
      if (attempt < 3) await delay(3000);
    }
  }
  return [];
}

async function main() {
  console.log(`\n=== NSE Daily Ingestion — ${TARGET_DATE} ===\n`);

  const db = makeDbClient();
  await db.connect();
  console.log('DB connected\n');

  // NSE live APIs only serve the current trading session — skip them when
  // backfilling a past date so today's data isn't stored under the wrong date.
  const todayIST = (() => {
    const n = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,'0')}-${String(n.getUTCDate()).padStart(2,'0')}`;
  })();
  const isToday = TARGET_DATE === todayIST;

  let upperBand = [], lowerBand = [], volumeGainers = [], mostActive = [];

  if (isToday) {
    await initSession();

    console.log('Fetching band hitters...');
    const bandData = await fetchJson('https://www.nseindia.com/api/live-analysis-price-band-hitter', 'band hitters');
    if (bandData) {
      upperBand = bandData?.upper?.AllSec?.data ?? [];
      lowerBand = bandData?.lower?.AllSec?.data ?? [];
      console.log(`  Upper: ${upperBand.length}  Lower: ${lowerBand.length}\n`);
    }
    await delay(4000);

    console.log('Fetching volume gainers...');
    const vgRaw = await fetchJson('https://www.nseindia.com/api/live-analysis-volume-gainers', 'volume gainers');
    volumeGainers = Array.isArray(vgRaw?.data) ? vgRaw.data : Array.isArray(vgRaw) ? vgRaw : [];
    console.log(`  ${volumeGainers.length} records\n`);
    await delay(4000);

    console.log('Fetching most active equities...');
    const maeRaw = await fetchJson('https://www.nseindia.com/api/live-analysis-most-active-securities?index=volume', 'most active');
    mostActive = Array.isArray(maeRaw?.data) ? maeRaw.data : Array.isArray(maeRaw) ? maeRaw : [];
    console.log(`  ${mostActive.length} records\n`);
    await delay(4000);
  } else {
    console.log(`Backfill mode — skipping live APIs (NSE only serves today's data). Importing bhav copy only.\n`);
  }

  const bhavCopy = await fetchBhavCopy();
  console.log('');

  await db.query('BEGIN');

  // ── Helper: batch multi-row upsert ────────────────────────────────────────
  async function batchUpsert(table, cols, rows, conflictSql, rowFn) {
    const BATCH = 100;
    let count = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const valClauses = [], params = [];
      let idx = 1;
      for (const r of batch) {
        const vals = rowFn(r);
        valClauses.push(`(${vals.map(() => `$${idx++}`).join(',')})`);
        params.push(...vals);
      }
      try {
        await db.query(
          `INSERT INTO ${table} (${cols.join(',')}) VALUES ${valClauses.join(',')} ${conflictSql}`,
          params,
        );
        count += batch.length;
      } catch (e) {
        // Fall back to row-by-row on batch error
        for (const r of batch) {
          try {
            const vals = rowFn(r);
            const ph = vals.map((_, i2) => `$${i2 + 1}`).join(',');
            await db.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) ${conflictSql}`, vals);
            count++;
          } catch (_) {}
        }
      }
    }
    return count;
  }

  // ── Insert: Upper Band Hitters ─────────────────────────────────────────────
  const UBH_COLS = ['source_date','symbol','series','high_price','low_price','ltp','chng','pct_chng','volume','value','upper_band','week_52_high','week_52_low','raw_json'];
  const UBH_CONFLICT = `ON CONFLICT (symbol,source_date) DO UPDATE SET
    high_price=EXCLUDED.high_price, low_price=EXCLUDED.low_price,
    ltp=EXCLUDED.ltp, chng=EXCLUDED.chng, pct_chng=EXCLUDED.pct_chng,
    volume=EXCLUDED.volume, value=EXCLUDED.value, upper_band=EXCLUDED.upper_band,
    week_52_high=EXCLUDED.week_52_high, week_52_low=EXCLUDED.week_52_low, raw_json=EXCLUDED.raw_json`;
  const ubhCount = await batchUpsert('upper_band_hitters', UBH_COLS, upperBand, UBH_CONFLICT, r => {
    const vol = r.totalTradedVol != null ? Math.round(parseFloat(r.totalTradedVol) * 1e5) : null;
    const val = r.turnover != null ? parseFloat((parseFloat(r.turnover) * 1e7).toFixed(2)) : null;
    return [TARGET_DATE, tr(r.symbol||r.nsesymbol), tr(r.series||'EQ'),
            p(r.highPrice), p(r.lowPrice), p(r.ltp), p(r.change), p(r.pChange),
            vol, val, p(r.priceBand), p(r.yearHigh), p(r.yearLow), JSON.stringify(r)];
  });

  // ── Insert: Lower Band Hitters ─────────────────────────────────────────────
  const LBH_COLS = ['source_date','symbol','series','high_price','low_price','ltp','chng','pct_chng','volume','value','lower_band','week_52_high','week_52_low','raw_json'];
  const LBH_CONFLICT = `ON CONFLICT (symbol,source_date) DO UPDATE SET
    high_price=EXCLUDED.high_price, low_price=EXCLUDED.low_price,
    ltp=EXCLUDED.ltp, chng=EXCLUDED.chng, pct_chng=EXCLUDED.pct_chng,
    volume=EXCLUDED.volume, value=EXCLUDED.value, lower_band=EXCLUDED.lower_band,
    week_52_high=EXCLUDED.week_52_high, week_52_low=EXCLUDED.week_52_low, raw_json=EXCLUDED.raw_json`;
  const lbhCount = await batchUpsert('lower_band_hitters', LBH_COLS, lowerBand, LBH_CONFLICT, r => {
    const vol = r.totalTradedVol != null ? Math.round(parseFloat(r.totalTradedVol) * 1e5) : null;
    const val = r.turnover != null ? parseFloat((parseFloat(r.turnover) * 1e7).toFixed(2)) : null;
    return [TARGET_DATE, tr(r.symbol||r.nsesymbol), tr(r.series||'EQ'),
            p(r.highPrice), p(r.lowPrice), p(r.ltp), p(r.change), p(r.pChange),
            vol, val, p(r.priceBand), p(r.yearHigh), p(r.yearLow), JSON.stringify(r)];
  });

  // ── Insert: Volume Gainers ─────────────────────────────────────────────────
  const VG_COLS = ['source_date','symbol','ltp','pct_chng','volume','value','prev_volume','volume_ratio','raw_json'];
  const VG_CONFLICT = `ON CONFLICT (symbol,source_date) DO UPDATE SET
    ltp=EXCLUDED.ltp, pct_chng=EXCLUDED.pct_chng, volume=EXCLUDED.volume,
    value=EXCLUDED.value, prev_volume=EXCLUDED.prev_volume,
    volume_ratio=EXCLUDED.volume_ratio, raw_json=EXCLUDED.raw_json`;
  const vgCount = await batchUpsert('volume_gainers', VG_COLS, volumeGainers, VG_CONFLICT, r => {
    const val = r.turnover != null ? parseFloat((parseFloat(r.turnover) * 1e5).toFixed(2)) : null;
    return [TARGET_DATE, tr(r.symbol), p(r.ltp), p(r.pChange),
            bi(r.volume), val, bi(r.week1AvgVolume), p(r.week1volChange), JSON.stringify(r)];
  });

  // ── Insert: Most Active Equities ───────────────────────────────────────────
  const MAE_COLS = ['source_date','symbol','series','open_price','high_price','low_price','prev_close','ltp','chng','pct_chng','volume','value','trades','raw_json'];
  const MAE_CONFLICT = `ON CONFLICT (symbol,source_date) DO UPDATE SET
    open_price=EXCLUDED.open_price, high_price=EXCLUDED.high_price,
    low_price=EXCLUDED.low_price, prev_close=EXCLUDED.prev_close,
    ltp=EXCLUDED.ltp, chng=EXCLUDED.chng, pct_chng=EXCLUDED.pct_chng,
    volume=EXCLUDED.volume, value=EXCLUDED.value, trades=EXCLUDED.trades,
    raw_json=EXCLUDED.raw_json`;
  const maeCount = await batchUpsert('most_active_equities', MAE_COLS, mostActive, MAE_CONFLICT, r => [
    TARGET_DATE, tr(r.symbol), tr(r.series||'EQ'),
    p(r.open), p(r.dayHigh), p(r.dayLow), p(r.previousClose), p(r.lastPrice),
    p(r.change), p(r.pChange),
    bi(r.totalTradedVolume||r.quantityTraded), p(r.totalTradedValue),
    bi(r.numberOfTrades), JSON.stringify(r),
  ]);

  // ── Insert: Bhav Copy (batch 100 rows/query) ───────────────────────────────
  // CSV columns: OPEN_PRICE, HIGH_PRICE, LOW_PRICE, CLOSE_PRICE, LAST_PRICE,
  //              PREV_CLOSE, AVG_PRICE, TTL_TRD_QNTY, TURNOVER_LACS,
  //              NO_OF_TRADES, DELIV_QTY, DELIV_PER
  const BHAV_COLS = ['source_date','symbol','series','open_price','high_price','low_price','close_price','last_price','prev_close','avg_price','total_traded_qty','total_traded_value','total_trades','deliv_qty','deliv_per','isin','raw_json'];
  const bhavCount = await batchUpsert('bhav_copy', BHAV_COLS, bhavCopy, 'ON CONFLICT DO NOTHING', r => [
    TARGET_DATE, tr(r.SYMBOL||r.symbol), tr(r.SERIES||r.series),
    p(r.OPEN_PRICE), p(r.HIGH_PRICE), p(r.LOW_PRICE),
    p(r.CLOSE_PRICE), p(r.LAST_PRICE), p(r.PREV_CLOSE), p(r.AVG_PRICE),
    bi(r.TTL_TRD_QNTY), p(r.TURNOVER_LACS), bi(r.NO_OF_TRADES),
    bi(r.DELIV_QTY), p(r.DELIV_PER), tr(r.ISIN||r.isin||''), JSON.stringify(r),
  ]);

  await db.query('COMMIT');

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = ubhCount + lbhCount + vgCount + maeCount + bhavCount;
  console.log('=== RESULTS ===');
  console.log(`  Upper Band Hitters : ${ubhCount}`);
  console.log(`  Lower Band Hitters : ${lbhCount}`);
  console.log(`  Volume Gainers     : ${vgCount}`);
  console.log(`  Most Active        : ${maeCount}`);
  console.log(`  Bhav Copy          : ${bhavCount}`);
  console.log(`  TOTAL              : ${total}`);
  console.log(`  Date               : ${TARGET_DATE}`);

  if (total === 0) {
    console.error('\nNo records inserted — check NSE API availability or if today is a market holiday.');
    process.exit(1);
  }

  await db.end();
  console.log('\nIngestion complete.');
  process.exit(0);
}

main().catch(async e => {
  console.error('Fatal error:', e.message);
  try {
    const { Client } = require('pg');
    const db2 = makeDbClient();
    await db2.connect();
    await db2.query('ROLLBACK');
    await db2.end();
  } catch (_) {}
  process.exit(1);
});
