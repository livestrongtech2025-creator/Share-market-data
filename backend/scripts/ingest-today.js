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
let TARGET_DATE, BHAV_DATE_STR;
if (process.env.DATE_OVERRIDE && /^\d{4}-\d{2}-\d{2}$/.test(process.env.DATE_OVERRIDE)) {
  TARGET_DATE   = process.env.DATE_OVERRIDE;
  const [yr, mo, dy] = TARGET_DATE.split('-');
  BHAV_DATE_STR = `${dy}${mo}${yr}`;
} else {
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const yr     = istNow.getUTCFullYear();
  const mo     = String(istNow.getUTCMonth() + 1).padStart(2, '0');
  const dy     = String(istNow.getUTCDate()).padStart(2, '0');
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

  await initSession();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  console.log('Fetching band hitters...');
  let upperBand = [], lowerBand = [];
  const bandData = await fetchJson('https://www.nseindia.com/api/live-analysis-price-band-hitter', 'band hitters');
  if (bandData) {
    upperBand = bandData?.upper?.AllSec?.data ?? [];
    lowerBand = bandData?.lower?.AllSec?.data ?? [];
    console.log(`  Upper: ${upperBand.length}  Lower: ${lowerBand.length}\n`);
  }
  await delay(4000);

  console.log('Fetching volume gainers...');
  const vgRaw = await fetchJson('https://www.nseindia.com/api/live-analysis-volume-gainers', 'volume gainers');
  const volumeGainers = Array.isArray(vgRaw?.data) ? vgRaw.data : Array.isArray(vgRaw) ? vgRaw : [];
  console.log(`  ${volumeGainers.length} records\n`);
  await delay(4000);

  console.log('Fetching most active equities...');
  const maeRaw = await fetchJson('https://www.nseindia.com/api/live-analysis-most-active-securities?index=volume', 'most active');
  const mostActive = Array.isArray(maeRaw?.data) ? maeRaw.data : Array.isArray(maeRaw) ? maeRaw : [];
  console.log(`  ${mostActive.length} records\n`);
  await delay(4000);

  const bhavCopy = await fetchBhavCopy();
  console.log('');

  // ── Insert: Upper Band Hitters ─────────────────────────────────────────────
  let ubhCount = 0;
  for (const r of upperBand) {
    try {
      await db.query(
        `INSERT INTO upper_band_hitters
           (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,upper_band,week_52_high,week_52_low,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE, tr(r.symbol||r.nsesymbol), tr(r.series||'EQ'),
         p(r.open), p(r.high), p(r.low), p(r.prevClose||r.prev_close),
         p(r.ltp||r.lastPrice), p(r.chng||r.change), p(r.pChange),
         bi(r.totalTradedVolume||r.volume), p(r.totalTradedValue),
         p(r.upperCP), p(r['52WH']), p(r['52WL']), JSON.stringify(r)],
      );
      ubhCount++;
    } catch (e) { console.log(`  UBH skip (${r.symbol}): ${e.message}`); }
  }

  // ── Insert: Lower Band Hitters ─────────────────────────────────────────────
  let lbhCount = 0;
  for (const r of lowerBand) {
    try {
      await db.query(
        `INSERT INTO lower_band_hitters
           (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,lower_band,week_52_high,week_52_low,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE, tr(r.symbol||r.nsesymbol), tr(r.series||'EQ'),
         p(r.open), p(r.high), p(r.low), p(r.prevClose||r.prev_close),
         p(r.ltp||r.lastPrice), p(r.chng||r.change), p(r.pChange),
         bi(r.totalTradedVolume||r.volume), p(r.totalTradedValue),
         p(r.lowerCP), p(r['52WH']), p(r['52WL']), JSON.stringify(r)],
      );
      lbhCount++;
    } catch (e) { console.log(`  LBH skip (${r.symbol}): ${e.message}`); }
  }

  // ── Insert: Volume Gainers ─────────────────────────────────────────────────
  let vgCount = 0;
  for (const r of volumeGainers) {
    try {
      const lacs = p(r.turnover);
      const val  = r.totalTradedValue != null ? p(r.totalTradedValue)
                 : lacs != null ? parseFloat((lacs * 1e5).toFixed(2)) : null;
      await db.query(
        `INSERT INTO volume_gainers
           (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,prev_volume,volume_ratio,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE, tr(r.symbol||r.nsesymbol), tr(r.series||'EQ'),
         p(r.open), p(r.high), p(r.low), p(r.prevClose||r.prev_close),
         p(r.ltp||r.lastPrice), p(r.chng||r.change), p(r.pChange),
         bi(r.totalTradedVolume||r.volume), val,
         bi(r.week1AvgVolume), p(r.week1volChange||r.volumeRatio), JSON.stringify(r)],
      );
      vgCount++;
    } catch (e) { console.log(`  VG skip (${r.symbol}): ${e.message}`); }
  }

  // ── Insert: Most Active Equities ───────────────────────────────────────────
  let maeCount = 0;
  for (const r of mostActive) {
    try {
      const lacs = p(r.turnover_lacs || r.totalTradedValue);
      const val  = r.totalTradedValue != null ? p(r.totalTradedValue)
                 : lacs != null ? parseFloat((lacs * 1e5).toFixed(2)) : null;
      await db.query(
        `INSERT INTO most_active_equities
           (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,trades,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE, tr(r.symbol||r.nsesymbol), tr(r.series||'EQ'),
         p(r.openPrice||r.open), p(r.highPrice||r.high), p(r.lowPrice||r.low),
         p(r.previousClose||r.prevClose), p(r.lastPrice||r.ltp),
         p(r.change||r.chng), p(r.pChange),
         bi(r.totalTradedVolume||r.volume), val,
         bi(r.numberOfTrades||r.totalTrades), JSON.stringify(r)],
      );
      maeCount++;
    } catch (e) { console.log(`  MAE skip (${r.symbol}): ${e.message}`); }
  }

  // ── Insert: Bhav Copy ──────────────────────────────────────────────────────
  let bhavCount = 0;
  for (const r of bhavCopy) {
    try {
      await db.query(
        `INSERT INTO bhav_copy
           (source_date,symbol,series,open_price,high_price,low_price,close_price,last_price,prev_close,avg_price,total_traded_qty,total_traded_value,total_trades,deliv_qty,deliv_per,isin,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT DO NOTHING`,
        [TARGET_DATE, tr(r.SYMBOL||r.symbol), tr(r.SERIES||r.series),
         p(r.OPEN||r.open), p(r.HIGH||r.high), p(r.LOW||r.low),
         p(r.CLOSE||r.close), p(r.LAST||r.last), p(r.PREVCLOSE||r.prevclose),
         p(r.AVG_PRICE||r.avg_price),
         bi(r.TOTTRDQTY||r.ttl_trd_qnty), p(r.TOTTRDVAL||r.turnover_lacs),
         bi(r.TOTALTRADES||r.no_of_trades),
         bi(r.DELIV_QTY||r.deliv_qty), p(r.DELIV_PER||r.deliv_per),
         tr(r.ISIN||r.isin), JSON.stringify(r)],
      );
      bhavCount++;
    } catch (e) { /* duplicate — skip */ }
  }

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

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
