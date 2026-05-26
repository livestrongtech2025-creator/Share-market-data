'use client';
import { useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import { useJobLogs, useLogStats } from '@/hooks/useMarketData';
import { StatCard } from '@/components/ui/StatCard';
import { FileText, CheckCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import clsx from 'clsx';

export default function LogsPage() {
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(20); const [search, setSearch] = useState('');
  const { data, isLoading } = useJobLogs({ page, limit, search });
  const { data: stats } = useLogStats();

  const statusClass: Record<string, string> = {
    completed: 'badge-green', failed: 'badge-red', running: 'badge-blue', started: 'badge-yellow', skipped: 'badge-gray',
  };
  const columns = [
    { key: 'jobName', header: 'Job Name', sortable: true, render: (v: any) => <span className="font-semibold text-sm">{v}</span> },
    { key: 'jobType', header: 'Type', render: (v: any) => <span className="badge badge-gray text-xs">{v}</span> },
    { key: 'status', header: 'Status', render: (v: any) => <span className={`badge text-xs ${statusClass[v] || 'badge-gray'}`}>{v}</span> },
    { key: 'recordsInserted', header: 'Records', render: (v: any) => <span className="font-mono text-sm">{Number(v || 0).toLocaleString()}</span> },
    { key: 'recordsFailed', header: 'Failed', render: (v: any) => v > 0 ? <span className="text-red-500 font-mono text-sm">{v}</span> : <span className="text-gray-400">0</span> },
    { key: 'durationMs', header: 'Duration', render: (v: any) => v ? `${(v / 1000).toFixed(1)}s` : '—' },
    { key: 'errorMessage', header: 'Error', render: (v: any) => v ? <span className="text-xs text-red-500 truncate max-w-xs block" title={v}>{v}</span> : <span className="text-gray-400 text-xs">—</span> },
    { key: 'startedAt', header: 'Started At', sortable: true, render: (v: any) => v ? new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—' },
    { key: 'completedAt', header: 'Completed', render: (v: any) => v ? new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Logs</h1><p className="text-sm text-gray-500">Scheduler execution history</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={stats?.total ?? '—'} icon={BarChart2} iconColor="bg-blue-500" />
        <StatCard title="Completed" value={stats?.completed ?? '—'} icon={CheckCircle} iconColor="bg-green-500" />
        <StatCard title="Failed" value={stats?.failed ?? '—'} icon={AlertTriangle} iconColor="bg-red-500" />
        <StatCard title="Success Rate" value={`${stats?.successRate ?? 0}%`} icon={BarChart2} iconColor="bg-teal-500" />
      </div>
      <DataTable columns={columns as any} data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={limit} loading={isLoading}
        onPageChange={setPage} onLimitChange={setLimit} onSearchChange={setSearch} title="Job Execution Logs" description="Scheduler and manual ingestion history" />
    </div>
  );
}
