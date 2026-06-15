/** Quick read-only check: bhav_copy row counts on Render for recent dates. */
const { Client } = require('pg');

const RENDER_URL = 'postgresql://sharemarket_likd_user:6ZAdZ0KtM3pbT4cr61jQ51Q5gTiiLnQG@dpg-d8aimsul51nc73dvbi1g-a.oregon-postgres.render.com/sharemarket_likd';

(async () => {
  const db = new Client({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();

  const tables = ['bhav_copy', 'upper_band_hitters', 'lower_band_hitters', 'volume_gainers', 'most_active_equities'];
  console.log('Recent row counts (>= 2026-06-04):\n');
  for (const t of tables) {
    const res = await db.query(`SELECT source_date::text AS d, COUNT(*) AS n FROM ${t} WHERE source_date >= '2026-06-04' GROUP BY source_date ORDER BY source_date`);
    console.log(`-- ${t}`);
    for (const r of res.rows) console.log(`     ${r.d}  ${r.n}`);
    if (res.rows.length === 0) console.log('     (none)');
    console.log('');
  }

  await db.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
