import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  data?: any;
  suggestions?: string[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async chat(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    const msg = message.toLowerCase().trim();

    // Try OpenAI first if configured
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && !apiKey.includes('your-openai-key') && !apiKey.includes('sk-your')) {
      try {
        return await this.chatWithOpenAI(message, history, apiKey);
      } catch (err) {
        this.logger.warn(`OpenAI fallback to rule-based: ${err.message}`);
      }
    }

    // Rule-based intelligent chat using DB data
    return await this.ruleBasedChat(msg, message);
  }

  private async ruleBasedChat(msg: string, originalMessage: string): Promise<ChatResponse> {
    // ── Latest date ──────────────────────────────────────────────────────────
    const latestDateRes = await this.dataSource.query(
      `SELECT MAX(source_date) as latest FROM bhav_copy`
    );
    const latestDate = latestDateRes[0]?.latest;
    const dateStr = latestDate ? new Date(latestDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'latest available date';

    // ── Top gainers ──────────────────────────────────────────────────────────
    if (this.matches(msg, ['top gainer', 'best performer', 'biggest gainer', 'gainer', 'top performer', 'top gaining'])) {
      const rows = await this.dataSource.query(`
        SELECT symbol, close_price, prev_close, total_traded_qty,
               ROUND(((close_price - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2) AS pct_change
        FROM bhav_copy
        WHERE source_date = $1 AND series = 'EQ' AND prev_close > 0 AND close_price > prev_close
        ORDER BY pct_change DESC LIMIT 10
      `, [latestDate]);

      if (!rows.length) return { reply: `No gainer data found for ${dateStr}.`, suggestions: this.getSuggestions() };

      const list = rows.map((r: any, i: number) =>
        `${i + 1}. **${r.symbol}** — ₹${parseFloat(r.close_price).toFixed(2)} (+${r.pct_change}%)`
      ).join('\n');

      return {
        reply: `📈 **Top Gainers on ${dateStr}:**\n\n${list}\n\n*Not financial advice.*`,
        data: rows,
        suggestions: ['Top losers today', 'Volume gainers', 'Upper circuit stocks', 'Show RELIANCE analysis'],
      };
    }

    // ── Top losers ───────────────────────────────────────────────────────────
    if (this.matches(msg, ['top loser', 'biggest loser', 'top decline', 'fallen', 'worst performer', 'loser'])) {
      const rows = await this.dataSource.query(`
        SELECT symbol, close_price, prev_close,
               ROUND(((close_price - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2) AS pct_change
        FROM bhav_copy
        WHERE source_date = $1 AND series = 'EQ' AND prev_close > 0 AND close_price < prev_close
        ORDER BY pct_change ASC LIMIT 10
      `, [latestDate]);

      if (!rows.length) return { reply: `No loser data found for ${dateStr}.`, suggestions: this.getSuggestions() };

      const list = rows.map((r: any, i: number) =>
        `${i + 1}. **${r.symbol}** — ₹${parseFloat(r.close_price).toFixed(2)} (${r.pct_change}%)`
      ).join('\n');

      return {
        reply: `📉 **Top Losers on ${dateStr}:**\n\n${list}\n\n*Not financial advice.*`,
        data: rows,
        suggestions: ['Top gainers today', 'Lower circuit stocks', 'Market breadth'],
      };
    }

    // ── Upper circuit ────────────────────────────────────────────────────────
    if (this.matches(msg, ['upper circuit', 'upper band', 'upper limit', 'circuit high'])) {
      const rows = await this.dataSource.query(`
        SELECT symbol, ltp, pct_chng, volume FROM upper_band_hitters
        WHERE source_date = $1 ORDER BY pct_chng DESC LIMIT 15
      `, [latestDate]);

      if (!rows.length) {
        // Fallback: derive from bhav copy
        const derived = await this.dataSource.query(`
          SELECT symbol, close_price as ltp,
                 ROUND(((close_price - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2) AS pct_chng
          FROM bhav_copy WHERE source_date = $1 AND series = 'EQ' AND prev_close > 0
          AND ((close_price - prev_close) / NULLIF(prev_close, 0) * 100) >= 4.9
          ORDER BY pct_chng DESC LIMIT 15
        `, [latestDate]);

        const list = derived.map((r: any, i: number) =>
          `${i + 1}. **${r.symbol}** — ₹${parseFloat(r.ltp).toFixed(2)} (+${r.pct_chng}%)`
        ).join('\n');
        return {
          reply: `🔼 **Upper Circuit Stocks on ${dateStr}** (${derived.length} stocks hit upper limit):\n\n${list}\n\n*Not financial advice.*`,
          data: derived,
          suggestions: ['Lower circuit stocks', 'Top gainers', 'Volume gainers'],
        };
      }

      const list = rows.map((r: any, i: number) =>
        `${i + 1}. **${r.symbol}** — ₹${parseFloat(r.ltp || 0).toFixed(2)} (+${parseFloat(r.pct_chng || 0).toFixed(2)}%)`
      ).join('\n');
      return {
        reply: `🔼 **Upper Circuit Stocks on ${dateStr}** (${rows.length} stocks):\n\n${list}\n\n*Not financial advice.*`,
        data: rows,
        suggestions: ['Lower circuit stocks', 'Top gainers today'],
      };
    }

    // ── Lower circuit ────────────────────────────────────────────────────────
    if (this.matches(msg, ['lower circuit', 'lower band', 'lower limit', 'circuit low'])) {
      const rows = await this.dataSource.query(`
        SELECT symbol, ltp, pct_chng, volume FROM lower_band_hitters
        WHERE source_date = $1 ORDER BY pct_chng ASC LIMIT 15
      `, [latestDate]);

      const list = rows.length
        ? rows.map((r: any, i: number) =>
            `${i + 1}. **${r.symbol}** — ₹${parseFloat(r.ltp || 0).toFixed(2)} (${parseFloat(r.pct_chng || 0).toFixed(2)}%)`
          ).join('\n')
        : 'No lower circuit data found.';

      return {
        reply: `🔽 **Lower Circuit Stocks on ${dateStr}** (${rows.length} stocks):\n\n${list}\n\n*Not financial advice.*`,
        data: rows,
        suggestions: ['Upper circuit stocks', 'Top losers today'],
      };
    }

    // ── Volume gainers ───────────────────────────────────────────────────────
    if (this.matches(msg, ['volume gainer', 'high volume', 'volume surge', 'most traded', 'volume spike'])) {
      const rows = await this.dataSource.query(`
        SELECT symbol, ltp, pct_chng, volume FROM volume_gainers
        WHERE source_date = $1 ORDER BY volume DESC LIMIT 10
      `, [latestDate]);

      if (!rows.length) {
        const derived = await this.dataSource.query(`
          SELECT symbol, close_price as ltp, total_traded_qty as volume,
                 ROUND(((close_price - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2) AS pct_chng
          FROM bhav_copy WHERE source_date = $1 AND series = 'EQ'
          ORDER BY total_traded_qty DESC LIMIT 10
        `, [latestDate]);

        const list = derived.map((r: any, i: number) =>
          `${i + 1}. **${r.symbol}** — Vol: ${parseInt(r.volume).toLocaleString('en-IN')} | ₹${parseFloat(r.ltp).toFixed(2)} (${r.pct_chng}%)`
        ).join('\n');
        return {
          reply: `📊 **Top Volume Stocks on ${dateStr}:**\n\n${list}\n\n*Not financial advice.*`,
          data: derived,
          suggestions: ['Upper circuit', 'Top gainers', 'Most active stocks'],
        };
      }

      const list = rows.map((r: any, i: number) =>
        `${i + 1}. **${r.symbol}** — Vol: ${parseInt(r.volume || 0).toLocaleString('en-IN')} | ₹${parseFloat(r.ltp || 0).toFixed(2)}`
      ).join('\n');
      return {
        reply: `📊 **Volume Gainers on ${dateStr}:**\n\n${list}\n\n*Not financial advice.*`,
        data: rows,
        suggestions: ['Top gainers today', 'Most active equities'],
      };
    }

    // ── Market breadth / sentiment ───────────────────────────────────────────
    if (this.matches(msg, ['market breadth', 'market sentiment', 'market overview', 'market today', 'how is market', 'market summary', 'fear greed', 'nifty', 'sensex', 'market condition'])) {
      const breadth = await this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE close_price > prev_close) AS advances,
          COUNT(*) FILTER (WHERE close_price < prev_close) AS declines,
          COUNT(*) FILTER (WHERE close_price = prev_close) AS unchanged,
          COUNT(*) AS total,
          SUM(total_traded_qty::bigint) AS total_volume
        FROM bhav_copy WHERE source_date = $1 AND series = 'EQ' AND prev_close > 0
      `, [latestDate]);

      const upper = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM upper_band_hitters WHERE source_date = $1`, [latestDate]);
      const lower = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM lower_band_hitters WHERE source_date = $1`, [latestDate]);

      const b = breadth[0];
      const adv = parseInt(b.advances || 0), dec = parseInt(b.declines || 0), unch = parseInt(b.unchanged || 0);
      const total = adv + dec + unch;
      const ratio = adv / (total || 1);
      let sentiment = 'Neutral 😐';
      if (ratio > 0.7) sentiment = 'Very Bullish 🚀';
      else if (ratio > 0.55) sentiment = 'Bullish 📈';
      else if (ratio < 0.3) sentiment = 'Very Bearish 🔴';
      else if (ratio < 0.45) sentiment = 'Bearish 📉';
      const fearGreed = Math.round(ratio * 100);

      return {
        reply: `📊 **NSE Market Summary — ${dateStr}**\n\n` +
          `**Sentiment:** ${sentiment}\n` +
          `**Fear/Greed Score:** ${fearGreed}/100\n\n` +
          `📈 Advances: **${adv}** stocks\n` +
          `📉 Declines: **${dec}** stocks\n` +
          `➡️ Unchanged: **${unch}** stocks\n` +
          `🔼 Upper Circuit: **${upper[0]?.cnt || 0}** stocks\n` +
          `🔽 Lower Circuit: **${lower[0]?.cnt || 0}** stocks\n` +
          `💰 Total Volume: **${parseInt(b.total_volume || 0).toLocaleString('en-IN')}**\n\n` +
          `*Not financial advice.*`,
        data: { advances: adv, declines: dec, unchanged: unch, fearGreed, sentiment },
        suggestions: ['Top gainers today', 'Top losers today', 'Upper circuit stocks', 'Volume gainers'],
      };
    }

    // ── Specific stock analysis ──────────────────────────────────────────────
    const stockMatch = originalMessage.match(/\b([A-Z]{2,15})\b/g);
    const knownSymbols = stockMatch?.filter(s => s.length >= 3 && s.length <= 15 && !['NSE','BSE','RSI','EMA','SMA','MACD','IPO','ETF','THE','AND','FOR','TOP','HOW','ARE','HIT','SHOW','WHAT','WHICH','HAVE','BEST','MOST','HIGH','LOW','CAN','ANY','ALL','GET','SET','PUT','BUY','SELL','HOLD'].includes(s));

    if (knownSymbols?.length) {
      const symbol = knownSymbols[0];
      const stock = await this.dataSource.query(`
        SELECT symbol, open_price, high_price, low_price, close_price, prev_close,
               total_traded_qty, total_traded_value, source_date,
               ROUND(((close_price - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2) AS pct_change
        FROM bhav_copy WHERE symbol = $1 AND series = 'EQ'
        ORDER BY source_date DESC LIMIT 1
      `, [symbol]);

      if (stock.length) {
        const s = stock[0];
        const close = parseFloat(s.close_price), prev = parseFloat(s.prev_close);
        const change = close - prev;
        const pct = parseFloat(s.pct_change);
        const arrow = pct >= 0 ? '▲' : '▼';
        const sentiment = pct > 3 ? 'Strong Bullish 🚀' : pct > 0 ? 'Bullish 📈' : pct < -3 ? 'Strong Bearish 🔴' : 'Bearish 📉';

        // Get RSI from recent data
        const hist = await this.dataSource.query(`
          SELECT close_price FROM bhav_copy WHERE symbol = $1 AND series = 'EQ'
          ORDER BY source_date DESC LIMIT 15
        `, [symbol]);
        const prices = hist.map((h: any) => parseFloat(h.close_price));
        const rsi = this.calcRSI(prices);

        return {
          reply: `📋 **${symbol} Analysis — ${new Date(s.source_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}**\n\n` +
            `💰 **Close:** ₹${close.toFixed(2)} ${arrow} ₹${Math.abs(change).toFixed(2)} (${pct >= 0 ? '+' : ''}${pct}%)\n` +
            `📊 **OHLC:** O:₹${parseFloat(s.open_price || 0).toFixed(2)} H:₹${parseFloat(s.high_price || 0).toFixed(2)} L:₹${parseFloat(s.low_price || 0).toFixed(2)} C:₹${close.toFixed(2)}\n` +
            `📉 **Prev Close:** ₹${prev.toFixed(2)}\n` +
            `📦 **Volume:** ${parseInt(s.total_traded_qty || 0).toLocaleString('en-IN')}\n` +
            `📈 **RSI (14):** ${rsi ? rsi.toFixed(1) + (rsi > 70 ? ' (Overbought)' : rsi < 30 ? ' (Oversold)' : ' (Neutral)') : 'Insufficient data'}\n` +
            `🎯 **Sentiment:** ${sentiment}\n\n` +
            `*Not financial advice.*`,
          data: s,
          suggestions: [`Top gainers today`, `Volume gainers`, `Upper circuit stocks`, `Market overview`],
        };
      }
    }

    // ── Most active ──────────────────────────────────────────────────────────
    if (this.matches(msg, ['most active', 'most traded', 'highest traded', 'active stock'])) {
      const rows = await this.dataSource.query(`
        SELECT symbol, ltp, volume, value FROM most_active_equities
        WHERE source_date = $1 ORDER BY volume DESC LIMIT 10
      `, [latestDate]);

      if (!rows.length) {
        const derived = await this.dataSource.query(`
          SELECT symbol, close_price as ltp, total_traded_qty as volume
          FROM bhav_copy WHERE source_date = $1 AND series = 'EQ'
          ORDER BY total_traded_qty DESC LIMIT 10
        `, [latestDate]);

        const list = derived.map((r: any, i: number) =>
          `${i + 1}. **${r.symbol}** — Vol: ${parseInt(r.volume || 0).toLocaleString('en-IN')} | ₹${parseFloat(r.ltp || 0).toFixed(2)}`
        ).join('\n');
        return { reply: `📊 **Most Active Equities on ${dateStr}:**\n\n${list}\n\n*Not financial advice.*`, data: derived, suggestions: this.getSuggestions() };
      }

      const list = rows.map((r: any, i: number) =>
        `${i + 1}. **${r.symbol}** — Vol: ${parseInt(r.volume || 0).toLocaleString('en-IN')} | ₹${parseFloat(r.ltp || 0).toFixed(2)}`
      ).join('\n');
      return { reply: `📊 **Most Active Equities on ${dateStr}:**\n\n${list}\n\n*Not financial advice.*`, data: rows, suggestions: this.getSuggestions() };
    }

    // ── RSI stocks ───────────────────────────────────────────────────────────
    if (this.matches(msg, ['rsi', 'oversold', 'overbought', 'strong rsi', 'technical'])) {
      const rows = await this.dataSource.query(`
        SELECT symbol FROM ai_stock_insights WHERE rsi IS NOT NULL AND market_date = $1
        ORDER BY rsi DESC LIMIT 10
      `, [latestDate]);

      if (!rows.length) {
        return {
          reply: `📊 **RSI Analysis**\n\nRSI data is generated when AI stock insights are run. For ${dateStr}, try checking individual stocks like:\n- Ask: "Analyze RELIANCE"\n- Ask: "Analyze INFY"\n- Ask: "Analyze HDFCBANK"\n\nOr ask for top gainers/losers which include momentum data.\n\n*Not financial advice.*`,
          suggestions: ['Top gainers today', 'Market overview', 'Analyze RELIANCE', 'Analyze TCS'],
        };
      }

      return {
        reply: `📈 **Stocks with RSI data available:** ${rows.map((r: any) => r.symbol).join(', ')}\n\nAsk me to analyze any of these stocks for detailed RSI data.\n\n*Not financial advice.*`,
        suggestions: rows.slice(0, 3).map((r: any) => `Analyze ${r.symbol}`),
      };
    }

    // ── Bhav copy data ───────────────────────────────────────────────────────
    if (this.matches(msg, ['bhav copy', 'bhavcopy', 'total stocks', 'how many stocks', 'all stocks'])) {
      const cnt = await this.dataSource.query(`SELECT COUNT(*) as total FROM bhav_copy WHERE source_date = $1 AND series = 'EQ'`, [latestDate]);
      return {
        reply: `📋 **Bhav Copy — ${dateStr}**\n\nTotal EQ stocks tracked: **${parseInt(cnt[0]?.total || 0).toLocaleString()}**\n\nBhav Copy contains OHLC (Open, High, Low, Close), volume, and trade data for all NSE-listed equities.\n\n*Not financial advice.*`,
        suggestions: ['Top gainers today', 'Top losers today', 'Market overview'],
      };
    }

    // ── Help ─────────────────────────────────────────────────────────────────
    if (this.matches(msg, ['help', 'what can you do', 'commands', 'options', 'hi', 'hello', 'hey', 'what'])) {
      return {
        reply: `👋 **Hello! I'm your NSE Market AI Assistant.**\n\nHere's what I can help you with:\n\n📈 **Market Analysis:**\n- "Market overview" / "Market summary"\n- "Top gainers today"\n- "Top losers today"\n- "Volume gainers"\n\n🔔 **Circuit Analysis:**\n- "Upper circuit stocks"\n- "Lower circuit stocks"\n\n📊 **Stock Analysis:**\n- "Analyze RELIANCE" (any NSE symbol)\n- "Show TATA" / "INFY analysis"\n\n📋 **Data:**\n- "Most active equities"\n- "Bhav copy data"\n- "RSI stocks"\n\n*Data is available for: ${dateStr}. This is not financial advice.*`,
        suggestions: ['Market overview', 'Top gainers today', 'Upper circuit stocks', 'Analyze RELIANCE'],
      };
    }

    // ── Default fallback ─────────────────────────────────────────────────────
    return {
      reply: `🤔 I understand you're asking about: **"${originalMessage}"**\n\nI can answer questions about NSE market data for **${dateStr}**. Try asking:\n\n- "Show top gainers"\n- "Market overview"\n- "Upper circuit stocks"\n- "Analyze RELIANCE"\n- "Volume gainers"\n\n*Not financial advice.*`,
      suggestions: this.getSuggestions(),
    };
  }

  private matches(msg: string, keywords: string[]): boolean {
    return keywords.some(k => msg.includes(k));
  }

  private getSuggestions(): string[] {
    return ['Top gainers today', 'Market overview', 'Upper circuit stocks', 'Volume gainers'];
  }

  private calcRSI(prices: number[], period = 14): number | null {
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

  private async chatWithOpenAI(message: string, history: ChatMessage[], apiKey: string): Promise<ChatResponse> {
    const OpenAI = require('openai');
    const openai = new OpenAI.default({ apiKey });

    // Get context from DB
    const latestDateRes = await this.dataSource.query(`SELECT MAX(source_date) as latest FROM bhav_copy`);
    const latestDate = latestDateRes[0]?.latest;
    const breadth = await this.dataSource.query(`
      SELECT COUNT(*) FILTER (WHERE close_price > prev_close) AS adv,
             COUNT(*) FILTER (WHERE close_price < prev_close) AS dec
      FROM bhav_copy WHERE source_date = $1 AND series = 'EQ'
    `, [latestDate]);
    const upper = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM upper_band_hitters WHERE source_date = $1`, [latestDate]);
    const lower = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM lower_band_hitters WHERE source_date = $1`, [latestDate]);
    const topGainers = await this.dataSource.query(`
      SELECT symbol, close_price, ROUND(((close_price-prev_close)/NULLIF(prev_close,0)*100)::numeric,2) as pct
      FROM bhav_copy WHERE source_date = $1 AND series='EQ' AND prev_close > 0
      ORDER BY pct DESC LIMIT 5
    `, [latestDate]);

    const systemPrompt = `You are an expert NSE India market analyst AI. You have access to real-time market data for ${latestDate}.

Current Market Data:
- Advances: ${breadth[0]?.adv}, Declines: ${breadth[0]?.dec}
- Upper Circuit: ${upper[0]?.cnt} stocks, Lower Circuit: ${lower[0]?.cnt} stocks
- Top Gainers: ${topGainers.map((g: any) => `${g.symbol}(+${g.pct}%)`).join(', ')}

Answer questions about NSE markets concisely and professionally. Always end with "Not financial advice."`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await openai.chat.completions.create({
      model: this.configService.get('AI_MODEL', 'gpt-4o-mini'),
      messages,
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || 'No response generated.';
    return {
      reply,
      suggestions: ['Top gainers today', 'Market overview', 'Upper circuit stocks'],
    };
  }
}
