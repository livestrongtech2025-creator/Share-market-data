'use client';
import { useState, useCallback } from 'react';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import MarketFilter, { EMPTY_MARKET_FILTERS, buildMarketParams, type MarketFilters } from '@/components/ui/MarketFilter';
import { useMostActiveEquities } from '@/hooks/useMarketData';
import { marketApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Activity } from 'lucide-react';

const COLUMNS = [
  { key: 'symbol', header: 'Symbol', sortable: true, render: (v: any) => <span className="font-bold text-gray-900 dark:text-white tracking-wide">{v || '—'}</span> },
  { key: 'series', header: 'Series', sortable: true, render: (v: any) => v ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">{v}</span> : '—' },
  { key: 'ltp', header: 'LTP (₹)', sortable: true, render: (v: any) => v != null ? <span className="font-mono font-semibold">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'openPrice', header: 'Open (₹)', sortable: true, render: (v: any) => v != null ? `₹${Number(v).toFixed(2)}` : '—' },
  { key: 'highPrice', header: 'High (₹)', sortable: true, render: (v: any) => v != null ? <span className="text-green-600 dark:text-green-400 font-mono">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'lowPrice', header: 'Low (₹)', sortable: true, render: (v: any) => v != null ? <span className="text-red-600 dark:text-red-400 font-mono">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'prevClose', header: 'Prev Close', sortable: true, render: (v: any) => v != null ? `₹${Number(v).toFixed(2)}` : '—' },
  { key: 'chng', header: 'Chng (₹)', sortable: true, render: (v: any) => { if (v == null) return '—'; const n = Number(v); return <span className={n >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>{n >= 0 ? '+' : ''}₹{n.toFixed(2)}</span>; } },
  { key: 'pctChng', header: '%Chng', sortable: true, render: (v: any) => <PriceChange value={v} /> },
  { key: 'volume', header: 'Volume', sortable: true, render: (v: any) => formatVolume(v) },
  { key: 'value', header: 'Turnover (₹ Cr)', sortable: true, render: (v: any) => { const r = Number(v); if (!v || r === 0) return '—'; if (r >= 1e9) return `₹${(r/1e9).toFixed(2)}K Cr`; if (r >= 1e7) return `₹${(r/1e7).toFixed(2)} Cr`; if (r >= 1e5) return `₹${(r/1e5).toFixed(2)} L`; return `₹${r.toFixed(2)}`; } },
  { key: 'trades', header: 'No. of Trades', sortable: true, render: (v: any) => v ? Number(v).toLocaleString('en-IN') : '—' },
  { key: 'sourceDate', header: 'Date', sortable: true, render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
];

export default function MostActivePage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('value');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [filters, setFilters] = useState<MarketFilters>(EMPTY_MARKET_FILTERS);

  const params = buildMarketParams(filters, page, limit, search, sortBy, sortOrder);
  const { data, isLoading } = useMostActiveEquities(params);

  const handleFilter = useCallback(<K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleExport = async () => {
    const d = filters.date || filters.startDate;
    if (!d) { toast.error('Select a date to export'); return; }
    try {
      const res = await marketApi.exportCsv('most_active_equities', d);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `most_active_${d}.csv`; a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Most Active Equities</h1><p className="text-sm text-gray-500">Highest traded by value</p></div>
      </div>
      <MarketFilter filters={filters} onChange={handleFilter} onClear={() => { setFilters(EMPTY_MARKET_FILTERS); setPage(1); }} />
      <DataTable columns={COLUMNS as any} data={data?.data ?? []} total={data?.total ?? 0}
        page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={l => { setLimit(l); setPage(1); }}
        onSortChange={(k, o) => { setSortBy(k); setSortOrder(o); }}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onExport={handleExport}
        title="Most Active Equities" description={`${(data?.total ?? 0).toLocaleString('en-IN')} stocks`} />
    </div>
  );
}
