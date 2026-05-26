export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'analyst';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface MarketDataRecord {
  id: string;
  sourceDate: string;
  symbol: string;
  series: string;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  prevClose: number;
  ltp: number;
  chng: number;
  pctChng: number;
  volume: number;
  value: number;
  createdAt: string;
}

export interface LowerBandHitter extends MarketDataRecord {
  lowerBand: number;
  week52High: number;
  week52Low: number;
}

export interface UpperBandHitter extends MarketDataRecord {
  upperBand: number;
  week52High: number;
  week52Low: number;
}

export interface VolumeGainer extends MarketDataRecord {
  prevVolume: number;
  volumeRatio: number;
}

export interface MostActiveEquity extends MarketDataRecord {
  trades: number;
}

export interface BhavCopy {
  id: string;
  sourceDate: string;
  symbol: string;
  series: string;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  lastPrice: number;
  prevClose: number;
  avgPrice: number | null;
  totalTradedQty: number;
  totalTradedValue: number;
  totalTrades: number;
  delivQty: number | null;
  delivPer: number | null;
  isin: string;
  createdAt: string;
}

export interface AiStockInsight {
  id: string;
  symbol: string;
  marketDate: string;
  trend: 'bullish' | 'bearish' | 'sideways' | 'strong_bullish' | 'strong_bearish';
  momentumScore: number;
  sentimentScore: number;
  riskScore: number;
  aiConfidence: number;
  breakoutProbability: number;
  aiSummary: string;
  predictedDirection: string;
  rsi: number;
  macd: number;
  patterns: string[];
  createdAt: string;
}

export interface AiMarketSummary {
  id: string;
  marketDate: string;
  marketSentiment: string;
  fearGreedScore: number;
  sectorSummary: Record<string, { avgChange: number; count: number }>;
  topAiSignals: any[];
  generatedSummary: string;
  breadthAdvance: number;
  breadthDecline: number;
  breadthUnchanged: number;
}

export interface AiAlert {
  id: string;
  symbol: string;
  alertType: string;
  alertMessage: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  isRead: boolean;
  triggeredAt: string;
  metadata: any;
}

export interface JobLog {
  id: string;
  jobName: string;
  jobType: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  recordsInserted: number;
  recordsFailed: number;
  errorMessage: string;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string;
  symbols: string[];
  isDefault: boolean;
  createdAt: string;
}

export interface TableQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  date?: string;
  startDate?: string;
  endDate?: string;
  // Bhav Copy specific filters
  series?: string;
  minClose?: number;
  maxClose?: number;
  minVolume?: number;
  maxVolume?: number;
}
