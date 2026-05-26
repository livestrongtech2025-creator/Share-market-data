'use client';
import { useState, useMemo } from 'react';
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
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>;
  const positive = value >= 0;
  return (
    <span className={clsx('font-semibold', positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
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
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>}
            {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {onSearchChange && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search..."
                  className="input pl-8 h-8 text-xs w-44"
                />
              </div>
            )}
            {onExport && (
              <button onClick={onExport} className="btn-secondary btn-sm">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={String(col.key)} className={col.className} style={col.width ? { width: col.width } : {}}>
                  {col.sortable ? (
                    <button className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white" onClick={() => handleSort(String(col.key))}>
                      {col.header}
                      {sortKey === String(col.key) ? (
                        sortOrder === 'ASC' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : <ChevronDown className="w-3 h-3 opacity-30" />}
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
              <tr><td colSpan={columns.length} className="text-center py-12 text-gray-400 dark:text-gray-500">{emptyMessage}</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => {
                    const val = col.key.toString().includes('.') ? col.key.toString().split('.').reduce((o: any, k) => o?.[k], row) : row[col.key as keyof T];
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
        <div className="p-3 border-t border-gray-200 dark:border-dark-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}</span>
            <select value={limit} onChange={e => onLimitChange?.(Number(e.target.value))} className="input h-7 text-xs w-16 py-0">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} className="btn-ghost btn-sm p-1.5 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={p} onClick={() => onPageChange?.(p)} className={clsx('w-7 h-7 text-xs rounded-lg', p === page ? 'bg-primary-600 text-white' : 'btn-ghost')}>
                  {p}
                </button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} className="btn-ghost btn-sm p-1.5 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
