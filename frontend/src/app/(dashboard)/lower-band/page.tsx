'use client';
import { useState } from 'react';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import { useLowerBandHitters } from '@/hooks/useMarketData';
import { marketApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { TrendingDown } from 'lucide-react';
import type { LowerBandHitter } from '@/types';

export default function LowerBandPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('sourceDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [date, setDate] = useState('');

  const { data, isLoading } = useLowerBandHitters({ page, limit, search, sortBy, sortOrder, date: date || undefined });

  const handleExport = async () => {
    if (!date) { toast.error('Select a date to export'); return; }
    try {
      const res = await marketApi.exportCsv('lower_band_hitters', date);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `lower_band_hitters_${date}.csv`; a.click();
      toast.success('Export started');
    } catch { toast.error('Export failed'); }
  };

  const fmtValue = (v: any) => {
    const r = Number(v);
    if (!v || r === 0) return '—';
    if (r >= 1e9) return `₹${(r / 1e9).toFixed(2)}K Cr`;
    if (r >= 1e7) return `₹${(r / 1e7).toFixed(2)} Cr`;
    if (r >= 1e5) return `₹${(r / 1e5).toFixed(2)} L`;
    if (r >= 1e3) return `₹${(r / 1e3).toFixed(2)} K`;
    return `₹${r.toFixed(2)}`;
  };

  const columns = [
    {
      key: 'symbol', header: 'Symbol', sortable: true,
      render: (v: any) => <span className="font-bold text-gray-900 dark:text-white tracking-wide">{v || '—'}</span>,
    },
    {
      key: 'series', header: 'Series',
      render: (v: any) => v ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">{v}</span>
      ) : '—',
    },
    {
      key: 'ltp', header: 'LTP', sortable: true,
      render: (v: any) => v != null ? <span className="font-mono font-semibold">₹{Number(v).toFixed(2)}</span> : '—',
    },
    {
      key: 'pctChng', header: '%chng', sortable: true,
      render: (v: any) => <PriceChange value={v} />,
    },
    {
      key: 'lowerBand', header: 'Price Band',
      render: (v: any) => v != null ? (
        <span className="font-mono text-red-600 dark:text-red-400 font-semibold">₹{Number(v).toFixed(2)}</span>
      ) : '—',
    },
    {
      key: 'volume', header: 'Volume', sortable: true,
      render: (v: any) => formatVolume(v),
    },
    {
      key: 'value', header: 'Value (₹ Cr)',
      render: (v: any) => fmtValue(v),
    },
    {
      key: 'sourceDate', header: 'Date', sortable: true,
      render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lower Band Hitters</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Stocks hitting lower circuit breaker</p>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 text-sm w-auto" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Clear Date</button>
      </div>

      <DataTable
        columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0}
        page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit}
        onSortChange={(k, o) => { setSortBy(k); setSortOrder(o); }}
        onSearchChange={setSearch} onExport={handleExport}
        title="Lower Band Hitters" description={`${data?.total ?? 0} stocks`}
      />
    </div>
  );
}
