'use client';
import { Filter, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

export interface MarketFilters {
  dateMode: 'single' | 'range';
  date: string;
  startDate: string;
  endDate: string;
  series: string;
  minLtp: string;
  maxLtp: string;
  minVolume: string;
  maxVolume: string;
}

export const EMPTY_MARKET_FILTERS: MarketFilters = {
  dateMode: 'single', date: '', startDate: '', endDate: '',
  series: '', minLtp: '', maxLtp: '', minVolume: '', maxVolume: '',
};

const NSE_SERIES = ['EQ', 'BE', 'BZ', 'SM', 'ST', 'IV', 'IT'];

interface Props {
  filters: MarketFilters;
  onChange: <K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => void;
  onClear: () => void;
  accent?: string;
  showPriceFilter?: boolean;
  showVolumeFilter?: boolean;
  showSeriesFilter?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

function countActive(f: MarketFilters) {
  return [
    f.dateMode === 'single' ? f.date : (f.startDate || f.endDate),
    f.series, f.minLtp, f.maxLtp, f.minVolume, f.maxVolume,
  ].filter(Boolean).length;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
      {label}
      <button onClick={onRemove} className="transition-colors hover:text-rose-500"><X className="h-3 w-3" /></button>
    </span>
  );
}

export default function MarketFilter({
  filters, onChange, onClear,
  showPriceFilter = true,
  showVolumeFilter = true,
  showSeriesFilter = true,
  search,
  onSearchChange,
}: Props) {
  const [open, setOpen] = useState(true);
  const [searchInput, setSearchInput] = useState(search ?? '');
  const active = countActive(filters);

  useEffect(() => {
    if (search !== undefined && search !== searchInput) setSearchInput(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!onSearchChange) return;
    if (searchInput === (search ?? '')) return;
    const t = setTimeout(() => onSearchChange(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput, onSearchChange, search]);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] p-4 dark:border-white/[0.06]">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 transition-colors hover:text-cyan-500 dark:text-slate-200 dark:hover:text-cyan-300"
        >
          <Filter className="h-4 w-4" />
          Filters
          {active > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-[10px] font-bold text-white shadow-glow-cyan">
              {active}
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
        </button>
        {active > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs font-semibold text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
          >
            <X className="h-3.5 w-3.5" /> Clear All
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-4 p-4">
          {/* Row 1: Date + Series */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex overflow-hidden rounded-xl border border-white/10 text-xs font-semibold dark:border-white/10">
              {(['single', 'range'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => onChange('dateMode', m)}
                  className={clsx('px-3 py-1.5 capitalize transition-all',
                    filters.dateMode === m
                      ? 'bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-glow-cyan'
                      : 'text-slate-600 hover:bg-cyan-500/10 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300')}
                >
                  {m === 'single' ? 'Single Date' : 'Date Range'}
                </button>
              ))}
            </div>

            {filters.dateMode === 'single' ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label>
                <input type="date" value={filters.date} onChange={e => onChange('date', e.target.value)} className="input h-9 w-40 text-sm" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">From</label>
                  <input type="date" value={filters.startDate} onChange={e => onChange('startDate', e.target.value)} className="input h-9 w-40 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">To</label>
                  <input type="date" value={filters.endDate} min={filters.startDate || undefined}
                    onChange={e => onChange('endDate', e.target.value)} className="input h-9 w-40 text-sm" />
                </div>
              </>
            )}

            {showSeriesFilter && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Series</label>
                <select value={filters.series} onChange={e => onChange('series', e.target.value)} className="input h-9 w-28 text-sm">
                  <option value="">All</option>
                  {NSE_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {onSearchChange && (
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
            )}
          </div>

          {/* Row 2: Price + Volume */}
          {(showPriceFilter || showVolumeFilter) && (
            <div className="flex flex-wrap items-end gap-3">
              {showPriceFilter && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">LTP / Price (₹)</label>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="0" step="0.01" placeholder="Min" value={filters.minLtp}
                      onChange={e => onChange('minLtp', e.target.value)} className="input h-9 w-24 text-sm" />
                    <span className="text-sm text-slate-400">–</span>
                    <input type="number" min="0" step="0.01" placeholder="Max" value={filters.maxLtp}
                      onChange={e => onChange('maxLtp', e.target.value)} className="input h-9 w-24 text-sm" />
                  </div>
                </div>
              )}
              {showVolumeFilter && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Volume (Qty)</label>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="0" placeholder="Min" value={filters.minVolume}
                      onChange={e => onChange('minVolume', e.target.value)} className="input h-9 w-28 text-sm" />
                    <span className="text-sm text-slate-400">–</span>
                    <input type="number" min="0" placeholder="Max" value={filters.maxVolume}
                      onChange={e => onChange('maxVolume', e.target.value)} className="input h-9 w-28 text-sm" />
                  </div>
                </div>
              )}
            </div>
          )}

          {active > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {filters.dateMode === 'single' && filters.date && <Chip label={`Date: ${filters.date}`} onRemove={() => onChange('date', '')} />}
              {filters.dateMode === 'range' && filters.startDate && <Chip label={`From: ${filters.startDate}`} onRemove={() => onChange('startDate', '')} />}
              {filters.dateMode === 'range' && filters.endDate && <Chip label={`To: ${filters.endDate}`} onRemove={() => onChange('endDate', '')} />}
              {filters.series && <Chip label={`Series: ${filters.series}`} onRemove={() => onChange('series', '')} />}
              {filters.minLtp && <Chip label={`LTP ≥ ₹${filters.minLtp}`} onRemove={() => onChange('minLtp', '')} />}
              {filters.maxLtp && <Chip label={`LTP ≤ ₹${filters.maxLtp}`} onRemove={() => onChange('maxLtp', '')} />}
              {filters.minVolume && <Chip label={`Vol ≥ ${Number(filters.minVolume).toLocaleString()}`} onRemove={() => onChange('minVolume', '')} />}
              {filters.maxVolume && <Chip label={`Vol ≤ ${Number(filters.maxVolume).toLocaleString()}`} onRemove={() => onChange('maxVolume', '')} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function buildMarketParams(
  filters: MarketFilters,
  page: number, limit: number,
  search: string, sortBy: string, sortOrder: 'ASC' | 'DESC',
) {
  return {
    page, limit,
    search: search || undefined,
    date: filters.dateMode === 'single' ? filters.date || undefined : undefined,
    startDate: filters.dateMode === 'range' ? filters.startDate || undefined : undefined,
    endDate: filters.dateMode === 'range' ? filters.endDate || undefined : undefined,
    series: filters.series || undefined,
    minClose: filters.minLtp ? Number(filters.minLtp) : undefined,
    maxClose: filters.maxLtp ? Number(filters.maxLtp) : undefined,
    minVolume: filters.minVolume ? Number(filters.minVolume) : undefined,
    maxVolume: filters.maxVolume ? Number(filters.maxVolume) : undefined,
    sortBy,
    sortOrder,
  };
}
