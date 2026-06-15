'use client';
import { useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import PageHeader from '@/components/layout/PageHeader';
import { useAiSignals } from '@/hooks/useMarketData';
import { Zap, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export default function AiSignalsPage() {
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [date, setDate]     = useState('');
  const { data, isLoading } = useAiSignals({ page, limit, search, date: date || undefined });

  const columns = [
    {
      key: 'symbol', header: 'Symbol', sortable: true,
      render: (v: any) => <span className="font-bold text-slate-900 dark:text-white">{v}</span>
    },
    {
      key: 'trend', header: 'Trend',
      render: (v: any) => {
        const isBull = v?.includes('bullish');
        const isBear = v?.includes('bearish');
        return (
          <span className={clsx('flex items-center gap-1.5 text-sm font-medium capitalize',
            isBull ? 'text-emerald-600 dark:text-emerald-400' : isBear ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500'
          )}>
            {isBull ? <TrendingUp className="h-4 w-4" strokeWidth={2.4} /> : isBear ? <TrendingDown className="h-4 w-4" strokeWidth={2.4} /> : null}
            {v?.replace(/_/g, ' ') || '—'}
          </span>
        );
      }
    },
    {
      key: 'momentumScore', header: 'Momentum', sortable: true,
      render: (v: any) => {
        if (!v) return '—';
        const n = Number(v);
        const gradient = n > 70 ? 'from-emerald-400 to-cyan-500' : n > 40 ? 'from-amber-400 to-orange-500' : 'from-rose-400 to-pink-500';
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200/40 dark:bg-white/[0.06]">
              <div className={clsx('h-full rounded-full bg-gradient-to-r', gradient)} style={{ width: `${n}%` }} />
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums">{n.toFixed(0)}</span>
          </div>
        );
      }
    },
    {
      key: 'breakoutProbability', header: 'Breakout %', sortable: true,
      render: (v: any) => v ? (
        <span className={clsx('font-mono font-bold tabular-nums', Number(v) > 70 ? 'text-emerald-600 dark:text-emerald-400' : Number(v) > 50 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500')}>
          {Number(v).toFixed(0)}%
        </span>
      ) : '—'
    },
    {
      key: 'rsi', header: 'RSI',
      render: (v: any) => {
        if (!v) return '—';
        const n = Number(v);
        return <span className={clsx('font-mono font-semibold tabular-nums', n > 70 ? 'text-rose-500' : n < 30 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300')}>{n.toFixed(1)}</span>;
      }
    },
    {
      key: 'predictedDirection', header: 'Prediction',
      render: (v: any) => {
        if (!v) return '—';
        return <span className={clsx('badge', v === 'up' ? 'badge-green' : v === 'down' ? 'badge-red' : 'badge-gray')}>
          {v === 'up' ? '▲ UP' : v === 'down' ? '▼ DOWN' : '→ SIDEWAYS'}
        </span>;
      }
    },
    {
      key: 'aiConfidence', header: 'Confidence',
      render: (v: any) => v ? <span className="font-mono font-bold tabular-nums text-cyan-600 dark:text-cyan-300">{Number(v).toFixed(0)}%</span> : '—'
    },
    {
      key: 'patterns', header: 'Patterns',
      render: (v: any) => {
        if (!v?.length) return <span className="text-xs text-slate-400">—</span>;
        return <div className="flex flex-wrap gap-1">{(Array.isArray(v) ? v : []).slice(0, 2).map((p: string) =>
          <span key={p} className="badge badge-blue">{p.replace(/_/g, ' ')}</span>
        )}</div>;
      }
    },
    {
      key: 'aiSummary', header: 'AI Summary',
      render: (v: any) => <span className="block max-w-xs truncate text-xs text-slate-500 dark:text-slate-400" title={v}>{v || '—'}</span>
    },
    {
      key: 'marketDate', header: 'Date',
      render: (v: any) => v ? <span className="font-mono text-xs tabular-nums">{new Date(v).toLocaleDateString('en-IN')}</span> : '—'
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={Zap}
        title="AI Signals"
        description="High-probability trading signals from AI analysis"
        accent="amber"
      />

      {/* Disclaimer */}
      <div className="card relative overflow-hidden border-amber-500/20 bg-amber-500/[0.05] p-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Disclaimer:</strong> AI signals are probabilistic and based on historical data patterns.
            These are NOT financial advice. Always do your own research before trading.
          </p>
        </div>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 w-auto text-sm" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Latest</button>
      </div>

      <DataTable
        columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0}
        page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit} onSearchChange={setSearch}
        title="AI Trading Signals"
        description={`${data?.total ?? 0} signals with high breakout probability or momentum`}
      />
    </div>
  );
}
