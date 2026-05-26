/**
 * NSE Bulk Bhav Copy Ingestion Script
 * Downloads and inserts bhav copy data for all dates from Jan–May 2026
 * Usage: node ingest-bulk-bhav.js
 * Resume-safe: uses ON CONFLICT DO NOTHING, so re-running skips already-inserted dates
 */

const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const DB_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nse_market',
  user: process.env.POSTGRES_USER || 'nse_user',
  password: process.env.POSTGRES_PASSWORD || 'nse_secure_pass_2024',
};

// All trading dates Jan–May 2026 provided by user
const BHAV_URLS = [
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_01012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_02012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_05012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_06012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_07012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_08012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_09012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_12012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_13012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_14012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_15012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_16012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_19012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_20012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_21012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_22012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_23012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_26012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_27012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_28012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_29012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_30012026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_02022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_03022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_04022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_05022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_06022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_09022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_10022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_11022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_12022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_13022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_16022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_17022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_18022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_19022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_20022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_23022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_24022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_25022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_26022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_27022026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_02032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_03032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_04032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_05032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_06032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_09032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_10032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_11032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_12032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_13032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_16032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_17032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_18032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_19032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_20032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_23032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_24032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_25032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_26032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_27032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_30032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_31032026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_01042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_02042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_03042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_06042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_07042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_08042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_09042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_10042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_13042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_14042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_15042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_16042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_17042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_20042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_21042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_22042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_23042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_24042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_27042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_28042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_29042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_30042026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_01052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_04052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_05052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_06052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_07052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_08052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_11052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_12052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_13052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_14052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_15052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_18052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_19052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_20052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_21052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_22052026.csv',
  'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_25052026.csv',
];

