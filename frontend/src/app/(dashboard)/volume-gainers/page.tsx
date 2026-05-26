'use client';
import { useState, useCallback } from 'react';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import MarketFilter, { EMPTY_MARKET_FILTERS, buildMarketParams, type MarketFilters } from '@/components/ui/MarketFilter';
import { useVolumeGainers } from '@/hooks/useMarketData';
import { marketApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart2 } from 'lucide-react';

// NSE /api/live-analysis-volume-gainers only provides ltp, pChange, volume,
// turnover, week1AvgVolume, week1volChange — OHLC and prevClose are not in
// this endpoint, so those columns are excluded.
const COLUMNS = [
  { key: 'symbol', header: 'Symbol', sortable: true, render: (v: any) => <span className="font-bold text-gray-900 dark:text-white tracking-wide">{v || '—'}</span> },
  { key: 'series', header: 'Series', sortable: true, render: (v: any) => v ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{v}</span> : '—' },
  { key: 'ltp', header: 'LTP (₹)', sortable: true, render: (v: any) => v != null ? <span className="font-mono font-semibold">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'pctChng', header: '% Chng', sortable: true, render: (v: any) => <PriceChange value={v} /> },
  { key: 'volume', header: 'Volume', sortable: true, render: (v: any) => <span className="font-semibold text-blue-600 dark:text-blue-400">{formatVolume(v)}</span> },
  { key: 'prevVolume', header: '1W Avg Vol', sortable: true, render: (v: any) => formatVolume(v) },
  {
    key: 'volumeRatio',
    header: 'Vol Surge',
    sortable: true,
    render: (v: any) => {
      if (!v) return '—';
      const n = Number(v);
      const color = n >= 5 ? 'text-red-600 dark:text-red-400' : n >= 2 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400';
      return <span className={`font-bold ${color}`}>{n.toFixed(2)}x</span>;
    },
  },
  { key: 'value', header: 'Turnover (₹ Cr)', sortable: true, render: (v: any) => { const r = Number(v); if (!v || r === 0) return '—'; if (r >= 1e9) return `₹${(r/1e9).toFixed(2)}K Cr`; if (r >= 1e7) return `₹${(r/1e7).toFixed(2)} Cr`; if (r >= 1e5) return `₹${(r/1e5).toFixed(2)} L`; return `₹${r.toFixed(2)}`; } },
  { key: 'sourceDate', header: 'Date', sortable: true, render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
];

export default function VolumeGainersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('volume');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [filters, setFilters] = useState<MarketFilters>(EMPTY_MARKET_FILTERS);

  const params = buildMarketParams(filters, page, limit, search, sortBy, sortOrder);
  const { data, isLoading } = useVolumeGainers(params);

  const handleFilter = useCallback(<K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleExport = async () => {
    const d = filters.date || filters.startDate;
    if (!d) { toast.error('Select a date to export'); return; }
    try {
      const res = await marketApi.exportCsv('volume_gainers', d);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `volume_gainers_${d}.csv`; a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center"><BarChart2 className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Volume Gainers</h1><p className="text-sm text-gray-500">Stocks with unusual volume surge</p></div>
      </div>
      <MarketFilter filters={filters} onChange={handleFilter} onClear={() => { setFilters(EMPTY_MARKET_FILTERS); setPage(1); }} />
      <DataTable columns={COLUMNS as any} data={data?.data ?? []} total={data?.total ?? 0}
        page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={l => { setLimit(l); setPage(1); }}
        onSortChange={(k, o) => { setSortBy(k); setSortOrder(o); }}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onExport={handleExport}
        title="Volume Gainers" description={`${(data?.total ?? 0).toLocaleString('en-IN')} stocks`} />
    </div>
  );
}
