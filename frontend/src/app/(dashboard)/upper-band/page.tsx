'use client';
import { useState, useCallback } from 'react';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import MarketFilter, { EMPTY_MARKET_FILTERS, buildMarketParams, type MarketFilters } from '@/components/ui/MarketFilter';
import PageHeader from '@/components/layout/PageHeader';
import { useUpperBandHitters } from '@/hooks/useMarketData';
import { marketApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';

const COLUMNS = [
  { key: 'symbol', header: 'Symbol', sortable: true, render: (v: any) => <span className="font-bold tracking-wide text-slate-900 dark:text-white">{v || '—'}</span> },
  { key: 'series', header: 'Series', sortable: true, render: (v: any) => v ? <span className="badge badge-green">{v}</span> : '—' },
  { key: 'ltp', header: 'LTP (₹)', sortable: true, render: (v: any) => v != null ? <span className="font-mono font-semibold tabular-nums">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'openPrice', header: 'Open (₹)', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'highPrice', header: 'High (₹)', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'lowPrice', header: 'Low (₹)', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-rose-500 dark:text-rose-400">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'prevClose', header: 'Prev Close', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'chng', header: 'Chng (₹)', sortable: true, render: (v: any) => { if (v == null) return '—'; const n = Number(v); return <span className={`font-mono font-semibold tabular-nums ${n >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>{n >= 0 ? '+' : ''}₹{n.toFixed(2)}</span>; } },
  { key: 'pctChng', header: '%Chng', sortable: true, render: (v: any) => <PriceChange value={v} /> },
  { key: 'upperBand', header: 'Upper Band', sortable: true, render: (v: any) => v != null ? <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'volume', header: 'Volume', sortable: true, render: (v: any) => <span className="font-mono tabular-nums">{formatVolume(v)}</span> },
  { key: 'value', header: 'Value (₹ Cr)', sortable: true, render: (v: any) => { const r = Number(v); if (!v || r === 0) return '—'; if (r >= 1e9) return `₹${(r/1e9).toFixed(2)}K Cr`; if (r >= 1e7) return `₹${(r/1e7).toFixed(2)} Cr`; if (r >= 1e5) return `₹${(r/1e5).toFixed(2)} L`; return `₹${r.toFixed(2)}`; } },
  { key: 'week52High', header: '52W High', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'week52Low', header: '52W Low', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'sourceDate', header: 'Date', sortable: true, render: (v: any) => v ? <span className="font-mono text-xs tabular-nums">{new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span> : '—' },
];

export default function UpperBandPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('sourceDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [filters, setFilters] = useState<MarketFilters>(EMPTY_MARKET_FILTERS);

  const params = buildMarketParams(filters, page, limit, search, sortBy, sortOrder);
  const { data, isLoading } = useUpperBandHitters(params);

  const handleFilter = useCallback(<K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleExport = async () => {
    const d = filters.date || filters.startDate;
    if (!d) { toast.error('Select a date to export'); return; }
    try {
      const res = await marketApi.exportCsv('upper_band_hitters', d);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `upper_band_${d}.csv`; a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Upper Band Hitters"
        description="Stocks hitting upper circuit breaker"
        accent="emerald"
      />
      <MarketFilter filters={filters} onChange={handleFilter} onClear={() => { setFilters(EMPTY_MARKET_FILTERS); setPage(1); }} />
      <DataTable columns={COLUMNS as any} data={data?.data ?? []} total={data?.total ?? 0}
        page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={l => { setLimit(l); setPage(1); }}
        onSortChange={(k, o) => { setSortBy(k); setSortOrder(o); }}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onExport={handleExport}
        title="Upper Band Hitters" description={`${(data?.total ?? 0).toLocaleString('en-IN')} stocks`} />
    </div>
  );
}
