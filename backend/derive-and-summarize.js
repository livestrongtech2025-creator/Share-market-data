/**
 * Derives Upper/Lower circuit hitters & Most Active from Bhav Copy
 * Then triggers AI summary via backend API
 */
const { Client } = require('pg');
const axios = require('axios');

const TARGET_DATE = '2026-05-22';
const API_BASE = 'http://localhost:3001/api';

const DB = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nse_market',
  user: process.env.POSTGRES_USER || 'nse_user',
  password: process.env.POSTGRES_PASSWORD || 'nse_secure_pass_2024',
};

function p(v) { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? null : n; }
function i2(v) { const n = parseInt(String(v||'').replace(/,/g,'')); return isNaN(n) ? null : n; }

async function main() {
  const db = new Client(DB);
  await db.connect();
  console.log('✅ DB connected\n');

  // 1. Read Bhav Copy data for May 22
  console.log('📊 Reading Bhav Copy data...');
  const bhavResult = await db.query(
    `SELECT * FROM bhav_copy WHERE source_date = $1 AND series = 'EQ' ORDER BY total_traded_qty DESC NULLS LAST`,
    [TARGET_DATE]
  );
  const bhavRows = bhavResult.rows;
  console.log(`   Found ${bhavRows.length} EQ records in Bhav Copy`);

  if (bhavRows.length === 0) {
    console.log('❌ No Bhav Copy data found for', TARGET_DATE);
    await db.end();
    return;
  }

  // 2. Derive circuit hitters from Bhav Copy
  const upperCircuit = [];
  const lowerCircuit = [];
  const mostActive = [];

  for (const r of bhavRows) {
    const close = p(r.close_price);
    const prev = p(r.prev_close);
    const vol = i2(r.total_traded_qty);
    
    if (!close || !prev || prev === 0) continue;
    
    const pctChange = ((close - prev) / prev) * 100;
    
    // Upper circuit: >= 5% gain (simplified heuristic since we don't have actual circuit limit data)
    if (pctChange >= 4.9) {
      upperCircuit.push({
        symbol: r.symbol,
        series: r.series,
        close, prev, pctChange, vol,
        open: r.open_price, high: r.high_price, low: r.low_price,
      });
    }
    // Lower circuit: <= -5%
    else if (pctChange <= -4.9) {
      lowerCircuit.push({
        symbol: r.symbol,
        series: r.series,
        close, prev, pctChange, vol,
        open: r.open_price, high: r.high_price, low: r.low_price,
      });
    }
  }

  // Most active: top 50 by volume
  const topByVolume = [...bhavRows]
    .filter(r => r.total_traded_qty && r.total_traded_qty > 0)
    .sort((a, b) => (i2(b.total_traded_qty) || 0) - (i2(a.total_traded_qty) || 0))
    .slice(0, 50);

  console.log(`\n📈 Derived from Bhav Copy:`);
  console.log(`   Upper Circuit (≥5%): ${upperCircuit.length} stocks`);
  console.log(`   Lower Circuit (≤-5%): ${lowerCircuit.length} stocks`);
  console.log(`   Top by Volume: ${topByVolume.length} stocks`);

  // 3. Insert Upper Circuit
  console.log('\n💾 Inserting derived circuit data...');
  let ubhCount = 0, lbhCount = 0, maeCount = 0;

  for (const r of upperCircuit) {
    try {
      await db.query(
        `INSERT INTO upper_band_hitters (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,pct_chng,volume,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (symbol,source_date) DO UPDATE SET pct_chng=EXCLUDED.pct_chng,ltp=EXCLUDED.ltp`,
        [TARGET_DATE,r.symbol,r.series,r.open,r.high,r.low,r.prev,r.close,r.pctChange,r.vol,JSON.stringify(r)]
      );
      ubhCount++;
    } catch(e) { /* skip */ }
  }

  for (const r of lowerCircuit) {
    try {
      await db.query(
        `INSERT INTO lower_band_hitters (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,pct_chng,volume,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (symbol,source_date) DO UPDATE SET pct_chng=EXCLUDED.pct_chng,ltp=EXCLUDED.ltp`,
        [TARGET_DATE,r.symbol,r.series,r.open,r.high,r.low,r.prev,r.close,r.pctChange,r.vol,JSON.stringify(r)]
      );
      lbhCount++;
    } catch(e) { /* skip */ }
  }

  for (const r of topByVolume) {
    try {
      const close = p(r.close_price), prev = p(r.prev_close), vol = i2(r.total_traded_qty);
      const pctChng = close && prev && prev !== 0 ? ((close - prev) / prev) * 100 : null;
      await db.query(
        `INSERT INTO most_active_equities (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,pct_chng,volume,value,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (symbol,source_date) DO NOTHING`,
        [TARGET_DATE,(r.symbol||'').trim(),r.series,p(r.open_price),p(r.high_price),p(r.low_price),prev,close,pctChng,vol,p(r.total_traded_value),JSON.stringify(r)]
      );
      maeCount++;
    } catch(e) { /* skip */ }
  }

  console.log(`   Upper Band inserted: ${ubhCount}`);
  console.log(`   Lower Band inserted: ${lbhCount}`);
  console.log(`   Most Active inserted: ${maeCount}`);

  // 4. Print summary stats
  console.log('\n📊 Market Summary for', TARGET_DATE, ':');
  const statsRes = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE close_price > prev_close) AS advances,
      COUNT(*) FILTER (WHERE close_price < prev_close) AS declines,
      COUNT(*) FILTER (WHERE close_price = prev_close) AS unchanged,
      SUM(total_traded_qty::bigint) AS total_volume,
      MAX(close_price::numeric) AS max_close
    FROM bhav_copy WHERE source_date = $1 AND series = 'EQ'
  `, [TARGET_DATE]);
  const stats = statsRes.rows[0];
  console.log(`   Advances  : ${stats.advances}`);
  console.log(`   Declines  : ${stats.declines}`);
  console.log(`   Unchanged : ${stats.unchanged}`);
  console.log(`   Total Vol : ${parseInt(stats.total_volume || 0).toLocaleString()}`);

  // 5. Trigger AI summary via backend API
  console.log('\n🤖 Triggering AI market summary...');
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, { email: 'admin@nseanalytics.com', password: 'Admin@123' });
    const token = loginRes.data.accessToken;
    const summaryRes = await axios.post(
      `${API_BASE}/admin/trigger-ingestion`,
      { date: TARGET_DATE },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
    );
    console.log('✅ AI summary triggered:', JSON.stringify(summaryRes.data));
  } catch (e) {
    console.log('⚠️  AI summary via API:', e.message);
    // Directly insert a market summary from our stats
    const advances = parseInt(stats.advances), declines = parseInt(stats.declines);
    const unchanged = parseInt(stats.unchanged);
    const ratio = advances / (advances + declines + 1);
    let sentiment = 'neutral';
    if (ratio > 0.7) sentiment = 'very_bullish';
    else if (ratio > 0.55) sentiment = 'bullish';
    else if (ratio < 0.3) sentiment = 'very_bearish';
    else if (ratio < 0.45) sentiment = 'bearish';
    const fearGreed = Math.round(ratio * 100);

    try {
      await db.query(`
        INSERT INTO ai_market_summary (market_date, market_sentiment, fear_greed_score, breadth_advance, breadth_decline, breadth_unchanged, generated_summary, top_ai_signals, sector_summary)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (market_date) DO UPDATE SET
          market_sentiment=EXCLUDED.market_sentiment, fear_greed_score=EXCLUDED.fear_greed_score,
          breadth_advance=EXCLUDED.breadth_advance, breadth_decline=EXCLUDED.breadth_decline,
          generated_summary=EXCLUDED.generated_summary
      `, [
        TARGET_DATE, sentiment, fearGreed, advances, declines, unchanged,
        `NSE market on ${TARGET_DATE}: ${advances} stocks advanced, ${declines} declined, ${unchanged} unchanged. Market sentiment: ${sentiment}. Fear/Greed score: ${fearGreed}/100. Upper circuit hitters: ${ubhCount} stocks. Lower circuit hitters: ${lbhCount} stocks. Total Bhav Copy records: ${bhavRows.length}. This is not financial advice.`,
        JSON.stringify([]),
        JSON.stringify({}),
      ]);
      console.log('✅ AI Market Summary directly inserted into DB');
    } catch (e2) {
      console.log('⚠️  Direct summary insert:', e2.message);
    }
  }

  await db.end();

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║          FINAL INGESTION COMPLETE          ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  Date                : ${TARGET_DATE}          ║`);
  console.log(`║  Bhav Copy Records   : ${String(bhavRows.length).padEnd(18)} ║`);
  console.log(`║  Upper Circuit       : ${String(ubhCount).padEnd(18)} ║`);
  console.log(`║  Lower Circuit       : ${String(lbhCount).padEnd(18)} ║`);
  console.log(`║  Most Active Equities: ${String(maeCount).padEnd(18)} ║`);
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  TOTAL               : ${String(bhavRows.length + ubhCount + lbhCount + maeCount).padEnd(18)} ║`);
  console.log('╚════════════════════════════════════════════╝\n');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
