'use client';
import { useState, useEffect, useCallback } from 'react';
import DataTable, { formatVolume } from '@/components/ui/DataTable';
import PageHeader from '@/components/layout/PageHeader';
import { useBhavCopy, useBhavCopySeries } from '@/hooks/useMarketData';
import { marketApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Database, Filter, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import clsx from 'clsx';

interface Filters {
  dateMode: 'single' | 'range';
  date: string;
  startDate: string;
  endDate: string;
  series: string;
}

const EMPTY_FILTERS: Filters = {
  dateMode: 'single', date: '', startDate: '', endDate: '', series: '',
};

function buildQueryParams(filters: Filters, page: number, limit: number, search: string) {
  const p: Record<string, any> = { page, limit };
  if (search) p.search = search;
  if (filters.dateMode === 'single' && filters.date) p.date = filters.date;
  else if (filters.dateMode === 'range' && filters.startDate && filters.endDate) {
    p.startDate = filters.startDate;
    p.endDate = filters.endDate;
  }
  if (filters.series) p.series = filters.series;
  return p;
}

function countActiveFilters(f: Filters, search: string): number {
  return [
    f.dateMode === 'single' ? f.date : (f.startDate || f.endDate),
    f.series, search,
  ].filter(Boolean).length;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
      {label}
      <button onClick={onRemove} className="transition-colors hover:text-rose-500">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default function BhavCopyPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('sourceDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(true);

  const params = { ...buildQueryParams(filters, page, limit, search), sortBy, sortOrder };
  const { data, isLoading } = useBhavCopy(params);
  const { data: seriesList } = useBhavCopySeries();

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearchInput('');
    setSearch('');
    setPage(1);
  }, []);

  const handleExport = async () => {
    const exportDate = filters.date || filters.startDate;
    if (!exportDate) { toast.error('Select a date to export'); return; }
    try {
      const res = await marketApi.exportCsv('bhav_copy', exportDate);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bhav_copy_${exportDate}.csv`;
      a.click();
    } catch { toast.error('Export failed'); }
  };

  const activeCount = countActiveFilters(filters, search);

  const columns = [
    { key: 'symbol', header: 'Symbol', sortable: true, render: (v: any) => <span className="font-bold tracking-wide text-slate-900 dark:text-white">{v || '—'}</span> },
    { key: 'series', header: 'Series', sortable: true, render: (v: any) => v ? <span className="badge badge-violet">{v}</span> : '—' },
    { key: 'sourceDate', header: 'Date', sortable: true, render: (v: any) => v ? <span className="font-mono text-xs tabular-nums">{new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span> : '—' },
    { key: 'prevClose', header: 'Prev Close', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">₹{Number(v).toFixed(2)}</span> : '—' },
    { key: 'openPrice', header: 'Open', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums">₹{Number(v).toFixed(2)}</span> : '—' },
    { key: 'highPrice', header: 'High', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">₹{Number(v).toFixed(2)}</span> : '—' },
    { key: 'lowPrice', header: 'Low', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-rose-500 dark:text-rose-400">₹{Number(v).toFixed(2)}</span> : '—' },
    { key: 'lastPrice', header: 'Last', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums">₹{Number(v).toFixed(2)}</span> : '—' },
    { key: 'closePrice', header: 'Close', sortable: true, render: (v: any) => v != null ? <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">₹{Number(v).toFixed(2)}</span> : '—' },
    { key: 'avgPrice', header: 'Avg Price', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">₹{Number(v).toFixed(2)}</span> : '—' },
    { key: 'totalTradedQty', header: 'Volume', sortable: true, render: (v: any) => <span className="font-mono tabular-nums">{formatVolume(v)}</span> },
    {
      key: 'totalTradedValue', header: 'Turnover (₹ Cr)', sortable: true,
      render: (v: any) => {
        if (!v) return '—';
        const cr = Number(v) / 100;
        if (cr >= 1000) return <span className="font-mono tabular-nums">₹{(cr / 1000).toFixed(2)}K Cr</span>;
        return <span className="font-mono tabular-nums">₹{cr.toFixed(2)} Cr</span>;
      },
    },
    { key: 'totalTrades', header: 'Trades', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">{Number(v).toLocaleString('en-IN')}</span> : '—' },
    { key: 'delivQty', header: 'Deliv Qty', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums">{Number(v).toLocaleString('en-IN')}</span> : '—' },
    { key: 'delivPer', header: 'Deliv %', sortable: true, render: (v: any) => v != null ? <span className="font-mono tabular-nums">{Number(v).toFixed(2)}%</span> : '—' },
    { key: 'isin', header: 'ISIN', render: (v: any) => v ? <span className="font-mono text-xs text-slate-400">{v}</span> : '—' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={Database}
        title="Bhav Copy"
        description="Daily NSE equity price snapshot"
        accent="indigo"
      />

      {/* Filter Panel */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4 dark:border-white/[0.06]">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 transition-colors hover:text-cyan-500 dark:text-slate-200 dark:hover:text-cyan-300"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-[10px] font-bold text-white shadow-glow-cyan">
                {activeCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="ml-1 h-4 w-4 opacity-50" /> : <ChevronDown className="ml-1 h-4 w-4 opacity-50" />}
          </button>
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
            >
              <X className="h-3.5 w-3.5" />
              Clear All Filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex overflow-hidden rounded-xl border border-white/10 text-xs font-semibold dark:border-white/10">
                <button
                  onClick={() => setFilter('dateMode', 'single')}
                  className={clsx('px-3 py-1.5 transition-all',
                    filters.dateMode === 'single'
                      ? 'bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-glow-cyan'
                      : 'text-slate-600 hover:bg-cyan-500/10 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300')}
                >Single Date</button>
                <button
                  onClick={() => setFilter('dateMode', 'range')}
                  className={clsx('px-3 py-1.5 transition-all',
                    filters.dateMode === 'range'
                      ? 'bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-glow-cyan'
                      : 'text-slate-600 hover:bg-cyan-500/10 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300')}
                >Date Range</button>
              </div>

              {filters.dateMode === 'single' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label>
                  <input type="date" value={filters.date} onChange={e => setFilter('date', e.target.value)} className="input h-9 w-40 text-sm" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">From Date</label>
                    <input type="date" value={filters.startDate} onChange={e => setFilter('startDate', e.target.value)} className="input h-9 w-40 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">To Date</label>
                    <input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={e => setFilter('endDate', e.target.value)} className="input h-9 w-40 text-sm" />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Series</label>
                <select value={filters.series} onChange={e => setFilter('series', e.target.value)} className="input h-9 w-28 text-sm">
                  <option value="">All Series</option>
                  {(seriesList ?? []).map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Symbol..."
                    className="input h-9 w-48 pl-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {activeCount > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {filters.dateMode === 'single' && filters.date && <FilterChip label={`Date: ${filters.date}`} onRemove={() => setFilter('date', '')} />}
                {filters.dateMode === 'range' && filters.startDate && <FilterChip label={`From: ${filters.startDate}`} onRemove={() => setFilter('startDate', '')} />}
                {filters.dateMode === 'range' && filters.endDate && <FilterChip label={`To: ${filters.endDate}`} onRemove={() => setFilter('endDate', '')} />}
                {filters.series && <FilterChip label={`Series: ${filters.series}`} onRemove={() => setFilter('series', '')} />}
                {search && <FilterChip label={`Search: ${search}`} onRemove={() => { setSearchInput(''); setSearch(''); setPage(1); }} />}
              </div>
            )}
          </div>
        )}
      </div>

      <DataTable
        columns={columns as any}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        loading={isLoading}
        onPageChange={setPage}
        onLimitChange={l => { setLimit(l); setPage(1); }}
        onSortChange={(k, o) => { setSortBy(k); setSortOrder(o); }}
        onExport={handleExport}
        title="Bhav Copy"
        description={`${(data?.total ?? 0).toLocaleString('en-IN')} records`}
        emptyMessage="No bhav copy data found. Apply different filters or import data using the bulk import script."
      />
    </div>
  );
}
