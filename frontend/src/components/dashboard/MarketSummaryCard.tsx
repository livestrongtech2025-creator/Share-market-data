'use client';
import { useAiMarketSummary, useMarketBreadth } from '@/hooks/useMarketData';
import SentimentBadge from '@/components/ui/SentimentBadge';
import FearGreedGauge from '@/components/charts/FearGreedGauge';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MarketSummaryCard() {
  const { data: summary, isLoading } = useAiMarketSummary();
  const { data: breadth } = useMarketBreadth();

  if (isLoading) return (
    <div className="card p-5 col-span-full">
      <div className="skeleton h-6 w-48 mb-4" />
      <div className="skeleton h-24 w-full" />
    </div>
  );

  const fearGreed = breadth?.fear_greed_score ?? summary?.fearGreedScore ?? 50;
  const sentiment = breadth?.sentiment ?? summary?.marketSentiment ?? 'neutral';
  const advance = breadth?.advance ?? summary?.breadthAdvance ?? 0;
  const decline = breadth?.decline ?? summary?.breadthDecline ?? 0;
  const unchanged = breadth?.unchanged ?? summary?.breadthUnchanged ?? 0;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Market Overview</h3>
          {summary?.marketDate && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(summary.marketDate), 'dd MMM yyyy')}</p>
          )}
        </div>
        <SentimentBadge sentiment={sentiment} score={Math.round(fearGreed)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fear/Greed Gauge */}
        <div className="flex justify-center">
          <FearGreedGauge score={Math.round(fearGreed)} sentiment={sentiment} />
        </div>

        {/* Breadth */}
        <div className="flex flex-col justify-center gap-3">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Market Breadth</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400"><TrendingUp className="w-3.5 h-3.5" /> Advances</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{advance}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"><TrendingDown className="w-3.5 h-3.5" /> Declines</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{decline}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><Minus className="w-3.5 h-3.5" /> Unchanged</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">{unchanged}</span>
            </div>
          </div>
          {(advance + decline) > 0 && (
            <div className="mt-1">
              <div className="h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div className="bg-green-500" style={{ width: `${(advance / (advance + decline + unchanged)) * 100}%` }} />
                  <div className="bg-red-500" style={{ width: `${(decline / (advance + decline + unchanged)) * 100}%` }} />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{Math.round((advance / (advance + decline + unchanged)) * 100)}% adv</span>
                <span>{Math.round((decline / (advance + decline + unchanged)) * 100)}% dec</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div className="flex flex-col justify-center">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">AI Analysis</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-5">
            {summary?.generatedSummary || 'No AI summary available. Run data ingestion to generate insights.'}
          </p>
          {summary?.generatedSummary && (
            <p className="text-xs text-gray-400 italic mt-2">Not financial advice.</p>
          )}
        </div>
      </div>
    </div>
  );
}