// Parse ddMMyyyy from filename → YYYY-MM-DD
function urlToDate(url) {
  const match = url.match(/sec_bhavdata_full_(\d{2})(\d{2})(\d{4})\.csv/);
  if (!match) throw new Error(`Cannot parse date from URL: ${url}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

const jar = new CookieJar();
const httpClient = wrapper(axios.create({
  jar,
  timeout: 90000,
  withCredentials: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
  },
}));

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function initSession() {
  console.log('🌐 Initializing NSE session...');
  try {
    await httpClient.get('https://www.nseindia.com', {
      headers: { Accept: 'text/html,application/xhtml+xml,*/*', 'Sec-Fetch-Mode': 'navigate' },
    });
    await delay(2000);
    await httpClient.get('https://nsearchives.nseindia.com', {
      headers: { Accept: 'text/html,application/xhtml+xml,*/*', 'Sec-Fetch-Mode': 'navigate' },
    });
    await delay(1500);
    console.log('✅ Session initialized\n');
  } catch (e) {
    console.warn('⚠️  Session init warning (continuing):', e.message, '\n');
  }
}

async function fetchCsv(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await httpClient.get(url, {
        headers: {
          Accept: 'text/csv,application/csv,*/*',
          Referer: 'https://nsearchives.nseindia.com/',
        },
        responseType: 'text',
      });
      const csv = res.data;
      if (!csv || csv.trim().length < 50) return [];
      const records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      });
      return records;
    } catch (e) {
      if (attempt === retries) return null; // null = permanent failure
      await delay(3000 * attempt);
    }
  }
  return null;
}

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

async function getAlreadyImportedDates(db) {
  const res = await db.query(`SELECT DISTINCT source_date::text FROM bhav_copy ORDER BY source_date`);
  return new Set(res.rows.map(r => r.source_date));
}

async function insertBhavCopy(db, isoDate, records) {
  if (!records.length) return 0;
  let count = 0;
  const batchSize = 300;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    for (const r of batch) {
      try {
        await db.query(
          `INSERT INTO bhav_copy
             (source_date, symbol, series, open_price, high_price, low_price, close_price,
              last_price, prev_close, avg_price, total_traded_qty, total_traded_value,
              total_trades, deliv_qty, deliv_per, isin, raw_json)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (symbol, series, source_date) DO UPDATE SET
             open_price = EXCLUDED.open_price,
             high_price = EXCLUDED.high_price,
             low_price = EXCLUDED.low_price,
             close_price = EXCLUDED.close_price,
             last_price = EXCLUDED.last_price,
             prev_close = EXCLUDED.prev_close,
             avg_price = EXCLUDED.avg_price,
             total_traded_qty = EXCLUDED.total_traded_qty,
             total_traded_value = EXCLUDED.total_traded_value,
             total_trades = EXCLUDED.total_trades,
             deliv_qty = EXCLUDED.deliv_qty,
             deliv_per = EXCLUDED.deliv_per,
             raw_json = EXCLUDED.raw_json`,
          [
            isoDate,
            (r.SYMBOL || r.symbol || '').trim(),
            (r.SERIES || r.series || '').trim(),
            parseNum(r.OPEN_PRICE  || r.OPEN   || r.open),
            parseNum(r.HIGH_PRICE  || r.HIGH   || r.high),
            parseNum(r.LOW_PRICE   || r.LOW    || r.low),
            parseNum(r.CLOSE_PRICE || r.CLOSE  || r.close),
            parseNum(r.LAST_PRICE  || r.LAST   || r.last),
            parseNum(r.PREV_CLOSE  || r.PREVCLOSE || r.prev_close),
            parseNum(r.AVG_PRICE   || r.avg_price),
            parseInt2(r.TTL_TRD_QNTY  || r.TOTTRDQTY  || r.totaltradedqty),
            parseNum(r.TURNOVER_LACS || r.TURNOVER || r.TOTTRDVAL || r.totaltradedvalue),
            parseInt2(r.NO_OF_TRADES  || r.TOTALTRADES || r.totaltrades),
            parseInt2(r.DELIV_QTY  || r.deliv_qty),
            parseNum(r.DELIV_PER   || r.deliv_per),
            (r.ISIN || r.isin || '').trim(),
            JSON.stringify(r),
          ],
        );
        count++;
      } catch (_) { /* skip individual row errors */ }
    }
    process.stdout.write(`\r      Inserted ${Math.min(i + batchSize, records.length)}/${records.length}`);
  }
  process.stdout.write('\r');
  return count;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   NSE Bulk Bhav Copy Import — Jan–May 2026        ║');
  console.log(`║   Total dates: ${BHAV_URLS.length.toString().padEnd(33)}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  const db = new Client(DB_CONFIG);
  await db.connect();
  console.log('✅ Connected to PostgreSQL');

  const alreadyImported = await getAlreadyImportedDates(db);
  console.log(`📋 Dates already in DB: ${alreadyImported.size}`);

  const toProcess = BHAV_URLS.filter(url => {
    const d = urlToDate(url);
    return !alreadyImported.has(d);
  });

  if (toProcess.length === 0) {
    console.log('\n✅ All dates already imported. Nothing to do.\n');
    await db.end();
    return;
  }
  console.log(`📅 Dates to import: ${toProcess.length}\n`);

  await initSession();

  const results = { success: [], skipped: [], failed: [] };
  let totalRecords = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const url = toProcess[i];
    const isoDate = urlToDate(url);
    const progress = `[${String(i + 1).padStart(3)}/${toProcess.length}]`;

    process.stdout.write(`${progress} ${isoDate}  ⬇ Downloading...`);

    const records = await fetchCsv(url);

    if (records === null) {
      console.log(`\r${progress} ${isoDate}  ❌ Download failed (skipping)`);
      results.failed.push(isoDate);
      continue;
    }
    if (records.length === 0) {
      console.log(`\r${progress} ${isoDate}  ⚠  Empty response (holiday?)`);
      results.skipped.push(isoDate);
      continue;
    }

    process.stdout.write(`\r${progress} ${isoDate}  💾 Inserting ${records.length} records...`);
    const inserted = await insertBhavCopy(db, isoDate, records);
    console.log(`\r${progress} ${isoDate}  ✅ ${inserted.toLocaleString()} records inserted`);

    totalRecords += inserted;
    results.success.push({ date: isoDate, count: inserted });

    // Polite delay between requests to avoid rate-limiting
    if (i < toProcess.length - 1) await delay(1500 + Math.random() * 1000);
  }

  await db.end();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                  IMPORT SUMMARY                  ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  ✅ Successfully imported : ${String(results.success.length).padEnd(22)}║`);
  console.log(`║  ⚠  Skipped (empty/holiday): ${String(results.skipped.length).padEnd(20)}║`);
  console.log(`║  ❌ Failed                : ${String(results.failed.length).padEnd(22)}║`);
  console.log(`║  📊 Total records added   : ${String(totalRecords.toLocaleString()).padEnd(22)}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (results.failed.length > 0) {
    console.log('Failed dates:', results.failed.join(', '));
  }
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  process.exit(1);
});
