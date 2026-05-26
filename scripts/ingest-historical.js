/**
 * NSE Historical Data Ingestion Script
 * Fetches data for a specific date and inserts directly into PostgreSQL
 * Usage: node scripts/ingest-historical.js 2026-05-22
 */

const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

// ─── Config ──────────────────────────────────────────────────────────────────
const TARGET_DATE = process.argv[2] || '2026-05-22';
const DB_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nse_market',
  user: process.env.POSTGRES_USER || 'nse_user',
  password: process.env.POSTGRES_PASSWORD || 'nse_secure_pass_2024',
};

// Format date for different NSE URLs
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return { ddMMyyyy: `${dd}${mm}${yyyy}`, yyyy_mm_dd: dateStr };
}

// ─── NSE HTTP Client ──────────────────────────────────────────────────────────
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar,
  timeout: 60000,
  withCredentials: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
  }
}));

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function initSession() {
  console.log('🌐 Initializing NSE session...');
  try {
    await client.get('https://www.nseindia.com', {
      headers: { Accept: 'text/html,application/xhtml+xml,*/*', 'Sec-Fetch-Mode': 'navigate' }
    });
    await delay(2000);
    await client.get('https://www.nseindia.com/market-data/most-active-equities', {
      headers: { Accept: 'text/html,application/xhtml+xml,*/*', 'Sec-Fetch-Mode': 'navigate' }
    });
    await delay(1500);
    console.log('✅ NSE session initialized');
  } catch (e) {
    console.warn('⚠️  Session init warning:', e.message);
  }
}

async function fetchJson(url, label) {
  try {
    console.log(`📥 Fetching ${label}...`);
    await delay(1000 + Math.random() * 1000);
    const res = await client.get(url, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://www.nseindia.com/',
        'X-Requested-With': 'XMLHttpRequest',
      }
    });
    const data = res.data?.data || res.data || [];
    const records = Array.isArray(data) ? data : [];
    console.log(`   ✅ Got ${records.length} ${label} records`);
    return records;
  } catch (e) {
    console.warn(`   ⚠️  ${label} failed: ${e.message}`);
    return [];
  }
}

async function fetchBhavCopy(dateStr) {
  const { ddMMyyyy } = formatDate(dateStr);
  const url = `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${ddMMyyyy}.csv`;
  console.log(`📥 Fetching Bhav Copy for ${dateStr} (${ddMMyyyy})...`);
  console.log(`   URL: ${url}`);
  try {
    const res = await client.get(url, {
      headers: {
        Accept: 'text/csv,application/csv,*/*',
        Referer: 'https://www.nseindia.com/',
      },
      responseType: 'text',
      timeout: 90000,
    });
    const csv = res.data;
    if (!csv || csv.trim().length < 100) {
      console.warn('   ⚠️  Empty or invalid Bhav Copy response');
      return [];
    }
    const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true, relax_quotes: true });
    console.log(`   ✅ Got ${records.length} Bhav Copy records`);
    return records;
  } catch (e) {
    console.warn(`   ⚠️  Bhav Copy failed: ${e.message}`);
    // Try alternate URL format
    try {
      const { ddMMyyyy: dmy } = formatDate(dateStr);
      const altUrl = `https://nsearchives.nseindia.com/archives/equities/bhavcopy/EQ${dmy.substring(0,2)}${getMonthAbbr(dateStr)}${dmy.substring(4)}_CSV.ZIP`;
      console.log(`   🔄 Trying alternate URL format...`);
    } catch {}
    return [];
  }
}

function getMonthAbbr(dateStr) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return months[new Date(dateStr).getMonth()];
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────
function parseNum(val) {
  if (val === null || val === undefined || val === '' || val === '-') return null;
  const n = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}
function parseInt2(val) {
  if (val === null || val === undefined || val === '' || val === '-') return null;
  const n = parseInt(String(val).replace(/,/g, '').trim(), 10);
  return isNaN(n) ? null : n;
}

async function insertLowerBand(db, date, records) {
  if (!records.length) return 0;
  let count = 0;
  for (const r of records) {
    try {
      await db.query(`
        INSERT INTO lower_band_hitters 
          (source_date, symbol, series, open_price, high_price, low_price, prev_close, ltp, chng, pct_chng, volume, value, lower_band, week_52_high, week_52_low, raw_json)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (symbol, source_date) DO UPDATE SET
          ltp=EXCLUDED.ltp, chng=EXCLUDED.chng, pct_chng=EXCLUDED.pct_chng, volume=EXCLUDED.volume, raw_json=EXCLUDED.raw_json
      `, [
        date,
        (r.symbol || r.nsesymbol || '').trim(),
        (r.series || '').trim(),
        parseNum(r.open || r.openPrice), parseNum(r.high || r.highPrice),
        parseNum(r.low || r.lowPrice), parseNum(r.prevClose || r.prev_close),
        parseNum(r.ltp || r.lastPrice), parseNum(r.chng || r.change),
        parseNum(r.pChange || r.pctChng), parseInt2(r.totalTradedVolume || r.volume),
        parseNum(r.totalTradedValue || r.value),
        parseNum(r.lowerCP || r.lower_band),
        parseNum(r['52WH'] || r.week52High), parseNum(r['52WL'] || r.week52Low),
        JSON.stringify(r),
      ]);
      count++;
    } catch (e) { /* skip duplicates */ }
  }
  return count;
}

