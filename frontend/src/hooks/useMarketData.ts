import { useQuery } from '@tanstack/react-query';
import { marketApi, aiApi, logsApi, aiServiceApi } from '@/lib/api';
import type { TableQueryParams } from '@/types';

export function useLowerBandHitters(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['lower-band-hitters', params],
    queryFn: () => marketApi.getLowerBandHitters(params).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpperBandHitters(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['upper-band-hitters', params],
    queryFn: () => marketApi.getUpperBandHitters(params).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVolumeGainers(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['volume-gainers', params],
    queryFn: () => marketApi.getVolumeGainers(params).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMostActiveEquities(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['most-active-equities', params],
    queryFn: () => marketApi.getMostActiveEquities(params).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBhavCopy(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['bhav-copy', params],
    queryFn: () => marketApi.getBhavCopy(params).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBhavCopySeries() {
  return useQuery({
    queryKey: ['bhav-copy-series'],
    queryFn: () => marketApi.getBhavCopySeries().then(r => r.data as string[]),
    staleTime: 60 * 60 * 1000,
  });
}

export function useAiMarketSummary(date?: string) {
  return useQuery({
    queryKey: ['ai-market-summary', date],
    queryFn: () => aiApi.getMarketSummary(date).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAiStockInsights(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['ai-stock-insights', params],
    queryFn: () => aiApi.getStockInsights(params).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAiSignals(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['ai-signals', params],
    queryFn: () => aiApi.getSignals(params).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAiAlerts(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['ai-alerts', params],
    queryFn: () => aiApi.getAlerts(params).then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useJobLogs(params?: TableQueryParams) {
  return useQuery({
    queryKey: ['job-logs', params],
    queryFn: () => logsApi.getLogs(params).then(r => r.data),
    staleTime: 60 * 1000,
  });
}

export function useLogStats() {
  return useQuery({
    queryKey: ['log-stats'],
    queryFn: () => logsApi.getStats().then(r => r.data),
    staleTime: 60 * 1000,
  });
}

export function useSectorAnalysis(date?: string) {
  return useQuery({
    queryKey: ['sector-analysis', date],
    queryFn: () => aiServiceApi.getSectorAnalysis(date).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketBreadth(date?: string) {
  return useQuery({
    queryKey: ['market-breadth', date],
    queryFn: () => aiServiceApi.getMarketBreadth(date).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockIndicators(symbol: string, days?: number) {
  return useQuery({
    queryKey: ['stock-indicators', symbol, days],
    queryFn: () => aiServiceApi.getStockIndicators(symbol, days).then(r => r.data),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000,
  });
}

export function useHistoricalData(symbol: string, days?: number) {
  return useQuery({
    queryKey: ['historical', symbol, days],
    queryFn: () => aiServiceApi.getHistorical(symbol, days).then(r => r.data),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTopSignals(date?: string, limit?: number) {
  return useQuery({
    queryKey: ['top-signals', date, limit],
    queryFn: () => aiServiceApi.getTopSignals(date, limit).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
