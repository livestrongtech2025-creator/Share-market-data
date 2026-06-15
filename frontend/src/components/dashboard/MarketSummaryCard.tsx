'use client';
import { useAiMarketSummary, useMarketBreadth } from '@/hooks/useMarketData';
import SentimentBadge from '@/components/ui/SentimentBadge';
import FearGreedGauge from '@/components/charts/FearGreedGauge';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

export default function MarketSummaryCard() {
  const { data: summary, isLoading } = useAiMarketSummary();
  const { data: breadth } = useMarketBreadth();

  if (isLoading) return (
    <div className="card col-span-full p-5">
      <div className="skeleton mb-4 h-6 w-48" />
      <div className="skeleton h-24 w-full" />
    </div>
  );

  const fearGreed = breadth?.fear_greed_score ?? summary?.fearGreedScore ?? 50;
  const sentiment = breadth?.sentiment ?? summary?.marketSentiment ?? 'neutral';
  const advance = breadth?.advance ?? summary?.breadthAdvance ?? 0;
  const decline = breadth?.decline ?? summary?.breadthDecline ?? 0;
  const unchanged = breadth?.unchanged ?? summary?.breadthUnchanged ?? 0;
  const total = advance + decline + unchanged;

  return (
    <div className="card relative overflow-hidden p-5">
      <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Market Pulse
          </h3>
          {summary?.marketDate && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {format(new Date(summary.marketDate), 'EEEE, dd MMM yyyy')}
            </p>
          )}
        </div>
        <SentimentBadge sentiment={sentiment} score={Math.round(fearGreed)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Fear/Greed Gauge */}
        <div className="flex justify-center">
          <FearGreedGauge score={Math.round(fearGreed)} sentiment={sentiment} />
        </div>

        {/* Breadth */}
        <div className="flex flex-col justify-center gap-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Market Breadth
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} /> Advances
              </span>
              <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{advance}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-rose-500 dark:text-rose-400">
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.4} /> Declines
              </span>
              <span className="font-mono font-bold tabular-nums text-rose-500 dark:text-rose-400">{decline}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Minus className="h-3.5 w-3.5" strokeWidth={2.4} /> Unchanged
              </span>
              <span className="font-mono font-bold tabular-nums text-slate-500 dark:text-slate-400">{unchanged}</span>
            </div>
          </div>
          {total > 0 && (
            <div className="mt-1">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/50 dark:bg-white/[0.06]">
                <div className="flex h-full">
                  <div className="bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500" style={{ width: `${(advance / total) * 100}%` }} />
                  <div className="bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500" style={{ width: `${(decline / total) * 100}%` }} />
                </div>
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-slate-400">
                <span>{Math.round((advance / total) * 100)}% adv</span>
                <span>{Math.round((decline / total) * 100)}% dec</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div className="flex flex-col justify-center">
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            AI Analysis
          </h4>
          <p className="line-clamp-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {summary?.generatedSummary || 'No AI summary available. Run data ingestion to generate insights.'}
          </p>
          {summary?.generatedSummary && (
            <p className="mt-2 text-[11px] italic text-slate-400">Not financial advice.</p>
          )}
        </div>
      </div>
    </div>
  );
}
