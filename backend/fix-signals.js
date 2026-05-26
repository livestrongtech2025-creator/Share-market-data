/**
 * One-time fix: backfill breakout_probability for existing ai_stock_insights rows
 * that were generated before the field was computed.
 * Run: node fix-signals.js
 */
require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://nse_user:nse_secure_pass_2024@localhost:5432/nse_market',
});

async function main() {
  await client.connect();
  console.log('Connected. Backfilling breakout_probability...');

  // Compute breakout_probability from momentum_score, rsi, trend
  const result = await client.query(`
    UPDATE ai_stock_insights
    SET breakout_probability = LEAST(
      GREATEST(
        momentum_score * 0.6
        + CASE WHEN rsi > 50 THEN (rsi - 50) * 0.4 ELSE 0 END
        + CASE
            WHEN trend = 'bullish' THEN 15
            WHEN trend = 'bearish' THEN -15
            ELSE 0
          END,
        0
      ),
      99
    )
    WHERE breakout_probability IS NULL AND momentum_score IS NOT NULL
    RETURNING id
  `);

  console.log(`Updated ${result.rowCount} rows.`);
  await client.end();
  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
