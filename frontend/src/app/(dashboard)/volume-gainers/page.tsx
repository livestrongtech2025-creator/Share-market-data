'use client';
import { useState } from 'react';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import { useVolumeGainers } from '@/hooks/useMarketData';
import { BarChart2 } from 'lucide-react';

export default function VolumeGainersPage() {
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState(''); const [date, setDate] = useState('');
  const { data, isLoading } = useVolumeGainers({ page, limit, search, date: date || undefined });
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
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{v}</span>
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
      key: 'volume', header: 'Volume', sortable: true,
      render: (v: any) => <span className="font-semibold text-blue-600 dark:text-blue-400">{formatVolume(v)}</span>,
    },
    {
      key: 'prevVolume', header: 'Prev Vol (1W Avg)',
      render: (v: any) => formatVolume(v),
    },
    {
      key: 'volumeRatio', header: 'Vol Ratio', sortable: true,
      render: (v: any) => v ? (
        <span className="font-semibold text-orange-600 dark:text-orange-400">{Number(v).toFixed(2)}x</span>
      ) : '—',
    },
    {
      key: 'value', header: 'Value (₹ Cr)', sortable: true,
      render: (v: any) => fmtValue(v),
    },
    {
      key: 'sourceDate', header: 'Date',
      render: (v: any) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center"><BarChart2 className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Volume Gainers</h1><p className="text-sm text-gray-500">Stocks with unusual volume surge</p></div>
      </div>
      <div className="card p-4 flex gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input h-9 text-sm w-auto" />
        <button onClick={() => setDate('')} className="btn-secondary btn-sm">Clear</button>
      </div>
      <DataTable columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit} onSearchChange={setSearch} title="Volume Gainers" description={`${data?.total ?? 0} stocks`} />
    </div>
  );
}
