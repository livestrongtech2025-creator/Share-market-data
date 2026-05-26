'use client';
import { useState } from 'react';
import SectorHeatmap from '@/components/charts/SectorHeatmap';
import { useSectorAnalysis } from '@/hooks/useMarketData';
import { PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

export default function SectorAnalyticsPage() {
  const [date, setDate] = useState('');
  const { data, isLoading } = useSectorAnalysis(date || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center"><PieChart className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sector Analytics</h1><p className="text-sm text-gray-500">Sector-level market performance</p></div>
      </div>
      <div className="card p-4 flex gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 text-sm w-auto" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Latest</button>
      </div>
      {data?.date && <p className="text-xs text-gray-400">Data for: {new Date(data.date).toLocaleDateString('en-IN')}</p>}

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sector Heatmap</h3>
        <SectorHeatmap data={data?.sectors ?? []} loading={isLoading} />
      </div>

      {data?.sectors && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.sectors.map((s: any) => (
            <div key={s.sector} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">{s.sector}</h4>
                <span className={clsx('text-lg font-bold', s.avg_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                  {s.avg_change >= 0 ? '+' : ''}{s.avg_change?.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{s.stock_count} stocks tracked</p>
              <div className="space-y-1">
                {(s.stocks || []).slice(0, 4).map((stock: any) => (
                  <div key={stock.symbol} className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{stock.symbol}</span>
                    <span className={clsx('font-mono', stock.pct_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
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
