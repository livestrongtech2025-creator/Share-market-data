/**
 * Standalone data ingestion for 2026-05-28.
 * Run from the backend directory: node ingest-2026-05-28.js
 *
 * Fetches:
 *   - Band hitters (upper + lower)   — NSE live API
 *   - Volume gainers                 — NSE live API
 *   - Most active equities           — NSE live API
 *   - Bhav copy (full EOD CSV)       — NSE archive (date-specific, always available)
 */

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { Client } = require('pg');
const { parse } = require('csv-parse/sync');

const TARGET_DATE = '2026-05-28';

const jar = new CookieJar();
const http = wrapper(axios.create({
  jar, timeout: 45000, withCredentials: true, maxRedirects: 5,
}));

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

const API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Referer': 'https://www.nseindia.com/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

const p   = v => { const n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) ? null : n; };
const bi  = v => { const n = parseInt(String(v || '').replace(/,/g, '')); return isNaN(n) ? null : n; };
const delay = ms => new Promise(r => setTimeout(r, ms));
const trim  = v => String(v || '').trim();

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
  console.log('Session initialized\n');
}

async function fetchJson(url, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await delay(1500 + Math.random() * 1500);
      const res = await http.get(url, { headers: API_HEADERS });
      return res.data;
    } catch (e) {
      console.log(`  Attempt ${attempt}/3 [${label}]: ${e.message}`);
      if (attempt < 3) { await initSession(); await delay(3000); }
    }
  }
  return null;
}

async function fetchBhavCopy() {
  // Date format for the archive filename: ddMMyyyy
  const url = 'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_28052026.csv';
  console.log(`Fetching bhav copy from: ${url}`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await delay(1500);
      const res = await http.get(url, {
        headers: { ...API_HEADERS, Accept: 'text/csv,application/csv,*/*' },
        responseType: 'text',
        timeout: 60000,
      });
      const csv = res.data;
      if (!csv || csv.trim().length === 0) { console.log('  Empty bhav copy response'); return []; }
      const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true, relax_quotes: true });
      console.log(`Fetched ${records.length} bhav copy records`);
      return records;
    } catch (e) {
      console.log(`  Attempt ${attempt}/3 [bhav copy]: ${e.message}`);
      if (attempt < 3) await delay(3000);
    }
  }
  return [];
}

