'use client';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import clsx from 'clsx';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  loading?: boolean;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSortChange?: (key: string, order: 'ASC' | 'DESC') => void;
  onSearchChange?: (search: string) => void;
  onExport?: () => void;
  title?: string;
  description?: string;
  emptyMessage?: string;
}

function ChangeCell({ value }: { value: number }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  const positive = value >= 0;
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 font-mono font-semibold tabular-nums',
      positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
    )}>
      <span aria-hidden>{positive ? '▲' : '▼'}</span>
      {positive ? '+' : ''}{Number(value).toFixed(2)}%
    </span>
  );
}

export function PriceChange({ value }: { value: number }) {
  return <ChangeCell value={value} />;
}

export function formatVolume(v: number): string {
  if (!v) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return String(v);
}

export function formatValue(v: number): string {
  if (!v) return '—';
  const cr = v / 1e7;
  if (cr >= 1000) return `₹${(cr / 1000).toFixed(2)}K Cr`;
  return `₹${cr.toFixed(2)} Cr`;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, total = 0, page = 1, limit = 20, loading, onPageChange, onLimitChange,
  onSortChange, onSearchChange, onExport, title, description, emptyMessage = 'No data available'
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [searchInput, setSearchInput] = useState('');
  const totalPages = Math.ceil(total / limit);

  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === 'DESC' ? 'ASC' : 'DESC';
    setSortKey(key); setSortOrder(newOrder);
    onSortChange?.(key, newOrder);
  };

  const handleSearch = (val: string) => {
    setSearchInput(val);
    const t = setTimeout(() => onSearchChange?.(val), 300);
    return () => clearTimeout(t);
  };

  return (
    <div className="card relative overflow-hidden">
      {/* Top neon stripe */}
      {title && <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />}

      {/* Header */}
      {(title || onSearchChange || onExport) && (
        <div className="border-b border-white/[0.06] p-4 dark:border-white/[0.06]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {title && <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>}
              {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {onSearchChange && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search..."
                    className="input h-8 w-44 pl-8 text-xs"
                  />
                </div>
              )}
              {onExport && (
                <button onClick={onExport} className="btn-secondary btn-sm">
                  <Download className="h-3.5 w-3.5" /> Export
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={String(col.key)} className={col.className} style={col.width ? { width: col.width } : {}}>
                  {col.sortable ? (
                    <button
                      className="flex items-center gap-1 transition-colors hover:text-cyan-500 dark:hover:text-cyan-300"
                      onClick={() => handleSort(String(col.key))}
                    >
                      {col.header}
                      {sortKey === String(col.key) ? (
                        sortOrder === 'ASC'
                          ? <ChevronUp className="h-3 w-3 text-cyan-500" />
                          : <ChevronDown className="h-3 w-3 text-cyan-500" />
                      ) : <ChevronDown className="h-3 w-3 opacity-30" />}
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => <td key={String(col.key)}><div className="skeleton h-4 w-full" /></td>)}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                    <Search className="h-8 w-8 opacity-30" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => {
                    const val = col.key.toString().includes('.')
                      ? col.key.toString().split('.').reduce((o: any, k) => o?.[k], row)
                      : row[col.key as keyof T];
                    return <td key={String(col.key)} className={col.className}>{col.render ? col.render(val, row) : (val ?? '—')}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] p-3 dark:border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
            </span>
            <select
              value={limit}
              onChange={e => onLimitChange?.(Number(e.target.value))}
              className="input h-7 w-16 py-0 text-xs"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="btn-ghost btn-sm p-1.5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange?.(p)}
                  className={clsx(
                    'h-7 w-7 rounded-lg font-mono text-xs font-semibold tabular-nums transition-all',
                    p === page
                      ? 'bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white shadow-glow-cyan'
                      : 'text-slate-500 hover:bg-cyan-500/10 hover:text-cyan-500 dark:text-slate-400',
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="btn-ghost btn-sm p-1.5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
