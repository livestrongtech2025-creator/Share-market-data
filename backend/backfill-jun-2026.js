/**
 * One-shot backfill for missing bhav copy dates in June 2026.
 * Resilient against Render free-tier socket drops:
 *   - Attaches a 'error' handler on the pg Client (otherwise Node kills the process)
 *   - Auto-reconnects on connection loss and resumes
 *   - ON CONFLICT DO NOTHING makes re-runs idempotent
 *
 * Run from backend/:  node backfill-jun-2026.js
 */

const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const DATES = ['2026-06-15', '2026-06-16'];

const RENDER_URL = 'postgresql://sharemarket_likd_user:6ZAdZ0KtM3pbT4cr61jQ51Q5gTiiLnQG@dpg-d8aimsul51nc73dvbi1g-a.oregon-postgres.render.com/sharemarket_likd';

function isoToBhav(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}${m}${y}`;
}

const jar = new CookieJar();
const http = wrapper(axios.create({
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
  console.log('Warming NSE session...');
  try {
    await http.get('https://www.nseindia.com', {
      headers: { Accept: 'text/html,application/xhtml+xml,*/*', 'Sec-Fetch-Mode': 'navigate' },
    });
    await delay(2000);
  } catch (e) { /* ignore */ }
  console.log('Session ready\n');
}

async function fetchCsv(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await http.get(url, {
        headers: {
          Accept: 'text/csv,application/csv,*/*',
          Referer: 'https://nsearchives.nseindia.com/',
        },
        responseType: 'text',
      });
      const csv = res.data;
      if (!csv || csv.trim().length < 50) return [];
      return parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      });
    } catch (e) {
      if (e.response && e.response.status === 404) return null;
      if (attempt === 3) return null;
      await delay(3000 * attempt);
    }
  }
  return null;
}

const num = v => {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
};
const int = v => {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = parseInt(String(v).replace(/,/g, '').trim(), 10);
  return isNaN(n) ? null : n;
};

// Holds the live pg Client. Replaced on reconnect.
let dbCurrent = null;

async function connect() {
  const c = new Client({
    connectionString: RENDER_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  });
  // CRITICAL: swallow async 'error' events so the process doesn't die on idle drops
  c.on('error', err => console.log(`  [pg error] ${err.message} — will reconnect on next query`));
  await c.connect();
  return c;
}

async function ensureDb() {
  if (!dbCurrent) { dbCurrent = await connect(); return; }
  try { await dbCurrent.query('SELECT 1'); }
  catch (e) {
    console.log(`  Reconnecting (probe failed: ${e.message})...`);
    try { await dbCurrent.end(); } catch (_) {}
    dbCurrent = await connect();
  }
}

async function queryWithRetry(sql, params, label) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    await ensureDb();
    try {
      return await dbCurrent.query(sql, params);
    } catch (e) {
      const transient = /Connection terminated|connection|ECONNRESET|read ECONN|socket hang up/i.test(e.message);
      if (!transient || attempt === 4) throw e;
      console.log(`  [${label}] transient error (${e.message}), reconnect+retry ${attempt}/3`);
      try { await dbCurrent.end(); } catch (_) {}
      dbCurrent = null;
      await delay(2000);
    }
  }
}

async function insertRows(isoDate, rows) {
  let count = 0, errors = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const res = await queryWithRetry(
        `INSERT INTO bhav_copy
           (source_date, symbol, series, open_price, high_price, low_price, close_price,
            last_price, prev_close, avg_price, total_traded_qty, total_traded_value,
            total_trades, deliv_qty, deliv_per, isin, raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (symbol, series, source_date) DO NOTHING`,
        [
          isoDate,
          String(r.SYMBOL || '').trim(),
          String(r.SERIES || '').trim(),
          num(r.OPEN_PRICE), num(r.HIGH_PRICE), num(r.LOW_PRICE),
          num(r.CLOSE_PRICE), num(r.LAST_PRICE), num(r.PREV_CLOSE), num(r.AVG_PRICE),
          int(r.TTL_TRD_QNTY), num(r.TURNOVER_LACS), int(r.NO_OF_TRADES),
          int(r.DELIV_QTY), num(r.DELIV_PER),
          String(r.ISIN || '').trim(),
          JSON.stringify(r),
        ],
        `row ${i}`,
      );
      count += res.rowCount;
    } catch (e) {
      errors++;
      if (errors <= 3) console.log(`    row ${i} (${r.SYMBOL}): ${e.message}`);
    }
    if ((i + 1) % 250 === 0) process.stdout.write(`\r    processed ${i + 1}/${rows.length}`);
  }
  process.stdout.write('\r');
  return { count, errors, total: rows.length };
}

async function main() {
  console.log('\nBackfill: bhav copy → Render Postgres');
  console.log('Dates:', DATES.join(', '), '\n');

  dbCurrent = await connect();
  console.log('DB connected');
  await initSession();

  const summary = [];
  let grandTotal = 0;

  for (const iso of DATES) {
    const url = `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${isoToBhav(iso)}.csv`;
    process.stdout.write(`[${iso}] downloading...`);

    const rows = await fetchCsv(url);
    if (rows === null) { console.log(`\r[${iso}] download failed / 404 (not published yet?)`); summary.push({ iso, status: 'unavailable' }); continue; }
    if (rows.length === 0) { console.log(`\r[${iso}] empty (holiday?)`); summary.push({ iso, status: 'empty' }); continue; }

    console.log(`\r[${iso}] ${rows.length} rows fetched, inserting...`);
    const { count, errors, total } = await insertRows(iso, rows);
    console.log(`[${iso}] new inserts: ${count}  (${total} processed${errors ? `, ${errors} errors` : ''})`);
    summary.push({ iso, status: 'ok', count, total, errors });
    grandTotal += count;
    await delay(1500);
  }

  try { await dbCurrent.end(); } catch (_) {}

  console.log('\n=== Summary ===');
  for (const s of summary) {
    if (s.status === 'ok') console.log(`  ${s.iso}: ${s.count} new (of ${s.total} fetched)`);
    else                   console.log(`  ${s.iso}: ${s.status}`);
  }
  console.log(`  TOTAL new rows: ${grandTotal}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
