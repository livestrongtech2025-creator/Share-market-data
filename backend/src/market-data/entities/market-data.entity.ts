import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

// Base class for all market data entities
export abstract class BaseMarketData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'source_date', type: 'date' })
  sourceDate: Date;

  @Index()
  @Column({ nullable: true })
  symbol: string;

  @Column({ nullable: true })
  series: string;

  @Column({ name: 'open_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  openPrice: number;

  @Column({ name: 'high_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  highPrice: number;

  @Column({ name: 'low_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  lowPrice: number;

  @Column({ name: 'prev_close', type: 'numeric', precision: 15, scale: 2, nullable: true })
  prevClose: number;

  @Column({ nullable: true, type: 'numeric', precision: 15, scale: 2 })
  ltp: number;

  @Column({ nullable: true, type: 'numeric', precision: 15, scale: 2 })
  chng: number;

  @Column({ name: 'pct_chng', nullable: true, type: 'numeric', precision: 10, scale: 4 })
  pctChng: number;

  @Column({ nullable: true, type: 'bigint' })
  volume: number;

  @Column({ nullable: true, type: 'numeric', precision: 20, scale: 2 })
  value: number;

  @Column({ name: 'raw_json', type: 'jsonb', nullable: true })
  rawJson: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('lower_band_hitters')
export class LowerBandHitter extends BaseMarketData {
  @Column({ name: 'lower_band', type: 'numeric', precision: 15, scale: 2, nullable: true })
  lowerBand: number;

  @Column({ name: 'week_52_high', type: 'numeric', precision: 15, scale: 2, nullable: true })
  week52High: number;

  @Column({ name: 'week_52_low', type: 'numeric', precision: 15, scale: 2, nullable: true })
  week52Low: number;
}

@Entity('upper_band_hitters')
export class UpperBandHitter extends BaseMarketData {
  @Column({ name: 'upper_band', type: 'numeric', precision: 15, scale: 2, nullable: true })
  upperBand: number;

  @Column({ name: 'week_52_high', type: 'numeric', precision: 15, scale: 2, nullable: true })
  week52High: number;

  @Column({ name: 'week_52_low', type: 'numeric', precision: 15, scale: 2, nullable: true })
  week52Low: number;
}

@Entity('volume_gainers')
export class VolumeGainer extends BaseMarketData {
  @Column({ name: 'prev_volume', type: 'bigint', nullable: true })
  prevVolume: number;

  @Column({ name: 'volume_ratio', type: 'numeric', precision: 10, scale: 4, nullable: true })
  volumeRatio: number;
}

@Entity('most_active_equities')
export class MostActiveEquity extends BaseMarketData {
  @Column({ nullable: true, type: 'bigint' })
  trades: number;
}

@Entity('bhav_copy')
export class BhavCopy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'source_date', type: 'date' })
  sourceDate: Date;

  @Index()
  @Column({ nullable: true })
  symbol: string;

  @Column({ nullable: true })
  series: string;

  @Column({ name: 'open_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  openPrice: number;

  @Column({ name: 'high_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  highPrice: number;

  @Column({ name: 'low_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  lowPrice: number;

  @Column({ name: 'close_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  closePrice: number;

  @Column({ name: 'last_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  lastPrice: number;

  @Column({ name: 'prev_close', type: 'numeric', precision: 15, scale: 2, nullable: true })
  prevClose: number;

  @Column({ name: 'avg_price', type: 'numeric', precision: 15, scale: 2, nullable: true })
  avgPrice: number;

  @Column({ name: 'total_traded_qty', type: 'bigint', nullable: true })
  totalTradedQty: number;

  @Column({ name: 'total_traded_value', type: 'numeric', precision: 20, scale: 2, nullable: true })
  totalTradedValue: number;

  @Column({ name: 'total_trades', type: 'bigint', nullable: true })
  totalTrades: number;

  @Column({ name: 'deliv_qty', type: 'bigint', nullable: true })
  delivQty: number;

  @Column({ name: 'deliv_per', type: 'numeric', precision: 8, scale: 2, nullable: true })
  delivPer: number;

  @Column({ nullable: true })
  isin: string;

  @Column({ name: 'raw_json', type: 'jsonb', nullable: true })
  rawJson: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
