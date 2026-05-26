/**
 * generate-insights.js
 * Generates ai_stock_insights records from bhav_copy data.
 * Run: node generate-insights.js [YYYY-MM-DD]  (defaults to latest date in bhav_copy)
 */
require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');

const TARGET_DATE = process.argv[2] || null; // e.g. "2026-05-22"

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nse_market',
  user: process.env.POSTGRES_USER || 'nse_user',
  password: process.env.POSTGRES_PASSWORD || 'nse_secure_pass_2024',
});

function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i - 1] - prices[i];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

async function main() {
  await client.connect();
  console.log('✅ DB connected');

  // Find target date
  let date = TARGET_DATE;
  if (!date) {
    const res = await client.query(`SELECT MAX(source_date)::text as d FROM bhav_copy`);
    date = res.rows[0].d;
    console.log(`📅 Using latest date: ${date}`);
  }

  // Get all EQ stocks for this date
  const bhavRes = await client.query(`
    SELECT symbol, open_price, high_price, low_price, close_price, prev_close, total_traded_qty, total_traded_value
    FROM bhav_copy
    WHERE source_date = $1 AND series = 'EQ' AND prev_close > 0 AND close_price > 0
    ORDER BY total_traded_qty DESC NULLS LAST
  `, [date]);

  const stocks = bhavRes.rows;
  console.log(`📊 Processing ${stocks.length} stocks for ${date}...`);

  let inserted = 0, skipped = 0;

  for (const s of stocks) {
    const close = parseFloat(s.close_price);
    const prev = parseFloat(s.prev_close);
    const pctChange = prev > 0 ? ((close - prev) / prev) * 100 : 0;

    // Get recent price history for RSI
    const hist = await client.query(`
      SELECT close_price FROM bhav_copy
      WHERE symbol = $1 AND series = 'EQ'
      ORDER BY source_date DESC LIMIT 16
    `, [s.symbol]);

    const prices = hist.rows.map(h => parseFloat(h.close_price));
    const rsi = calcRSI(prices);

    const trend = pctChange > 2 ? 'bullish' : pctChange < -2 ? 'bearish' : 'sideways';
    const momentumScore = Math.min(Math.max(50 + pctChange * 5, 0), 100);
    const riskScore = Math.min(Math.abs(pctChange) * 10, 100);
    const rsiBoost = rsi && rsi > 50 ? (rsi - 50) * 0.4 : 0;
    const breakoutProbability = Math.min(
      Math.max(momentumScore * 0.6 + rsiBoost + (trend === 'bullish' ? 15 : trend === 'bearish' ? -15 : 0), 0),
      99
    );
    const aiSummary = `${s.symbol} ${trend} trend. Price change: ${pctChange.toFixed(2)}%. RSI: ${rsi ? rsi.toFixed(1) : 'N/A'}. Volume: ${parseInt(s.total_traded_qty || 0).toLocaleString('en-IN')}.`;
    const predictedDirection = trend === 'bullish' ? 'up' : trend === 'bearish' ? 'down' : 'sideways';

    try {
      await client.query(`
        INSERT INTO ai_stock_insights
          (symbol, market_date, trend, momentum_score, sentiment_score, risk_score,
           breakout_probability, ai_confidence, ai_summary, rsi, predicted_direction, patterns)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (symbol, market_date) DO UPDATE SET
          trend=EXCLUDED.trend,
          momentum_score=EXCLUDED.momentum_score,
          sentiment_score=EXCLUDED.sentiment_score,
          risk_score=EXCLUDED.risk_score,
          breakout_probability=EXCLUDED.breakout_probability,
          ai_summary=EXCLUDED.ai_summary,
          rsi=EXCLUDED.rsi,
          predicted_direction=EXCLUDED.predicted_direction
      `, [
        s.symbol, date, trend,
        parseFloat(momentumScore.toFixed(2)),
        parseFloat(momentumScore.toFixed(2)),
        parseFloat(riskScore.toFixed(2)),
        parseFloat(breakoutProbability.toFixed(2)),
        75,
        aiSummary,
        rsi ? parseFloat(rsi.toFixed(2)) : null,
        predictedDirection,
        '[]'
      ]);
      inserted++;
    } catch (e) {
      console.error(`  ⚠️ ${s.symbol}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Done! Inserted/updated: ${inserted}, Skipped: ${skipped}`);

  // Show signal count
  const sigRes = await client.query(`
    SELECT COUNT(*) as total FROM ai_stock_insights
    WHERE market_date = $1 AND (breakout_probability > 60 OR momentum_score > 75)
  `, [date]);
  console.log(`🎯 AI Signals (high breakout/momentum): ${sigRes.rows[0].total}`);

  await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
