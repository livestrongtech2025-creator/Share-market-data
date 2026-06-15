'use client';
import { useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import PageHeader from '@/components/layout/PageHeader';
import { useJobLogs, useLogStats } from '@/hooks/useMarketData';
import { StatCard } from '@/components/ui/StatCard';
import { FileText, CheckCircle, AlertTriangle, BarChart2 } from 'lucide-react';

export default function LogsPage() {
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useJobLogs({ page, limit, search });
  const { data: stats }     = useLogStats();

  const statusClass: Record<string, string> = {
    completed: 'badge-green', failed: 'badge-red', running: 'badge-blue', started: 'badge-yellow', skipped: 'badge-gray',
  };
  const columns = [
    { key: 'jobName', header: 'Job Name', sortable: true, render: (v: any) => <span className="text-sm font-bold">{v}</span> },
    { key: 'jobType', header: 'Type', render: (v: any) => <span className="badge badge-gray">{v}</span> },
    { key: 'status', header: 'Status', render: (v: any) => <span className={`badge ${statusClass[v] || 'badge-gray'}`}>{v}</span> },
    { key: 'recordsInserted', header: 'Records', render: (v: any) => <span className="font-mono text-sm tabular-nums">{Number(v || 0).toLocaleString()}</span> },
    { key: 'recordsFailed', header: 'Failed', render: (v: any) => v > 0 ? <span className="font-mono text-sm tabular-nums text-rose-500">{v}</span> : <span className="text-slate-400">0</span> },
    { key: 'durationMs', header: 'Duration', render: (v: any) => v ? <span className="font-mono text-sm tabular-nums">{(v / 1000).toFixed(1)}s</span> : '—' },
    { key: 'errorMessage', header: 'Error', render: (v: any) => v ? <span className="block max-w-xs truncate text-xs text-rose-500" title={v}>{v}</span> : <span className="text-xs text-slate-400">—</span> },
    { key: 'startedAt', header: 'Started', sortable: true, render: (v: any) => v ? <span className="font-mono text-xs tabular-nums">{new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span> : '—' },
    { key: 'completedAt', header: 'Completed', render: (v: any) => v ? <span className="font-mono text-xs tabular-nums">{new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span> : '—' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={FileText}
        title="Job Logs"
        description="Scheduler execution history"
        accent="violet"
      />
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Jobs"   value={stats?.total ?? '—'}            icon={BarChart2}     iconColor="bg-cyan-500" />
        <StatCard title="Completed"    value={stats?.completed ?? '—'}        icon={CheckCircle}   iconColor="bg-green-500" />
        <StatCard title="Failed"       value={stats?.failed ?? '—'}           icon={AlertTriangle} iconColor="bg-red-500" />
        <StatCard title="Success Rate" value={`${stats?.successRate ?? 0}%`}  icon={BarChart2}     iconColor="bg-teal-500" />
      </div>
      <DataTable
        columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0}
        page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit} onSearchChange={setSearch}
        title="Job Execution Logs"
        description="Scheduler and manual ingestion history"
      />
    </div>
  );
}