async function main() {
  const db = new Client({
    host:     process.env.POSTGRES_HOST     || 'localhost',
    port:     parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB       || 'nse_market',
    user:     process.env.POSTGRES_USER     || 'nse_user',
    password: process.env.POSTGRES_PASSWORD || 'nse_secure_pass_2024',
  });

  await db.connect();
  console.log('DB connected\n');

  await initSession();

  // ── 1. Band Hitters ──────────────────────────────────────────────────────
  console.log('Fetching band hitters...');
  let upperBand = [], lowerBand = [];
  const bandData = await fetchJson('https://www.nseindia.com/api/live-analysis-price-band-hitter', 'band hitters');
  if (bandData) {
    upperBand = bandData?.upper?.AllSec?.data ?? [];
    lowerBand = bandData?.lower?.AllSec?.data ?? [];
    console.log(`Band hitters: ${upperBand.length} upper / ${lowerBand.length} lower\n`);
  } else {
    console.log('  Band hitters fetch failed\n');
  }
  await delay(4000);

  // ── 2. Volume Gainers ────────────────────────────────────────────────────
  console.log('Fetching volume gainers...');
  const vgData = await fetchJson('https://www.nseindia.com/api/live-analysis-volume-gainers', 'volume gainers');
  const volumeGainers = Array.isArray(vgData?.data) ? vgData.data
    : Array.isArray(vgData) ? vgData : [];
  console.log(`Volume gainers: ${volumeGainers.length} records\n`);
  await delay(4000);

  // ── 3. Most Active Equities ──────────────────────────────────────────────
  console.log('Fetching most active equities...');
  const maeData = await fetchJson('https://www.nseindia.com/api/live-analysis-most-active-securities?index=volume', 'most active');
  const mostActive = Array.isArray(maeData?.data) ? maeData.data
    : Array.isArray(maeData) ? maeData : [];
  console.log(`Most active equities: ${mostActive.length} records\n`);
  await delay(4000);

  // ── 4. Bhav Copy (archive — always available for past dates) ─────────────
  const bhavCopy = await fetchBhavCopy();
  console.log('');

  // Handles both NSE response shapes:
  //   Format A (legacy):  { open, high, low, close (=LTP), prev, vol, pctChange }
  //   Format B (current): { ltp, change, pChange, highPrice, lowPrice, yearHigh,
  //                          yearLow, priceBand (%), turnover (CR), totalTradedVol (LAKHS) }
  const bandValues = (r, bandField) => {
    const ltp = p(r.ltp ?? r.close ?? r.lastPrice);
    let chng = p(r.chng ?? r.change);
    let prevClose = p(r.prevClose ?? r.prev_close ?? r.prev);
    if (prevClose == null && ltp != null && chng != null) prevClose = +(ltp - chng).toFixed(2);
    if (chng == null && ltp != null && prevClose != null) chng = +(ltp - prevClose).toFixed(2);

    let vol = bi(r.vol ?? r.volume);
    if (vol == null && r.totalTradedVol != null) vol = Math.round(parseFloat(r.totalTradedVol) * 1e5);
    else if (vol == null && r.totalTradedVolume != null) vol = bi(r.totalTradedVolume);

    let value = p(r.value ?? r.totalTradedValue);
    if (value == null && r.turnover != null) value = +(parseFloat(r.turnover) * 1e7).toFixed(2);
    if (value == null && ltp != null && vol != null) value = +(ltp * vol).toFixed(2);

    const cp = bandField === 'upper' ? (r.upperCP ?? r.upper_cp) : (r.lowerCP ?? r.lower_cp);
    const band = p(cp) ?? ltp;
    return [TARGET_DATE, trim(r.symbol||r.nsesymbol), trim(r.series||'EQ'),
            p(r.openPrice ?? r.open), p(r.highPrice ?? r.high), p(r.lowPrice ?? r.low), prevClose,
            ltp, chng, p(r.pChange ?? r.pctChange), vol, value,
            band, p(r.yearHigh ?? r['52WH']), p(r.yearLow ?? r['52WL']), JSON.stringify(r)];
  };

  // ── INSERT: Upper Band Hitters ───────────────────────────────────────────
  console.log('Inserting upper band hitters...');
  let ubhCount = 0;
  for (const r of upperBand) {
    try {
      await db.query(
        `INSERT INTO upper_band_hitters
           (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,upper_band,week_52_high,week_52_low,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        bandValues(r, 'upper'),
      );
      ubhCount++;
    } catch (e) { console.log(`  UBH skip (${r.symbol}): ${e.message}`); }
  }
  console.log(`  Inserted: ${ubhCount}`);

  // ── INSERT: Lower Band Hitters ───────────────────────────────────────────
  console.log('Inserting lower band hitters...');
  let lbhCount = 0;
  for (const r of lowerBand) {
    try {
      await db.query(
        `INSERT INTO lower_band_hitters
           (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,lower_band,week_52_high,week_52_low,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        bandValues(r, 'lower'),
      );
      lbhCount++;
    } catch (e) { console.log(`  LBH skip (${r.symbol}): ${e.message}`); }
  }
  console.log(`  Inserted: ${lbhCount}`);

  // ── INSERT: Volume Gainers ───────────────────────────────────────────────
  console.log('Inserting volume gainers...');
  let vgCount = 0;
  for (const r of volumeGainers) {
    try {
      const turnoverLacs = p(r.turnover);
      const valueRupees = r.totalTradedValue != null
        ? p(r.totalTradedValue)
        : (turnoverLacs != null ? parseFloat((turnoverLacs * 1e5).toFixed(2)) : null);
      await db.query(
        `INSERT INTO volume_gainers
           (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,prev_volume,volume_ratio,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE, trim(r.symbol||r.nsesymbol), trim(r.series||'EQ'),
         p(r.open), p(r.high), p(r.low), p(r.prevClose||r.prev_close),
         p(r.ltp||r.lastPrice), p(r.chng||r.change), p(r.pChange),
         bi(r.totalTradedVolume||r.volume), valueRupees,
         bi(r.week1AvgVolume), p(r.week1volChange||r.volumeRatio),
         JSON.stringify(r)],
      );
      vgCount++;
    } catch (e) { console.log(`  VG skip (${r.symbol}): ${e.message}`); }
  }
  console.log(`  Inserted: ${vgCount}`);

  // ── INSERT: Most Active Equities ─────────────────────────────────────────
  console.log('Inserting most active equities...');
  let maeCount = 0;
  for (const r of mostActive) {
    try {
      const ttvLacs = p(r.turnover_lacs || r.totalTradedValue);
      const valueRupees = r.totalTradedValue != null
        ? p(r.totalTradedValue)
        : (ttvLacs != null ? parseFloat((ttvLacs * 1e5).toFixed(2)) : null);
      await db.query(
        `INSERT INTO most_active_equities
           (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,trades,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE, trim(r.symbol||r.nsesymbol), trim(r.series||'EQ'),
         p(r.openPrice||r.open), p(r.highPrice||r.high), p(r.lowPrice||r.low),
         p(r.previousClose||r.prevClose), p(r.lastPrice||r.ltp),
         p(r.change||r.chng), p(r.pChange),
         bi(r.totalTradedVolume||r.volume), valueRupees,
         bi(r.numberOfTrades||r.totalTrades), JSON.stringify(r)],
      );
      maeCount++;
    } catch (e) { console.log(`  MAE skip (${r.symbol}): ${e.message}`); }
  }
  console.log(`  Inserted: ${maeCount}`);

  // ── INSERT: Bhav Copy (batch) ─────────────────────────────────────────────
  console.log('Inserting bhav copy...');
  let bhavCount = 0;
  const BATCH = 500;
  for (let i = 0; i < bhavCopy.length; i += BATCH) {
    const batch = bhavCopy.slice(i, i + BATCH);
    for (const r of batch) {
      try {
        await db.query(
          `INSERT INTO bhav_copy
             (source_date,symbol,series,open_price,high_price,low_price,close_price,last_price,prev_close,avg_price,total_traded_qty,total_traded_value,total_trades,deliv_qty,deliv_per,isin,raw_json)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT DO NOTHING`,
          [TARGET_DATE,
           trim(r.SYMBOL||r.symbol), trim(r.SERIES||r.series),
           p(r.OPEN||r.open), p(r.HIGH||r.high), p(r.LOW||r.low),
           p(r.CLOSE||r.close), p(r.LAST||r.last), p(r.PREVCLOSE||r.prevclose),
           p(r.AVG_PRICE||r.avg_price),
           bi(r.TOTTRDQTY||r.ttl_trd_qnty), p(r.TOTTRDVAL||r.turnover_lacs),
           bi(r.TOTALTRADES||r.no_of_trades),
           bi(r.DELIV_QTY||r.deliv_qty), p(r.DELIV_PER||r.deliv_per),
           trim(r.ISIN||r.isin), JSON.stringify(r)],
        );
        bhavCount++;
      } catch (e) { /* skip duplicates silently */ }
    }
    if (i % 5000 === 0 && i > 0) console.log(`  ... ${bhavCount} inserted so far`);
  }
  console.log(`  Inserted: ${bhavCount}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = ubhCount + lbhCount + vgCount + maeCount + bhavCount;
  console.log('\n=== SUMMARY ===');
  console.log(`  Upper Band Hitters : ${ubhCount}`);
  console.log(`  Lower Band Hitters : ${lbhCount}`);
  console.log(`  Volume Gainers     : ${vgCount}`);
  console.log(`  Most Active        : ${maeCount}`);
  console.log(`  Bhav Copy          : ${bhavCount}`);
  console.log(`  TOTAL              : ${total}`);
  console.log(`  Date               : ${TARGET_DATE}`);

  await db.end();
  console.log('\nDone!');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
