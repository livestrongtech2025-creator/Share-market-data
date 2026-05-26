'use client';
import { useState } from 'react';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import { useUpperBandHitters } from '@/hooks/useMarketData';
import { marketApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';

export default function UpperBandPage() {
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState(''); const [sortBy, setSortBy] = useState('sourceDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC'); const [date, setDate] = useState('');
  const { data, isLoading } = useUpperBandHitters({ page, limit, search, sortBy, sortOrder, date: date || undefined });
  const columns = [
    {
      key: 'symbol',
      header: 'Symbol',
      sortable: true,
      render: (v: any) => <span className="font-bold text-gray-900 dark:text-white tracking-wide">{v || '—'}</span>,
    },
    {
      key: 'series',
      header: 'Series',
      render: (v: any) => v ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">{v}</span>
      ) : '—',
    },
    {
      key: 'ltp',
      header: 'LTP',
      sortable: true,
      render: (v: any) => v != null ? <span className="font-mono font-semibold">₹{Number(v).toFixed(2)}</span> : '—',
    },
    {
      key: 'pctChng',
      header: '%chng',
      sortable: true,
      render: (v: any) => <PriceChange value={v} />,
    },
    {
      key: 'upperBand',
      header: 'Price Band',
      render: (v: any) => v != null ? (
        <span className="font-mono text-green-600 dark:text-green-400 font-semibold">₹{Number(v).toFixed(2)}</span>
      ) : '—',
    },
    {
      key: 'volume',
      header: 'Volume',
      sortable: true,
      render: (v: any) => formatVolume(v),
    },
    {
      key: 'value',
      header: 'Value (₹ Cr)',
      render: (v: any) => {
        const rupees = Number(v);
        if (!v || rupees === 0) return '—';
        if (rupees >= 1e9) return `₹${(rupees / 1e9).toFixed(2)}K Cr`;
        if (rupees >= 1e7) return `₹${(rupees / 1e7).toFixed(2)} Cr`;
        if (rupees >= 1e5) return `₹${(rupees / 1e5).toFixed(2)} L`;
        if (rupees >= 1e3) return `₹${(rupees / 1e3).toFixed(2)} K`;
        return `₹${rupees.toFixed(2)}`;
      },
    },
    {
      key: 'sourceDate',
      header: 'Date',
      sortable: true,
      render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upper Band Hitters</h1><p className="text-sm text-gray-500">Stocks hitting upper circuit breaker</p></div>
      </div>
      <div className="card p-4 flex flex-wrap gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 text-sm w-auto" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Clear Date</button>
      </div>
      <DataTable columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit} onSortChange={(k, o) => { setSortBy(k); setSortOrder(o); }} onSearchChange={setSearch}
        title="Upper Band Hitters" description={`${data?.total ?? 0} stocks`} />
    </div>
  );
}
