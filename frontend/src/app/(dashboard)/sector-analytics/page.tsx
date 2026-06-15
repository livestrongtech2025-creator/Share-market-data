'use client';
import { useState } from 'react';
import SectorHeatmap from '@/components/charts/SectorHeatmap';
import PageHeader from '@/components/layout/PageHeader';
import { useSectorAnalysis } from '@/hooks/useMarketData';
import { PieChart, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export default function SectorAnalyticsPage() {
  const [date, setDate] = useState('');
  const { data, isLoading } = useSectorAnalysis(date || undefined);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={PieChart}
        title="Sector Analytics"
        description="Sector-level market performance"
        accent="teal"
      />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 w-auto text-sm" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Latest</button>
        {data?.date && (
          <span className="ml-auto font-mono text-xs text-slate-500 dark:text-slate-400">
            Data: {new Date(data.date).toLocaleDateString('en-IN')}
          </span>
        )}
      </div>

      <div className="card relative overflow-hidden p-5">
        <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          Sector Heatmap
        </h3>
        <SectorHeatmap data={data?.sectors ?? []} loading={isLoading} />
      </div>

      {data?.sectors && (
        <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.sectors.map((s: any) => (
            <div key={s.sector} className="card card-interactive p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  {s.sector}
                </h4>
                <span className={clsx('font-mono text-lg font-extrabold tabular-nums',
                  s.avg_change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
                )}>
                  {s.avg_change >= 0 ? '+' : ''}{s.avg_change?.toFixed(2)}%
                </span>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{s.stock_count} stocks tracked</p>
              <div className="space-y-1.5">
                {(s.stocks || []).slice(0, 4).map((stock: any) => (
                  <div key={stock.symbol} className="flex justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{stock.symbol}</span>
                    <span className={clsx('font-mono tabular-nums',
                      stock.pct_change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
                    )}>
                      {stock.pct_change >= 0 ? '+' : ''}{stock.pct_change?.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
