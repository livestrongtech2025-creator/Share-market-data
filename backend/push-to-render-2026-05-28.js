/**
 * Push 2026-05-28 data from local PostgreSQL → Render PostgreSQL.
 * Run from the backend directory: node push-to-render-2026-05-28.js
 */

const { Client } = require('pg');

const SOURCE_DATE = '2026-05-28';

const RENDER_URL = 'postgresql://sharemarket_likd_user:6ZAdZ0KtM3pbT4cr61jQ51Q5gTiiLnQG@dpg-d8aimsul51nc73dvbi1g-a.oregon-postgres.render.com/sharemarket_likd';

const local = new Client({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB       || 'nse_market',
  user:     process.env.POSTGRES_USER     || 'nse_user',
  password: process.env.POSTGRES_PASSWORD || 'nse_secure_pass_2024',
});

const render = new Client({
  connectionString: RENDER_URL,
  ssl: { rejectUnauthorized: false },
});

async function pushTable(tableName, columns, conflictCols) {
  const rows = await local.query(
    `SELECT ${columns.join(', ')} FROM ${tableName} WHERE source_date = $1`,
    [SOURCE_DATE],
  );

  if (rows.rowCount === 0) {
    console.log(`  ${tableName}: 0 rows in local DB — skipping`);
    return 0;
  }

  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${tableName} (${columns.join(', ')})
               VALUES (${placeholders})
               ON CONFLICT (${conflictCols}) DO NOTHING`;

  let inserted = 0;
  for (const row of rows.rows) {
    try {
      const values = columns.map(c => row[c]);
      const result = await render.query(sql, values);
      inserted += result.rowCount;
    } catch (e) {
      console.log(`    Skip row (${row.symbol}): ${e.message}`);
    }
  }
  console.log(`  ${tableName}: ${inserted} / ${rows.rowCount} rows pushed`);
  return inserted;
}

async function pushBhavCopy() {
  const cols = [
    'source_date','symbol','series','open_price','high_price','low_price',
    'close_price','last_price','prev_close','avg_price',
    'total_traded_qty','total_traded_value','total_trades',
    'deliv_qty','deliv_per','isin','raw_json',
  ];

  const rows = await local.query(
    `SELECT ${cols.join(', ')} FROM bhav_copy WHERE source_date = $1`,
    [SOURCE_DATE],
  );

  if (rows.rowCount === 0) {
    console.log(`  bhav_copy: 0 rows in local DB — skipping`);
    return 0;
  }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO bhav_copy (${cols.join(', ')})
               VALUES (${placeholders})
               ON CONFLICT DO NOTHING`;

  let inserted = 0;
  const BATCH = 200;
  for (let i = 0; i < rows.rows.length; i += BATCH) {
    const batch = rows.rows.slice(i, i + BATCH);
    for (const row of batch) {
      try {
        await render.query(sql, cols.map(c => row[c]));
        inserted++;
      } catch (e) { /* duplicate — skip */ }
    }
    if (i % 1000 === 0 && i > 0) process.stdout.write(`    ... ${inserted} inserted\r`);
  }
  console.log(`  bhav_copy: ${inserted} / ${rows.rowCount} rows pushed`);
  return inserted;
}

async function main() {
  console.log('Connecting to local DB...');
  await local.connect();
  console.log('Connecting to Render DB...');
  await render.connect();
  console.log('Both DBs connected\n');

  console.log(`Pushing data for ${SOURCE_DATE}...\n`);

  const ubh = await pushTable(
    'upper_band_hitters',
    ['source_date','symbol','series','open_price','high_price','low_price','prev_close','ltp','chng','pct_chng','volume','value','upper_band','week_52_high','week_52_low','raw_json'],
    'symbol, source_date',
  );

  const lbh = await pushTable(
    'lower_band_hitters',
    ['source_date','symbol','series','open_price','high_price','low_price','prev_close','ltp','chng','pct_chng','volume','value','lower_band','week_52_high','week_52_low','raw_json'],
    'symbol, source_date',
  );

  const vg = await pushTable(
    'volume_gainers',
    ['source_date','symbol','series','open_price','high_price','low_price','prev_close','ltp','chng','pct_chng','volume','value','prev_volume','volume_ratio','raw_json'],
    'symbol, source_date',
  );

  const mae = await pushTable(
    'most_active_equities',
    ['source_date','symbol','series','open_price','high_price','low_price','prev_close','ltp','chng','pct_chng','volume','value','trades','raw_json'],
    'symbol, source_date',
  );

  const bhav = await pushBhavCopy();

  console.log('\n=== SUMMARY ===');
  console.log(`  Upper Band Hitters : ${ubh}`);
  console.log(`  Lower Band Hitters : ${lbh}`);
  console.log(`  Volume Gainers     : ${vg}`);
  console.log(`  Most Active        : ${mae}`);
  console.log(`  Bhav Copy          : ${bhav}`);
  console.log(`  TOTAL              : ${ubh + lbh + vg + mae + bhav}`);
  console.log(`  Date               : ${SOURCE_DATE}`);

  await local.end();
  await render.end();
  console.log('\nDone!');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
