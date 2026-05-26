'use client';
import { useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import { useAiSignals } from '@/hooks/useMarketData';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

export default function AiSignalsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const { data, isLoading } = useAiSignals({ page, limit, search, date: date || undefined });

  const columns = [
    {
      key: 'symbol', header: 'Symbol', sortable: true,
      render: (v: any) => <span className="font-bold text-gray-900 dark:text-white">{v}</span>
    },
    {
      key: 'trend', header: 'Trend',
      render: (v: any) => {
        const isBull = v?.includes('bullish');
        const isBear = v?.includes('bearish');
        return (
          <span className={clsx('flex items-center gap-1.5 font-medium text-sm capitalize',
            isBull ? 'text-green-600 dark:text-green-400' : isBear ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
          )}>
            {isBull ? <TrendingUp className="w-4 h-4" /> : isBear ? <TrendingDown className="w-4 h-4" /> : null}
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
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full', n > 70 ? 'bg-green-500' : n > 40 ? 'bg-yellow-500' : 'bg-red-500')}
                style={{ width: `${n}%` }} />
            </div>
            <span className="text-xs font-mono font-semibold">{n.toFixed(0)}</span>
          </div>
        );
      }
    },
    {
      key: 'breakoutProbability', header: 'Breakout %', sortable: true,
      render: (v: any) => v ? (
        <span className={clsx('font-semibold', Number(v) > 70 ? 'text-green-600 dark:text-green-400' : Number(v) > 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500')}>
          {Number(v).toFixed(0)}%
        </span>
      ) : '—'
    },
    {
      key: 'rsi', header: 'RSI',
      render: (v: any) => {
        if (!v) return '—';
        const n = Number(v);
        return <span className={clsx('font-mono font-semibold',
          n > 70 ? 'text-red-500' : n < 30 ? 'text-green-500' : 'text-gray-600 dark:text-gray-300'
        )}>{n.toFixed(1)}</span>;
      }
    },
    {
      key: 'predictedDirection', header: 'Prediction',
      render: (v: any) => {
        if (!v) return '—';
        return <span className={clsx('badge text-xs',
          v === 'up' ? 'badge-green' : v === 'down' ? 'badge-red' : 'badge-gray'
        )}>{v === 'up' ? '▲ UP' : v === 'down' ? '▼ DOWN' : '→ SIDEWAYS'}</span>;
      }
    },
    {
      key: 'aiConfidence', header: 'Confidence',
      render: (v: any) => v ? <span className="font-semibold text-primary-600 dark:text-primary-400">{Number(v).toFixed(0)}%</span> : '—'
    },
    {
      key: 'patterns', header: 'Patterns',
      render: (v: any) => {
        if (!v?.length) return <span className="text-gray-400 text-xs">—</span>;
        return <div className="flex flex-wrap gap-1">{(Array.isArray(v) ? v : []).slice(0, 2).map((p: string) =>
          <span key={p} className="badge badge-blue text-xs">{p.replace(/_/g, ' ')}</span>
        )}</div>;
      }
    },
    {
      key: 'aiSummary', header: 'AI Summary',
      render: (v: any) => <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate block" title={v}>{v || '—'}</span>
    },
    {
      key: 'marketDate', header: 'Date',
      render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN') : '—'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Signals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">High-probability trading signals from AI analysis</p>
        </div>
      </div>

      <div className="card p-3 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30">
        <p className="text-xs text-yellow-800 dark:text-yellow-400">
          ⚠️ <strong>Disclaimer:</strong> AI signals are probabilistic and based on historical data patterns. These are NOT financial advice. Always do your own research before trading.
        </p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 text-sm w-auto" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Latest</button>
      </div>

      <DataTable
        columns={columns as any}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        loading={isLoading}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearchChange={setSearch}
        title="AI Trading Signals"
        description={`${data?.total ?? 0} signals with high breakout probability or momentum`}
      />
    </div>
  );
}
