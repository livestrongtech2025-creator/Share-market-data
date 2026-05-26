import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('ai_stock_insights')
export class AiStockInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  symbol: string;

  @Index()
  @Column({ name: 'market_date', type: 'date' })
  marketDate: Date;

  @Column({ nullable: true })
  trend: string;

  @Column({ name: 'momentum_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  momentumScore: number;

  @Column({ name: 'sentiment_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  sentimentScore: number;

  @Column({ name: 'risk_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  riskScore: number;

  @Column({ name: 'volume_anomaly_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  volumeAnomalyScore: number;

  @Column({ name: 'relative_strength', type: 'numeric', precision: 5, scale: 2, nullable: true })
  relativeStrength: number;

  @Column({ name: 'volatility_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  volatilityScore: number;

  @Column({ name: 'breakout_probability', type: 'numeric', precision: 5, scale: 2, nullable: true })
  breakoutProbability: number;

  @Column({ name: 'ai_confidence', type: 'numeric', precision: 5, scale: 2, nullable: true })
  aiConfidence: number;

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary: string;

  @Column({ nullable: true })
  prediction: string;

  @Column({ name: 'predicted_direction', nullable: true })
  predictedDirection: string;

  @Column({ nullable: true, type: 'numeric', precision: 5, scale: 2 })
  rsi: number;

  @Column({ nullable: true, type: 'numeric', precision: 10, scale: 4 })
  macd: number;

  @Column({ name: 'macd_signal', nullable: true, type: 'numeric', precision: 10, scale: 4 })
  macdSignal: number;

  @Column({ name: 'ema_20', nullable: true, type: 'numeric', precision: 15, scale: 2 })
  ema20: number;

  @Column({ name: 'ema_50', nullable: true, type: 'numeric', precision: 15, scale: 2 })
  ema50: number;

  @Column({ name: 'sma_200', nullable: true, type: 'numeric', precision: 15, scale: 2 })
  sma200: number;

  @Column({ name: 'bb_upper', nullable: true, type: 'numeric', precision: 15, scale: 2 })
  bbUpper: number;

  @Column({ name: 'bb_lower', nullable: true, type: 'numeric', precision: 15, scale: 2 })
  bbLower: number;

  @Column({ nullable: true, type: 'numeric', precision: 10, scale: 4 })
  atr: number;

  @Column({ nullable: true, type: 'numeric', precision: 15, scale: 2 })
  vwap: number;

  @Column({ type: 'jsonb', default: '[]' })
  patterns: string[];

  @Column({ nullable: true })
  sector: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('ai_market_summary')
export class AiMarketSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'market_date', type: 'date' })
  marketDate: Date;

  @Column({ name: 'market_sentiment', nullable: true })
  marketSentiment: string;

  @Column({ name: 'fear_greed_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  fearGreedScore: number;

  @Column({ name: 'sector_summary', type: 'jsonb', nullable: true })
  sectorSummary: Record<string, any>;

  @Column({ name: 'top_ai_signals', type: 'jsonb', nullable: true })
  topAiSignals: any[];

  @Column({ name: 'generated_summary', type: 'text', nullable: true })
  generatedSummary: string;

  @Column({ name: 'breadth_advance', nullable: true })
  breadthAdvance: number;

  @Column({ name: 'breadth_decline', nullable: true })
  breadthDecline: number;

  @Column({ name: 'breadth_unchanged', nullable: true })
  breadthUnchanged: number;

  @Column({ name: 'total_volume', type: 'bigint', nullable: true })
  totalVolume: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('ai_alerts')
export class AiAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  symbol: string;

  @Column({ name: 'alert_type' })
  alertType: string;

  @Column({ name: 'alert_message', type: 'text' })
  alertMessage: string;

  @Column({ default: 'info' })
  severity: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'triggered_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  triggeredAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
