'use client';
import { useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import PageHeader from '@/components/layout/PageHeader';
import { useAiStockInsights } from '@/hooks/useMarketData';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

function TrendIcon({ trend }: { trend: string }) {
  if (trend?.includes('bullish')) return <TrendingUp className="mr-1 inline h-4 w-4 text-emerald-500" strokeWidth={2.4} />;
  if (trend?.includes('bearish')) return <TrendingDown className="mr-1 inline h-4 w-4 text-rose-500" strokeWidth={2.4} />;
  return <Minus className="mr-1 inline h-4 w-4 text-slate-400" strokeWidth={2.4} />;
}

function Score({ value }: { value: number }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const gradient =
    value > 70 ? 'from-emerald-400 to-cyan-500' :
    value > 40 ? 'from-amber-400 to-orange-500' :
                 'from-rose-400 to-pink-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200/40 dark:bg-white/[0.06]">
        <div className={clsx('h-full rounded-full bg-gradient-to-r', gradient)} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-xs font-semibold tabular-nums">{Number(value).toFixed(0)}</span>
    </div>
  );
}

export default function AiInsightsPage() {
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [date, setDate]     = useState('');
  const { data, isLoading } = useAiStockInsights({ page, limit, search, date: date || undefined });

  const columns = [
    { key: 'symbol', header: 'Symbol', sortable: true, render: (v: any) => <span className="font-bold text-slate-900 dark:text-white">{v}</span> },
    { key: 'trend', header: 'Trend', render: (v: any) => <span className="flex items-center text-sm capitalize"><TrendIcon trend={v} />{v?.replace('_', ' ') || '—'}</span> },
    { key: 'momentumScore', header: 'Momentum', render: (v: any) => <Score value={v} /> },
    { key: 'riskScore', header: 'Risk', render: (v: any) => <Score value={v} /> },
    { key: 'rsi', header: 'RSI', render: (v: any) => {
      if (!v) return '—';
      const n = Number(v);
      return <span className={clsx('font-mono font-semibold tabular-nums', n > 70 ? 'text-rose-500' : n < 30 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300')}>{n.toFixed(1)}</span>;
    }},
    { key: 'aiConfidence', header: 'Confidence', render: (v: any) => v ? <span className="font-mono font-bold tabular-nums text-cyan-600 dark:text-cyan-300">{Number(v).toFixed(0)}%</span> : '—' },
    { key: 'predictedDirection', header: 'Prediction', render: (v: any) => {
      if (!v) return '—';
      return <span className={clsx('badge', v === 'up' ? 'badge-green' : v === 'down' ? 'badge-red' : 'badge-gray')}>{v}</span>;
    }},
    { key: 'aiSummary', header: 'AI Summary', render: (v: any) => <span className="block max-w-xs truncate text-xs text-slate-500 dark:text-slate-400" title={v}>{v || '—'}</span> },
    { key: 'marketDate', header: 'Date', render: (v: any) => v ? <span className="font-mono text-xs tabular-nums">{new Date(v).toLocaleDateString('en-IN')}</span> : '—' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={Brain}
        title="AI Stock Insights"
        description="AI-generated stock analysis and scores"
        accent="violet"
      />
      <div className="card flex gap-3 p-4">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 w-auto text-sm" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Clear</button>
      </div>
      <DataTable
        columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0}
        page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit} onSearchChange={setSearch}
        title="AI Insights" description={`${data?.total ?? 0} insights generated`}
      />
    </div>
  );
}
