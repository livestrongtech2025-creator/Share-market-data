'use client';
import { useState, useCallback } from 'react';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import MarketFilter, { EMPTY_MARKET_FILTERS, buildMarketParams, type MarketFilters } from '@/components/ui/MarketFilter';
import PageHeader from '@/components/layout/PageHeader';
import { useLowerBandHitters } from '@/hooks/useMarketData';
import { marketApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { TrendingDown } from 'lucide-react';

const COLUMNS = [
  { key: 'symbol', header: 'Symbol', sortable: true, render: (v: any) => <span className="font-bold tracking-wide text-slate-900 dark:text-white">{v || '—'}</span> },
  { key: 'series', header: 'Series', sortable: true, render: (v: any) => v ? <span className="badge badge-red">{v}</span> : '—' },
  { key: 'ltp', header: 'LTP (₹)', sortable: true, render: (v: any) => v != null ? <span className="font-mono font-semibold tabular-nums">₹{Number(v).toFixed(2)}</span> : '—' },
  { key: 'pctChng', header: '%CHNG', sortable: true, render: (v: any) => <PriceChange value={v} /> },
  { key: 'priceBandPct', header: 'Price Band %', sortable: false, render: (_v: any, row: any) => { const pb = row?.rawJson?.priceBand ?? row?.rawJson?.price_band; if (pb == null || pb === '' || pb === '-') return '—'; const n = Number(pb); return <span className="font-mono tabular-nums">{isNaN(n) ? String(pb) : `${n}%`}</span>; } },
  { key: 'volume', header: 'Volume', sortable: true, render: (v: any) => <span className="font-mono tabular-nums">{formatVolume(v)}</span> },
  { key: 'value', header: 'Value (₹ Cr)', sortable: true, render: (v: any) => { const r = Number(v); if (!v || r === 0) return '—'; if (r >= 1e9) return `₹${(r/1e9).toFixed(2)}K Cr`; if (r >= 1e7) return `₹${(r/1e7).toFixed(2)} Cr`; if (r >= 1e5) return `₹${(r/1e5).toFixed(2)} L`; return `₹${r.toFixed(2)}`; } },
  { key: 'sourceDate', header: 'Date', sortable: true, render: (v: any) => v ? <span className="font-mono text-xs tabular-nums">{new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span> : '—' },
];

export default function LowerBandPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('sourceDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [filters, setFilters] = useState<MarketFilters>(EMPTY_MARKET_FILTERS);

  const params = buildMarketParams(filters, page, limit, search, sortBy, sortOrder);
  const { data, isLoading } = useLowerBandHitters(params);

  const handleFilter = useCallback(<K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleExport = async () => {
    const d = filters.date || filters.startDate;
    if (!d) { toast.error('Select a date to export'); return; }
    try {
      const res = await marketApi.exportCsv('lower_band_hitters', d);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `lower_band_${d}.csv`; a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={TrendingDown}
        title="Lower Band Hitters"
        description="Stocks hitting lower circuit breaker"
        accent="rose"
      />
      <MarketFilter
        filters={filters}
        onChange={handleFilter}
        onClear={() => { setFilters(EMPTY_MARKET_FILTERS); setSearch(''); setPage(1); }}
        showSeriesFilter={false}
        showPriceFilter={false}
        showVolumeFilter={false}
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
      />
      <DataTable columns={COLUMNS as any} data={data?.data ?? []} total={data?.total ?? 0}
        page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={l => { setLimit(l); setPage(1); }}
        onSortChange={(k, o) => { setSortBy(k); setSortOrder(o); }}
        onExport={handleExport}
        title="Lower Band Hitters" description={`${(data?.total ?? 0).toLocaleString('en-IN')} stocks`} />
    </div>
  );
}
