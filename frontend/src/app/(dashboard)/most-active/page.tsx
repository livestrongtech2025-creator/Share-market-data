'use client';
import { useState } from 'react';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import { useMostActiveEquities } from '@/hooks/useMarketData';
import { Activity } from 'lucide-react';

export default function MostActivePage() {
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState(''); const [date, setDate] = useState('');
  const { data, isLoading } = useMostActiveEquities({ page, limit, search, date: date || undefined });
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
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">{v}</span>
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
      key: 'openPrice', header: 'Open',
      render: (v: any) => v != null ? `₹${Number(v).toFixed(2)}` : '—',
    },
    {
      key: 'highPrice', header: 'High',
      render: (v: any) => v != null ? <span className="text-green-600 dark:text-green-400 font-mono">₹{Number(v).toFixed(2)}</span> : '—',
    },
    {
      key: 'lowPrice', header: 'Low',
      render: (v: any) => v != null ? <span className="text-red-600 dark:text-red-400 font-mono">₹{Number(v).toFixed(2)}</span> : '—',
    },
    {
      key: 'prevClose', header: 'Prev Close',
      render: (v: any) => v != null ? `₹${Number(v).toFixed(2)}` : '—',
    },
    {
      key: 'volume', header: 'Volume', sortable: true,
      render: (v: any) => formatVolume(v),
    },
    {
      key: 'value', header: 'Turnover (₹ Cr)', sortable: true,
      render: (v: any) => fmtValue(v),
    },
    {
      key: 'trades', header: 'No. of Trades',
      render: (v: any) => v ? Number(v).toLocaleString('en-IN') : '—',
    },
    {
      key: 'sourceDate', header: 'Date',
      render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Most Active Equities</h1><p className="text-sm text-gray-500">Highest traded by value</p></div>
      </div>
      <div className="card p-4 flex gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 text-sm w-auto" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Clear</button>
      </div>
      <DataTable columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit} onSearchChange={setSearch} title="Most Active" description={`${data?.total ?? 0} stocks`} />
    </div>
  );
}