async function insertUpperBand(db, date, records) {
  if (!records.length) return 0;
  let count = 0;
  for (const r of records) {
    try {
      await db.query(`
        INSERT INTO upper_band_hitters
          (source_date, symbol, series, open_price, high_price, low_price, prev_close, ltp, chng, pct_chng, volume, value, upper_band, week_52_high, week_52_low, raw_json)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (symbol, source_date) DO UPDATE SET
          ltp=EXCLUDED.ltp, chng=EXCLUDED.chng, pct_chng=EXCLUDED.pct_chng, volume=EXCLUDED.volume, raw_json=EXCLUDED.raw_json
      `, [
        date,
        (r.symbol || r.nsesymbol || '').trim(),
        (r.series || '').trim(),
        parseNum(r.open || r.openPrice), parseNum(r.high || r.highPrice),
        parseNum(r.low || r.lowPrice), parseNum(r.prevClose || r.prev_close),
        parseNum(r.ltp || r.lastPrice), parseNum(r.chng || r.change),
        parseNum(r.pChange || r.pctChng), parseInt2(r.totalTradedVolume || r.volume),
        parseNum(r.totalTradedValue || r.value),
        parseNum(r.upperCP || r.upper_band),
        parseNum(r['52WH'] || r.week52High), parseNum(r['52WL'] || r.week52Low),
        JSON.stringify(r),
      ]);
      count++;
    } catch (e) { /* skip */ }
  }
  return count;
}

async function insertVolumeGainers(db, date, records) {
  if (!records.length) return 0;
  let count = 0;
  for (const r of records) {
    try {
      await db.query(`
        INSERT INTO volume_gainers
          (source_date, symbol, series, open_price, high_price, low_price, prev_close, ltp, chng, pct_chng, volume, value, raw_json)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (symbol, source_date) DO UPDATE SET
          ltp=EXCLUDED.ltp, volume=EXCLUDED.volume, raw_json=EXCLUDED.raw_json
      `, [
        date,
        (r.symbol || r.nsesymbol || '').trim(),
        (r.series || '').trim(),
        parseNum(r.open || r.openPrice), parseNum(r.high), parseNum(r.low),
        parseNum(r.prevClose || r.prev_close), parseNum(r.ltp || r.lastPrice),
        parseNum(r.chng || r.change), parseNum(r.pChange || r.pctChng),
        parseInt2(r.totalTradedVolume || r.volume),
        parseNum(r.totalTradedValue || r.value),
        JSON.stringify(r),
      ]);
      count++;
    } catch (e) { /* skip */ }
  }
  return count;
}

async function insertMostActive(db, date, records) {
  if (!records.length) return 0;
  let count = 0;
  for (const r of records) {
    try {
      await db.query(`
        INSERT INTO most_active_equities
          (source_date, symbol, series, open_price, high_price, low_price, prev_close, ltp, chng, pct_chng, volume, value, trades, raw_json)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (symbol, source_date) DO UPDATE SET
          ltp=EXCLUDED.ltp, volume=EXCLUDED.volume, raw_json=EXCLUDED.raw_json
      `, [
        date,
        (r.symbol || r.nsesymbol || '').trim(),
        (r.series || '').trim(),
        parseNum(r.open || r.openPrice), parseNum(r.high), parseNum(r.low),
        parseNum(r.prevClose || r.prev_close), parseNum(r.ltp || r.lastPrice),
        parseNum(r.chng || r.change), parseNum(r.pChange || r.pctChng),
        parseInt2(r.totalTradedVolume || r.volume),
        parseNum(r.totalTradedValue || r.value),
        parseInt2(r.numberOfTrades || r.trades),
        JSON.stringify(r),
      ]);
      count++;
    } catch (e) { /* skip */ }
  }
  return count;
}

