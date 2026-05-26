import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiStockInsight, AiMarketSummary, AiAlert } from './entities/ai.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(AiStockInsight)
    private readonly insightRepo: Repository<AiStockInsight>,
    @InjectRepository(AiMarketSummary)
    private readonly summaryRepo: Repository<AiMarketSummary>,
    @InjectRepository(AiAlert)
    private readonly alertRepo: Repository<AiAlert>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateMarketSummary(date: Date): Promise<AiMarketSummary> {
    const dateStr = date.toISOString().split('T')[0];

    const [bhavData, upperBand, lowerBand, volumeGainers] = await Promise.all([
      this.dataSource.query(
        `SELECT symbol, close_price, prev_close, total_traded_qty, series
         FROM bhav_copy WHERE source_date = $1 AND series = 'EQ'
         ORDER BY total_traded_qty DESC LIMIT 50`,
        [dateStr]
      ),
      this.dataSource.query(
        `SELECT symbol, ltp, pct_chng FROM upper_band_hitters WHERE source_date = $1`,
        [dateStr]
      ),
      this.dataSource.query(
        `SELECT symbol, ltp, pct_chng FROM lower_band_hitters WHERE source_date = $1`,
        [dateStr]
      ),
      this.dataSource.query(
        `SELECT symbol, ltp, volume FROM volume_gainers WHERE source_date = $1 ORDER BY volume DESC LIMIT 20`,
        [dateStr]
      ),
    ]);

    // Calculate market breadth
    let advance = 0, decline = 0, unchanged = 0;
    for (const row of bhavData) {
      const change = parseFloat(row.close_price) - parseFloat(row.prev_close);
      if (change > 0) advance++;
      else if (change < 0) decline++;
      else unchanged++;
    }

    // Determine sentiment
    const ratio = advance / (advance + decline + 1);
    let sentiment = 'neutral';
    if (ratio > 0.7) sentiment = 'very_bullish';
    else if (ratio > 0.55) sentiment = 'bullish';
    else if (ratio < 0.3) sentiment = 'very_bearish';
    else if (ratio < 0.45) sentiment = 'bearish';

    const fearGreedScore = Math.round(ratio * 100);

    // Sector analysis
    const sectorSummary = this.analyzeSectors(bhavData);

    // Generate AI summary
    let generatedSummary = '';
    if (this.openai) {
      try {
        const prompt = `Analyze this NSE India market data for ${dateStr} and generate a concise professional market summary (2-3 paragraphs):

Market Breadth: ${advance} advances, ${decline} declines, ${unchanged} unchanged
Sentiment: ${sentiment} (Fear/Greed: ${fearGreedScore})
Upper Circuit Hits: ${upperBand.length} stocks
Lower Circuit Hits: ${lowerBand.length} stocks
Top Volume Gainers: ${volumeGainers.slice(0, 5).map((v: any) => v.symbol).join(', ')}

Provide insights on:
1. Overall market direction
2. Sector performance highlights
3. Notable movers and potential reasons
Keep it professional and factual. Add: "This is not financial advice."`;

        const response = await this.openai.chat.completions.create({
          model: this.configService.get<string>('AI_MODEL', 'gpt-4o-mini'),
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        });
        generatedSummary = response.choices[0]?.message?.content || '';
      } catch (err) {
        this.logger.error(`OpenAI API error: ${err.message}`);
        generatedSummary = `Market breadth: ${advance} advances, ${decline} declines. Sentiment: ${sentiment}. Fear/Greed Score: ${fearGreedScore}/100. Upper circuit: ${upperBand.length} stocks, Lower circuit: ${lowerBand.length} stocks.`;
      }
    } else {
      generatedSummary = `Market breadth: ${advance} advances, ${decline} declines. Sentiment: ${sentiment}. Fear/Greed Score: ${fearGreedScore}/100. Upper circuit: ${upperBand.length} stocks, Lower circuit: ${lowerBand.length} stocks.`;
    }

    const summary = this.summaryRepo.create({
      marketDate: date,
      marketSentiment: sentiment,
      fearGreedScore,
      sectorSummary,
      topAiSignals: upperBand.slice(0, 10),
      generatedSummary,
      breadthAdvance: advance,
      breadthDecline: decline,
      breadthUnchanged: unchanged,
    });

    await this.summaryRepo.upsert(summary, { conflictPaths: ['marketDate'] });
    return summary;
  }

  private analyzeSectors(data: any[]): Record<string, any> {
    const sectorMap: Record<string, string[]> = {
      Banking: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'INDUSINDBK', 'FEDERALBNK', 'BANDHANBNK'],
      IT: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'MPHASIS', 'COFORGE'],
      Pharma: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'BIOCON', 'LUPIN', 'AUROPHARMA'],
      Auto: ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT'],
      FMCG: ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR', 'GODREJCP'],
      Energy: ['RELIANCE', 'ONGC', 'BPCL', 'IOC', 'NTPC', 'POWERGRID'],
      Realty: ['DLF', 'GODREJPROP', 'OBEROIRLTY', 'PRESTIGE', 'BRIGADE'],
    };

    const result: Record<string, any> = {};
    for (const [sector, symbols] of Object.entries(sectorMap)) {
      const sectorData = data.filter(d => symbols.includes(d.symbol));
      if (sectorData.length === 0) continue;
      const avgChange = sectorData.reduce((sum, d) => {
        const chng = parseFloat(d.close_price) - parseFloat(d.prev_close);
        return sum + (chng / parseFloat(d.prev_close || 1)) * 100;
      }, 0) / sectorData.length;
      result[sector] = { avgChange: parseFloat(avgChange.toFixed(2)), count: sectorData.length };
    }
    return result;
  }

  async generateStockInsight(symbol: string, date: Date): Promise<AiStockInsight | null> {
    const dateStr = date.toISOString().split('T')[0];

    const bhavRecord = await this.dataSource.query(
      `SELECT * FROM bhav_copy WHERE symbol = $1 AND source_date = $2 LIMIT 1`,
      [symbol, dateStr]
    );

    if (!bhavRecord.length) return null;

    const record = bhavRecord[0];
    const close = parseFloat(record.close_price);
    const prev = parseFloat(record.prev_close);
    const pctChange = prev > 0 ? ((close - prev) / prev) * 100 : 0;

    // Calculate simple RSI approximation
    const histData = await this.dataSource.query(
      `SELECT close_price FROM bhav_copy WHERE symbol = $1 AND series = 'EQ'
       ORDER BY source_date DESC LIMIT 15`,
      [symbol]
    );

    const rsi = this.calculateRSI(histData.map((d: any) => parseFloat(d.close_price)));

    const trend = pctChange > 2 ? 'bullish' : pctChange < -2 ? 'bearish' : 'sideways';
    const momentumScore = Math.min(Math.max(50 + pctChange * 5, 0), 100);
    const riskScore = Math.min(Math.abs(pctChange) * 10, 100);
    // Derive breakout probability from RSI + momentum + trend
    const rsiBoost = rsi && rsi > 50 ? (rsi - 50) * 0.4 : 0;
    const breakoutProbability = Math.min(
      Math.max(momentumScore * 0.6 + rsiBoost + (trend === 'bullish' ? 15 : trend === 'bearish' ? -15 : 0), 0),
      99
    );

    let aiSummary = '';
    if (this.openai && histData.length > 5) {
      try {
        const prompt = `Analyze NSE stock ${symbol} for ${dateStr}:
Close: ₹${close}, Change: ${pctChange.toFixed(2)}%, RSI: ${rsi?.toFixed(1) || 'N/A'}
Volume: ${record.total_traded_qty}
Generate a 2-sentence trading insight. Not financial advice.`;

        const response = await this.openai.chat.completions.create({
          model: this.configService.get<string>('AI_MODEL', 'gpt-4o-mini'),
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.6,
        });
        aiSummary = response.choices[0]?.message?.content || '';
      } catch (err) {
        aiSummary = `${symbol} ${trend} trend. Change: ${pctChange.toFixed(2)}%. RSI: ${rsi?.toFixed(1) || 'N/A'}.`;
      }
    } else {
      aiSummary = `${symbol} showing ${trend} trend. Price change: ${pctChange.toFixed(2)}%. Volume: ${record.total_traded_qty}.`;
    }

    const insight = this.insightRepo.create({
      symbol,
      marketDate: date,
      trend,
      momentumScore: parseFloat(momentumScore.toFixed(2)),
      sentimentScore: parseFloat(momentumScore.toFixed(2)),
      riskScore: parseFloat(riskScore.toFixed(2)),
      breakoutProbability: parseFloat(breakoutProbability.toFixed(2)),
      aiConfidence: 75,
      aiSummary,
      rsi: rsi ? parseFloat(rsi.toFixed(2)) : undefined,
      predictedDirection: trend === 'bullish' ? 'up' : trend === 'bearish' ? 'down' : 'sideways',
    });

    await this.insightRepo.upsert(insight, { conflictPaths: ['symbol', 'marketDate'] });
    return insight;
  }

  private calculateRSI(prices: number[], period = 14): number | null {
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
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  async getMarketSummary(date?: string): Promise<AiMarketSummary | null> {
    const qb = this.summaryRepo.createQueryBuilder('s').orderBy('s.marketDate', 'DESC');
    if (date) qb.where('s.marketDate = :date', { date });
    return qb.getOne();
  }

  async getStockInsights(query: PaginationDto): Promise<PaginatedResponse<AiStockInsight>> {
    const qb = this.insightRepo.createQueryBuilder('i').orderBy('i.marketDate', 'DESC').addOrderBy('i.momentumScore', 'DESC');
    if (query.date) qb.where('i.marketDate = :date', { date: query.date });
    if (query.search) qb.andWhere('i.symbol ILIKE :s', { s: `%${query.search}%` });
    qb.skip(query.skip).take(query.limit || 20);
    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async getStockInsight(symbol: string, date?: string): Promise<AiStockInsight | null> {
    const qb = this.insightRepo.createQueryBuilder('i')
      .where('i.symbol = :symbol', { symbol: symbol.toUpperCase() })
      .orderBy('i.marketDate', 'DESC');
    if (date) qb.andWhere('i.marketDate = :date', { date });
    return qb.getOne();
  }

  async getAlerts(query: PaginationDto): Promise<PaginatedResponse<AiAlert>> {
    const qb = this.alertRepo.createQueryBuilder('a').orderBy('a.triggeredAt', 'DESC');
    if (query.search) qb.where('a.symbol ILIKE :s', { s: `%${query.search}%` });
    qb.skip(query.skip).take(query.limit || 20);
    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async getSignals(query: PaginationDto): Promise<PaginatedResponse<AiStockInsight>> {
    const qb = this.insightRepo.createQueryBuilder('i')
      .where(new Brackets(qb2 => {
        qb2.where('i.breakoutProbability > 60')
           .orWhere('i.momentumScore > 75');
      }))
      .orderBy('i.breakoutProbability', 'DESC')
      .addOrderBy('i.momentumScore', 'DESC');
    if (query.date) qb.andWhere('i.marketDate = :date', { date: query.date });
    qb.skip(query.skip).take(query.limit || 20);
    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async createAlert(symbol: string, alertType: string, message: string, severity = 'info', metadata?: any): Promise<AiAlert> {
    const alert = this.alertRepo.create({ symbol, alertType, alertMessage: message, severity, metadata });
    return this.alertRepo.save(alert);
  }

  async markAlertRead(id: string): Promise<void> {
    await this.alertRepo.update(id, { isRead: true });
  }

  async getUnreadAlertsCount(): Promise<number> {
    return this.alertRepo.count({ where: { isRead: false } });
  }
}
