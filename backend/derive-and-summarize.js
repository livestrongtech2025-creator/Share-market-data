/**
 * Derives Upper/Lower circuit hitters, Most Active & Volume Gainers from Bhav Copy.
 * Use this as a fallback whenever the live NSE API ingest missed a day — bhav
 * copy is always archived, so we can derive approximate "live"-table data from it.
 *
 * Usage:
 *   node derive-and-summarize.js <YYYY-MM-DD>      (defaults to most recent bhav date)
 *
 * Env:
 *   DATABASE_URL    — if set, uses it (e.g. Render Postgres) instead of local
 *   POSTGRES_SSL    — "true" enables SSL (required for Render)
 *   API_BASE        — backend URL for AI summary trigger (defaults to localhost)
 *   SKIP_API        — "true" skips the AI-summary API call entirely
 */
const { Client } = require('pg');
const axios = require('axios');

const TARGET_DATE = process.argv[2] || process.env.DATE_OVERRIDE || null;
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const SKIP_API = process.env.SKIP_API === 'true';

function makeDbClient() {
  const url = process.env.DATABASE_URL;
  const ssl = process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false;
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

function p(v) { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? null : n; }
function i2(v) { const n = parseInt(String(v||'').replace(/,/g,'')); return isNaN(n) ? null : n; }

async function main() {
  const db = makeDbClient();
  await db.connect();
  console.log('DB connected\n');

  // Resolve target date: arg → env → newest bhav copy date in DB
  let targetDate = TARGET_DATE;
  if (!targetDate) {
    const latest = await db.query(`SELECT MAX(source_date)::text AS d FROM bhav_copy`);
    targetDate = latest.rows[0].d;
    console.log(`(no date arg given — using latest bhav date: ${targetDate})\n`);
  }
  if (!targetDate) {
    console.log('No bhav data in DB. Aborting.');
    await db.end();
    return;
  }

  console.log(`Deriving for ${targetDate}...`);
  const bhavResult = await db.query(
    `SELECT * FROM bhav_copy WHERE source_date = $1 AND series = 'EQ' ORDER BY total_traded_qty DESC NULLS LAST`,
    [targetDate]
  );
  const bhavRows = bhavResult.rows;
  console.log(`   Found ${bhavRows.length} EQ records in Bhav Copy`);

  if (bhavRows.length === 0) {
    console.log('No Bhav Copy data found for', targetDate);
    await db.end();
    return;
  }

  // Pull previous trading day's volumes for the "volume gainers" derivation
  const prevDateRes = await db.query(
    `SELECT MAX(source_date)::text AS d FROM bhav_copy WHERE source_date < $1 AND series = 'EQ'`,
    [targetDate]
  );
  const prevDate = prevDateRes.rows[0].d;
  const prevVolMap = new Map();
  if (prevDate) {
    const prevRes = await db.query(
      `SELECT symbol, total_traded_qty FROM bhav_copy WHERE source_date = $1 AND series = 'EQ'`,
      [prevDate]
    );
    for (const r of prevRes.rows) prevVolMap.set(r.symbol, Number(r.total_traded_qty) || 0);
  }
  console.log(`   Using prev-day baseline: ${prevDate || '(none — vol-gainer derivation skipped)'}`);
  const TARGET_DATE_RESOLVED = targetDate;

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
      const chng = r.close != null && r.prev != null ? +(r.close - r.prev).toFixed(2) : null;
      const value = r.close != null && r.vol != null ? +(r.close * r.vol).toFixed(2) : null;
      await db.query(
        `INSERT INTO upper_band_hitters (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,upper_band,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (symbol,source_date) DO UPDATE SET
           pct_chng=EXCLUDED.pct_chng, ltp=EXCLUDED.ltp, chng=EXCLUDED.chng,
           value=COALESCE(upper_band_hitters.value, EXCLUDED.value),
           upper_band=COALESCE(upper_band_hitters.upper_band, EXCLUDED.upper_band)`,
        [TARGET_DATE_RESOLVED,r.symbol,r.series,r.open,r.high,r.low,r.prev,r.close,chng,r.pctChange,r.vol,value,r.close,JSON.stringify(r)]
      );
      ubhCount++;
    } catch(e) { /* skip */ }
  }

  for (const r of lowerCircuit) {
    try {
      const chng = r.close != null && r.prev != null ? +(r.close - r.prev).toFixed(2) : null;
      const value = r.close != null && r.vol != null ? +(r.close * r.vol).toFixed(2) : null;
      await db.query(
        `INSERT INTO lower_band_hitters (source_date,symbol,series,open_price,high_price,low_price,prev_close,ltp,chng,pct_chng,volume,value,lower_band,raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (symbol,source_date) DO UPDATE SET
           pct_chng=EXCLUDED.pct_chng, ltp=EXCLUDED.ltp, chng=EXCLUDED.chng,
           value=COALESCE(lower_band_hitters.value, EXCLUDED.value),
           lower_band=COALESCE(lower_band_hitters.lower_band, EXCLUDED.lower_band)`,
        [TARGET_DATE_RESOLVED,r.symbol,r.series,r.open,r.high,r.low,r.prev,r.close,chng,r.pctChange,r.vol,value,r.close,JSON.stringify(r)]
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
        [TARGET_DATE_RESOLVED,(r.symbol||'').trim(),r.series,p(r.open_price),p(r.high_price),p(r.low_price),prev,close,pctChng,vol,p(r.total_traded_value),JSON.stringify(r)]
      );
      maeCount++;
    } catch(e) { /* skip */ }
  }

  // 3b. Derive Volume Gainers (today's vol / prev-day vol, ratio >= 1.5, min 10k vol)
  let vgCount = 0;
  if (prevVolMap.size > 0) {
    const volumeGainers = [];
    for (const r of bhavRows) {
      const vol = i2(r.total_traded_qty);
      const prevVol = prevVolMap.get(r.symbol);
      if (!vol || !prevVol || vol < 10000) continue;
      const ratio = vol / prevVol;
      if (ratio >= 1.5) {
        const close = p(r.close_price), prev = p(r.prev_close);
        const pctChng = close && prev && prev !== 0 ? ((close - prev) / prev) * 100 : null;
        volumeGainers.push({ r, vol, prevVol, ratio, pctChng, close });
      }
    }
    volumeGainers.sort((a, b) => b.ratio - a.ratio);
    const top = volumeGainers.slice(0, 100);
    for (const g of top) {
      try {
        await db.query(
          `INSERT INTO volume_gainers (source_date,symbol,ltp,pct_chng,volume,value,prev_volume,volume_ratio,raw_json)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (symbol,source_date) DO UPDATE SET
             ltp=EXCLUDED.ltp, pct_chng=EXCLUDED.pct_chng, volume=EXCLUDED.volume,
             value=EXCLUDED.value, prev_volume=EXCLUDED.prev_volume,
             volume_ratio=EXCLUDED.volume_ratio, raw_json=EXCLUDED.raw_json`,
          [TARGET_DATE_RESOLVED, g.r.symbol, g.close, g.pctChng, g.vol,
           p(g.r.total_traded_value), g.prevVol, g.ratio,
           JSON.stringify({ derived_from: 'bhav_copy', prev_date: prevDate, ...g.r })]
        );
        vgCount++;
      } catch (_) { /* skip */ }
    }
  }

  console.log(`   Upper Band inserted: ${ubhCount}`);
  console.log(`   Lower Band inserted: ${lbhCount}`);
  console.log(`   Most Active inserted: ${maeCount}`);
  console.log(`   Volume Gainers inserted: ${vgCount}`);

  // 4. Print summary stats
  console.log('\nMarket Summary for', TARGET_DATE_RESOLVED, ':');
  const statsRes = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE close_price > prev_close) AS advances,
      COUNT(*) FILTER (WHERE close_price < prev_close) AS declines,
      COUNT(*) FILTER (WHERE close_price = prev_close) AS unchanged,
      SUM(total_traded_qty::bigint) AS total_volume,
      MAX(close_price::numeric) AS max_close
    FROM bhav_copy WHERE source_date = $1 AND series = 'EQ'
  `, [TARGET_DATE_RESOLVED]);
  const stats = statsRes.rows[0];
  console.log(`   Advances  : ${stats.advances}`);
  console.log(`   Declines  : ${stats.declines}`);
  console.log(`   Unchanged : ${stats.unchanged}`);
  console.log(`   Total Vol : ${parseInt(stats.total_volume || 0).toLocaleString()}`);

  // 5. Compute & store a basic market summary directly from stats.
  //    The HTTP call to the backend API is opt-in (SKIP_API=true skips it).
  const advances  = parseInt(stats.advances);
  const declines  = parseInt(stats.declines);
  const unchanged = parseInt(stats.unchanged);
  const ratio     = advances / (advances + declines + 1);
  let sentiment = 'neutral';
  if      (ratio > 0.7)  sentiment = 'very_bullish';
  else if (ratio > 0.55) sentiment = 'bullish';
  else if (ratio < 0.3)  sentiment = 'very_bearish';
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
      TARGET_DATE_RESOLVED, sentiment, fearGreed, advances, declines, unchanged,
      `NSE market on ${TARGET_DATE_RESOLVED}: ${advances} stocks advanced, ${declines} declined, ${unchanged} unchanged. Market sentiment: ${sentiment}. Fear/Greed score: ${fearGreed}/100. Upper circuit hitters: ${ubhCount} stocks. Lower circuit hitters: ${lbhCount} stocks. Total Bhav Copy records: ${bhavRows.length}. This is not financial advice.`,
      JSON.stringify([]),
      JSON.stringify({}),
    ]);
    console.log('Market summary stored in ai_market_summary');
  } catch (e2) {
    console.log('Summary insert failed:', e2.message);
  }

  if (!SKIP_API) {
    console.log('\nAttempting backend AI summary trigger...');
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, { email: 'admin@nseanalytics.com', password: 'Admin@123' }, { timeout: 10000 });
      const token = loginRes.data.accessToken;
      const summaryRes = await axios.post(
        `${API_BASE}/admin/trigger-ingestion`,
        { date: TARGET_DATE_RESOLVED },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
      );
      console.log('AI summary triggered:', JSON.stringify(summaryRes.data));
    } catch (e) {
      console.log('AI summary trigger skipped:', e.message);
    }
  }

  await db.end();

  console.log('\n=== Derive complete ===');
  console.log(`  Date              : ${TARGET_DATE_RESOLVED}`);
  console.log(`  Bhav Copy rows    : ${bhavRows.length}`);
  console.log(`  Upper Circuit     : ${ubhCount}`);
  console.log(`  Lower Circuit     : ${lbhCount}`);
  console.log(`  Most Active       : ${maeCount}`);
  console.log(`  Volume Gainers    : ${vgCount}`);
  console.log(`  TOTAL inserted    : ${ubhCount + lbhCount + maeCount + vgCount}`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
