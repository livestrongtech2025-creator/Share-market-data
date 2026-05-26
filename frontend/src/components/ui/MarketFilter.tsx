'use client';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
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
}

function countActive(f: MarketFilters) {
  return [
    f.dateMode === 'single' ? f.date : (f.startDate || f.endDate),
    f.series, f.minLtp, f.maxLtp, f.minVolume, f.maxVolume,
  ].filter(Boolean).length;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
      {label}
      <button onClick={onRemove} className="hover:opacity-70"><X className="w-3 h-3" /></button>
    </span>
  );
}

export default function MarketFilter({
  filters, onChange, onClear,
  accent = 'indigo',
  showPriceFilter = true,
  showVolumeFilter = true,
}: Props) {
  const [open, setOpen] = useState(true);
  const active = countActive(filters);

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
          <Filter className="w-4 h-4" />
          Filters
          {active > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-indigo-500 text-white">{active}</span>
          )}
          {open ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
        </button>
        {active > 0 && (
          <button onClick={onClear} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 font-medium">
            <X className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {open && (
        <div className="p-4 space-y-4">
          {/* Row 1: Date + Series */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Date mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-dark-600 text-xs font-medium">
              {(['single', 'range'] as const).map(m => (
                <button key={m} onClick={() => onChange('dateMode', m)}
                  className={clsx('px-3 py-1.5 transition-colors capitalize',
                    filters.dateMode === m
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700')}>
                  {m === 'single' ? 'Single Date' : 'Date Range'}
                </button>
              ))}
            </div>

            {filters.dateMode === 'single' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Date</label>
                <input type="date" value={filters.date} onChange={e => onChange('date', e.target.value)} className="input h-9 text-sm w-40" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">From</label>
                  <input type="date" value={filters.startDate} onChange={e => onChange('startDate', e.target.value)} className="input h-9 text-sm w-40" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">To</label>
                  <input type="date" value={filters.endDate} min={filters.startDate || undefined}
                    onChange={e => onChange('endDate', e.target.value)} className="input h-9 text-sm w-40" />
                </div>
              </>
            )}

            {/* Series */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Series</label>
              <select value={filters.series} onChange={e => onChange('series', e.target.value)} className="input h-9 text-sm w-28">
                <option value="">All</option>
                {NSE_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Price + Volume */}
          {(showPriceFilter || showVolumeFilter) && (
            <div className="flex flex-wrap items-end gap-3">
              {showPriceFilter && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">LTP / Price (₹)</label>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="0" step="0.01" placeholder="Min" value={filters.minLtp}
                      onChange={e => onChange('minLtp', e.target.value)} className="input h-9 text-sm w-24" />
                    <span className="text-gray-400 text-sm">–</span>
                    <input type="number" min="0" step="0.01" placeholder="Max" value={filters.maxLtp}
                      onChange={e => onChange('maxLtp', e.target.value)} className="input h-9 text-sm w-24" />
                  </div>
                </div>
              )}
              {showVolumeFilter && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Volume (Qty)</label>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="0" placeholder="Min" value={filters.minVolume}
                      onChange={e => onChange('minVolume', e.target.value)} className="input h-9 text-sm w-28" />
                    <span className="text-gray-400 text-sm">–</span>
                    <input type="number" min="0" placeholder="Max" value={filters.maxVolume}
                      onChange={e => onChange('maxVolume', e.target.value)} className="input h-9 text-sm w-28" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active chips */}
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
