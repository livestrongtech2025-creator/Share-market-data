/**
 * Ingest circuit hitters via NSE with full browser-like headers
 */
const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { Client } = require('pg');

const TARGET_DATE = '2026-05-22';

const jar = new CookieJar();
const http = wrapper(axios.create({
  jar, timeout: 45000, withCredentials: true,
  maxRedirects: 5,
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

function p(v) { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? null : n; }
function i2(v) { const n = parseInt(String(v||'').replace(/,/g,'')); return isNaN(n) ? null : n; }
const delay = ms => new Promise(r => setTimeout(r, ms));

async function initSession() {
  console.log('🌐 Initializing NSE session...');
  await http.get('https://www.nseindia.com/', { headers: BROWSER_HEADERS });
  await delay(2500);
  await http.get('https://www.nseindia.com/market-data/live-equity-market', { headers: BROWSER_HEADERS });
  await delay(2000);
  await http.get('https://www.nseindia.com/market-data/upper-band-hitters', { headers: BROWSER_HEADERS });
  await delay(2000);
  await http.get('https://www.nseindia.com/market-data/most-active-equities', { headers: BROWSER_HEADERS });
  await delay(2000);
  console.log('✅ Session initialized');
}

async function fetchApi(url, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await delay(1500 + Math.random() * 1500);
      const res = await http.get(url, { headers: API_HEADERS });
      const data = res.data?.data || res.data || [];
      const records = Array.isArray(data) ? data : [];
      console.log(`✅ ${label}: ${records.length} records`);
      return records;
    } catch (e) {
      console.log(`  Attempt ${attempt}/3 - ${label}: ${e.message}`);
      if (attempt < 3) {
        await initSession();
        await delay(3000);
      }
    }
  }
  return [];
}

async function main() {
  const db = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'nse_market',
    user: process.env.POSTGRES_USER || 'nse_user',
    password: process.env.POSTGRES_PASSWORD || 'nse_secure_pass_2024',
  });
  await db.connect();
  console.log('✅ DB connected\n');

  await initSession();
  console.log('\n📡 Fetching circuit data...\n');

  // NSE changed endpoints; band hitters now return a nested object: payload[band][view].data
  let upperBand = [], lowerBand = [];
  try {
    const bandRes = await http.get('https://www.nseindia.com/api/live-analysis-price-band-hitter', { headers: API_HEADERS });
    upperBand = bandRes.data?.upper?.AllSec?.data ?? [];
    lowerBand = bandRes.data?.lower?.AllSec?.data ?? [];
    console.log(`✅ Upper Band: ${upperBand.length} records`);
    console.log(`✅ Lower Band: ${lowerBand.length} records`);
  } catch (e) {
    console.log(`  Failed to fetch band hitters: ${e.message}`);
  }
  const mostActive = await fetchApi('https://www.nseindia.com/api/live-analysis-most-active-securities?index=volume', 'Most Active');

  console.log('\n💾 Inserting into DB...\n');

  let ubhCount = 0, lbhCount = 0, maeCount = 0;

  for (const r of upperBand) {
    try {
      await db.query(
        `INSERT INTO upper_band_hitters (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,upper_band,week_52_high,week_52_low,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE,(r.symbol||r.nsesymbol||'').trim(),(r.series||'EQ'),p(r.open),p(r.high),p(r.low),p(r.prevClose||r.prev_close),p(r.ltp||r.lastPrice),p(r.chng||r.change),p(r.pChange),i2(r.totalTradedVolume||r.volume),p(r.totalTradedValue),p(r.upperCP),p(r['52WH']),p(r['52WL']),JSON.stringify(r)]
      );
      ubhCount++;
    } catch {}
  }

  for (const r of lowerBand) {
    try {
      await db.query(
        `INSERT INTO lower_band_hitters (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,lower_band,week_52_high,week_52_low,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE,(r.symbol||r.nsesymbol||'').trim(),(r.series||'EQ'),p(r.open),p(r.high),p(r.low),p(r.prevClose||r.prev_close),p(r.ltp||r.lastPrice),p(r.chng||r.change),p(r.pChange),i2(r.totalTradedVolume||r.volume),p(r.totalTradedValue),p(r.lowerCP),p(r['52WH']),p(r['52WL']),JSON.stringify(r)]
      );
      lbhCount++;
    } catch {}
  }

  for (const r of mostActive) {
    try {
      await db.query(
        `INSERT INTO most_active_equities (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,trades,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE,(r.symbol||r.nsesymbol||'').trim(),(r.series||'EQ'),p(r.openPrice||r.open),p(r.highPrice||r.high),p(r.lowPrice||r.low),p(r.previousClose||r.prevClose),p(r.lastPrice||r.ltp),p(r.change||r.chng),p(r.pChange),i2(r.totalTradedVolume||r.volume),p(r.totalTradedValue),i2(r.numberOfTrades||r.trades),JSON.stringify(r)]
      );
      maeCount++;
    } catch {}
  }

  console.log(`Upper Band : ${ubhCount} records`);
  console.log(`Lower Band : ${lbhCount} records`);
  console.log(`Most Active: ${maeCount} records`);
  console.log(`Total      : ${ubhCount + lbhCount + maeCount} records`);

  await db.end();
  console.log('\n✅ Done!');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
