'use client';
import { useState, useCallback } from 'react';
import DataTable, { formatVolume } from '@/components/ui/DataTable';
import { useBhavCopy, useBhavCopySeries } from '@/hooks/useMarketData';
import { marketApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Database, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

interface Filters {
  dateMode: 'single' | 'range';
  date: string;
  startDate: string;
  endDate: string;
  series: string;
  minClose: string;
  maxClose: string;
  minVolume: string;
  maxVolume: string;
}

const EMPTY_FILTERS: Filters = {
  dateMode: 'single',
  date: '',
  startDate: '',
  endDate: '',
  series: '',
  minClose: '',
  maxClose: '',
  minVolume: '',
  maxVolume: '',
};

function buildQueryParams(filters: Filters, page: number, limit: number, search: string) {
  const p: Record<string, any> = { page, limit };
  if (search) p.search = search;

  if (filters.dateMode === 'single' && filters.date) {
    p.date = filters.date;
  } else if (filters.dateMode === 'range' && filters.startDate && filters.endDate) {
    p.startDate = filters.startDate;
    p.endDate = filters.endDate;
  }

  if (filters.series) p.series = filters.series;
  if (filters.minClose !== '') p.minClose = Number(filters.minClose);
  if (filters.maxClose !== '') p.maxClose = Number(filters.maxClose);
  if (filters.minVolume !== '') p.minVolume = Number(filters.minVolume);
  if (filters.maxVolume !== '') p.maxVolume = Number(filters.maxVolume);

  return p;
}

function countActiveFilters(filters: Filters): number {
  return [
    filters.dateMode === 'single' ? filters.date : (filters.startDate || filters.endDate),
    filters.series,
    filters.minClose,
    filters.maxClose,
    filters.minVolume,
    filters.maxVolume,
  ].filter(Boolean).length;
}

export default function BhavCopyPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
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

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
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

  const activeCount = countActiveFilters(filters);

  const columns = [
    {
      key: 'symbol',
      header: 'Symbol',
      sortable: true,
      render: (v: any) => (
        <span className="font-bold text-gray-900 dark:text-white tracking-wide">{v || '—'}</span>
      ),
    },
    {
      key: 'series',
      header: 'Series',
      sortable: true,
      render: (v: any) => v ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
          {v}
        </span>
      ) : '—',
    },
    {
      key: 'sourceDate',
      header: 'Date',
      sortable: true,
      render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
    {
      key: 'prevClose',
      header: 'Prev Close',
      sortable: true,
      render: (v: any) => v != null ? `₹${Number(v).toFixed(2)}` : '—',
    },
    {
      key: 'openPrice',
      header: 'Open',
      sortable: true,
      render: (v: any) => v != null ? `₹${Number(v).toFixed(2)}` : '—',
    },
    {
      key: 'highPrice',
      header: 'High',
      sortable: true,
      render: (v: any) => v != null ? (
        <span className="text-green-600 dark:text-green-400 font-mono">₹{Number(v).toFixed(2)}</span>
      ) : '—',
    },
    {
      key: 'lowPrice',
      header: 'Low',
      sortable: true,
      render: (v: any) => v != null ? (
        <span className="text-red-500 dark:text-red-400 font-mono">₹{Number(v).toFixed(2)}</span>
      ) : '—',
    },
    {
      key: 'lastPrice',
      header: 'Last',
      sortable: true,
      render: (v: any) => v != null ? `₹${Number(v).toFixed(2)}` : '—',
    },
    {
      key: 'closePrice',
      header: 'Close',
      sortable: true,
      render: (v: any) => v != null ? (
        <span className="font-semibold font-mono text-gray-900 dark:text-white">₹{Number(v).toFixed(2)}</span>
      ) : '—',
    },
    {
      key: 'avgPrice',
      header: 'Avg Price',
      sortable: true,
      render: (v: any) => v != null ? `₹${Number(v).toFixed(2)}` : '—',
    },
    {
      key: 'totalTradedQty',
      header: 'Volume (Qty)',
      sortable: true,
      render: (v: any) => formatVolume(v),
    },
    {
      key: 'totalTradedValue',
      header: 'Turnover (₹ Cr)',
      sortable: true,
      render: (v: any) => {
        if (!v) return '—';
        const cr = Number(v) / 100; // TURNOVER_LACS: Lakhs → Crores
        if (cr >= 1000) return `₹${(cr / 1000).toFixed(2)}K Cr`;
        return `₹${cr.toFixed(2)} Cr`;
      },
    },
    {
      key: 'totalTrades',
      header: 'No. of Trades',
      sortable: true,
      render: (v: any) => v != null ? Number(v).toLocaleString('en-IN') : '—',
    },
    {
      key: 'delivQty',
      header: 'Deliv Qty',
      sortable: true,
      render: (v: any) => v != null ? Number(v).toLocaleString('en-IN') : '—',
    },
    {
      key: 'delivPer',
      header: 'Deliv %',
      sortable: true,
      render: (v: any) => v != null ? `${Number(v).toFixed(2)}%` : '—',
    },
    {
      key: 'isin',
      header: 'ISIN',
      render: (v: any) => v ? (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{v}</span>
      ) : '—',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bhav Copy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Daily NSE equity price snapshot</p>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="card">
        {/* Filter Header */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-indigo-500 text-white">
                {activeCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="w-4 h-4 ml-1 opacity-50" /> : <ChevronDown className="w-4 h-4 ml-1 opacity-50" />}
          </button>
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          )}
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="p-4 space-y-4">
            {/* Row 1: Date */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Date mode toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-dark-600 text-xs font-medium">
                <button
                  onClick={() => setFilter('dateMode', 'single')}
                  className={clsx(
                    'px-3 py-1.5 transition-colors',
                    filters.dateMode === 'single'
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700',
                  )}
                >
                  Single Date
                </button>
                <button
                  onClick={() => setFilter('dateMode', 'range')}
                  className={clsx(
                    'px-3 py-1.5 transition-colors',
                    filters.dateMode === 'range'
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700',
                  )}
                >
                  Date Range
                </button>
              </div>

              {filters.dateMode === 'single' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date</label>
                  <input
                    type="date"
                    value={filters.date}
                    onChange={e => setFilter('date', e.target.value)}
                    className="input h-9 text-sm w-40"
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={e => setFilter('startDate', e.target.value)}
                      className="input h-9 text-sm w-40"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      min={filters.startDate || undefined}
                      onChange={e => setFilter('endDate', e.target.value)}
                      className="input h-9 text-sm w-40"
                    />
                  </div>
                </>
              )}

              {/* Series */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Series</label>
                <select
                  value={filters.series}
                  onChange={e => setFilter('series', e.target.value)}
                  className="input h-9 text-sm w-28"
                >
                  <option value="">All Series</option>
                  {(seriesList ?? []).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Price & Volume ranges */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Close Price Range */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Close Price (₹)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Min"
                    value={filters.minClose}
                    onChange={e => setFilter('minClose', e.target.value)}
                    className="input h-9 text-sm w-24"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max"
                    value={filters.maxClose}
                    onChange={e => setFilter('maxClose', e.target.value)}
                    className="input h-9 text-sm w-24"
                  />
                </div>
              </div>

              {/* Volume Range */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Volume (Qty)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={filters.minVolume}
                    onChange={e => setFilter('minVolume', e.target.value)}
                    className="input h-9 text-sm w-28"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={filters.maxVolume}
                    onChange={e => setFilter('maxVolume', e.target.value)}
                    className="input h-9 text-sm w-28"
                  />
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {activeCount > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {filters.dateMode === 'single' && filters.date && (
                  <FilterChip label={`Date: ${filters.date}`} onRemove={() => setFilter('date', '')} />
                )}
                {filters.dateMode === 'range' && filters.startDate && (
                  <FilterChip label={`From: ${filters.startDate}`} onRemove={() => setFilter('startDate', '')} />
                )}
                {filters.dateMode === 'range' && filters.endDate && (
                  <FilterChip label={`To: ${filters.endDate}`} onRemove={() => setFilter('endDate', '')} />
                )}
                {filters.series && (
                  <FilterChip label={`Series: ${filters.series}`} onRemove={() => setFilter('series', '')} />
                )}
                {filters.minClose && (
                  <FilterChip label={`Close ≥ ₹${filters.minClose}`} onRemove={() => setFilter('minClose', '')} />
                )}
                {filters.maxClose && (
                  <FilterChip label={`Close ≤ ₹${filters.maxClose}`} onRemove={() => setFilter('maxClose', '')} />
                )}
                {filters.minVolume && (
                  <FilterChip label={`Volume ≥ ${Number(filters.minVolume).toLocaleString()}`} onRemove={() => setFilter('minVolume', '')} />
                )}
                {filters.maxVolume && (
                  <FilterChip label={`Volume ≤ ${Number(filters.maxVolume).toLocaleString()}`} onRemove={() => setFilter('maxVolume', '')} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Table */}
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
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        onExport={handleExport}
        title="Bhav Copy"
        description={`${(data?.total ?? 0).toLocaleString('en-IN')} records`}
        emptyMessage="No bhav copy data found. Apply different filters or import data using the bulk import script."
      />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
      {label}
      <button onClick={onRemove} className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
