'use client';
import { useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import SentimentBadge from '@/components/ui/SentimentBadge';
import { useAiStockInsights } from '@/hooks/useMarketData';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

function TrendIcon({ trend }: { trend: string }) {
  if (trend?.includes('bullish')) return <TrendingUp className="w-4 h-4 text-green-500 inline mr-1" />;
  if (trend?.includes('bearish')) return <TrendingDown className="w-4 h-4 text-red-500 inline mr-1" />;
  return <Minus className="w-4 h-4 text-gray-400 inline mr-1" />;
}

function Score({ value }: { value: number }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const color = value > 70 ? 'bg-green-500' : value > 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono">{Number(value).toFixed(0)}</span>
    </div>
  );
}

export default function AiInsightsPage() {
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState(''); const [date, setDate] = useState('');
  const { data, isLoading } = useAiStockInsights({ page, limit, search, date: date || undefined });

  const columns = [
    { key: 'symbol', header: 'Symbol', sortable: true, render: (v: any) => <span className="font-bold text-gray-900 dark:text-white">{v}</span> },
    { key: 'trend', header: 'Trend', render: (v: any) => <span className="flex items-center text-sm capitalize"><TrendIcon trend={v} />{v?.replace('_', ' ') || '—'}</span> },
    { key: 'momentumScore', header: 'Momentum', render: (v: any) => <Score value={v} /> },
    { key: 'riskScore', header: 'Risk', render: (v: any) => <Score value={v} /> },
    { key: 'rsi', header: 'RSI', render: (v: any) => {
      if (!v) return '—';
      const n = Number(v);
      return <span className={clsx('font-mono font-semibold', n > 70 ? 'text-red-500' : n < 30 ? 'text-green-500' : 'text-gray-600 dark:text-gray-300')}>{n.toFixed(1)}</span>;
    }},
    { key: 'aiConfidence', header: 'Confidence', render: (v: any) => v ? <span className="font-semibold text-primary-600 dark:text-primary-400">{Number(v).toFixed(0)}%</span> : '—' },
    { key: 'predictedDirection', header: 'Prediction', render: (v: any) => {
      if (!v) return '—';
      return <span className={clsx('badge text-xs', v === 'up' ? 'badge-green' : v === 'down' ? 'badge-red' : 'badge-gray')}>{v}</span>;
    }},
    { key: 'aiSummary', header: 'AI Summary', render: (v: any) => <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate block" title={v}>{v || '—'}</span> },
    { key: 'marketDate', header: 'Date', render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center"><Brain className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Stock Insights</h1><p className="text-sm text-gray-500">AI-generated stock analysis and scores</p></div>
      </div>
      <div className="card p-4 flex gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 text-sm w-auto" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Clear</button>
      </div>
      <DataTable columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit} onSearchChange={setSearch} title="AI Insights" description={`${data?.total ?? 0} insights generated`} />
    </div>
  );
}