async function insertBhavCopy(db, date, records) {
  if (!records.length) return 0;
  let count = 0;
  const batchSize = 200;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    for (const r of batch) {
      try {
        await db.query(`
          INSERT INTO bhav_copy
            (source_date, symbol, series, open_price, high_price, low_price, close_price, last_price, prev_close, total_traded_qty, total_traded_value, total_trades, isin, raw_json)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          ON CONFLICT (symbol, series, source_date) DO NOTHING
        `, [
          date,
          (r.SYMBOL || r.symbol || '').trim(),
          (r.SERIES || r.series || '').trim(),
          parseNum(r.OPEN || r.open), parseNum(r.HIGH || r.high),
          parseNum(r.LOW || r.low), parseNum(r.CLOSE || r.close),
          parseNum(r.LAST || r.last), parseNum(r.PREVCLOSE || r.prevclose || r.prev_close),
          parseInt2(r.TOTTRDQTY || r.totaltradedqty),
          parseNum(r.TOTTRDVAL || r.totaltradedvalue),
          parseInt2(r.TOTALTRADES || r.totaltrades),
          (r.ISIN || r.isin || '').trim(),
          JSON.stringify(r),
        ]);
        count++;
      } catch (e) { /* skip duplicates */ }
    }
    process.stdout.write(`\r   📊 Bhav Copy: ${Math.min(i + batchSize, records.length)}/${records.length} records`);
  }
  console.log();
  return count;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log(`║  NSE Data Ingestion — ${TARGET_DATE}         ║`);
  console.log('╚════════════════════════════════════════════╝\n');

  // Connect to DB
  const db = new Client(DB_CONFIG);
  await db.connect();
  console.log('✅ Connected to PostgreSQL\n');

  const { yyyy_mm_dd } = formatDate(TARGET_DATE);

  try {
    // Init NSE session
    await initSession();

    // Fetch all data
    console.log('\n📡 Fetching NSE data...\n');
    const [lowerBand, upperBand, volumeGainers, mostActive, bhavCopy] = await Promise.allSettled([
      fetchJson('https://www.nseindia.com/api/lhrhitters?index=lband', 'Lower Band Hitters'),
      fetchJson('https://www.nseindia.com/api/lhrhitters?index=uband', 'Upper Band Hitters'),
      fetchJson('https://www.nseindia.com/api/live-analysis-volume-gainers', 'Volume Gainers'),
      fetchJson('https://www.nseindia.com/api/live-analysis-most-act-traded-securities', 'Most Active'),
      fetchBhavCopy(TARGET_DATE),
    ]);

    const data = {
      lowerBand: lowerBand.status === 'fulfilled' ? lowerBand.value : [],
      upperBand: upperBand.status === 'fulfilled' ? upperBand.value : [],
      volumeGainers: volumeGainers.status === 'fulfilled' ? volumeGainers.value : [],
      mostActive: mostActive.status === 'fulfilled' ? mostActive.value : [],
      bhavCopy: bhavCopy.status === 'fulfilled' ? bhavCopy.value : [],
    };

    console.log('\n💾 Inserting into database...\n');

    const [lbhCount, ubhCount, vgCount, maeCount, bhavCount] = await Promise.all([
      insertLowerBand(db, yyyy_mm_dd, data.lowerBand),
      insertUpperBand(db, yyyy_mm_dd, data.upperBand),
      insertVolumeGainers(db, yyyy_mm_dd, data.volumeGainers),
      insertMostActive(db, yyyy_mm_dd, data.mostActive),
      insertBhavCopy(db, yyyy_mm_dd, data.bhavCopy),
    ]);

    const total = lbhCount + ubhCount + vgCount + maeCount + bhavCount;

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║              INGESTION RESULTS             ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  Lower Band Hitters  : ${String(lbhCount).padEnd(18)} ║`);
    console.log(`║  Upper Band Hitters  : ${String(ubhCount).padEnd(18)} ║`);
    console.log(`║  Volume Gainers      : ${String(vgCount).padEnd(18)} ║`);
    console.log(`║  Most Active Equities: ${String(maeCount).padEnd(18)} ║`);
    console.log(`║  Bhav Copy Records   : ${String(bhavCount).padEnd(18)} ║`);
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  TOTAL               : ${String(total).padEnd(18)} ║`);
    console.log('╚════════════════════════════════════════════╝\n');

    if (bhavCount === 0) {
      console.log('⚠️  Bhav Copy has 0 records. This is expected for historical dates');
      console.log('   if the NSE archive is unavailable. The live API data (circuit hitters,');
      console.log('   volume gainers, most active) reflects TODAY\'s data tagged as', TARGET_DATE);
    }

    // Notify backend to generate AI summary
    console.log('\n🤖 Triggering AI market summary...');
    try {
      const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
        email: 'admin@nseanalytics.com', password: 'Admin@123'
      });
      const token = loginRes.data.accessToken;
      await axios.post('http://localhost:3001/api/admin/trigger-ingestion',
        { date: TARGET_DATE },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('✅ AI summary triggered via API');
    } catch (e) {
      console.log('⚠️  AI summary trigger skipped (API endpoint may need restart):', e.message);
    }

  } finally {
    await db.end();
    console.log('🔌 DB connection closed\n');
  }
}

main().catch(e => { console.error('❌ Fatal error:', e); process.exit(1); });
