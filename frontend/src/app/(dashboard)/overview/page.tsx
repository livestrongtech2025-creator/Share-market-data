'use client';
import { useMemo } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import MarketSummaryCard from '@/components/dashboard/MarketSummaryCard';
import SectorHeatmap from '@/components/charts/SectorHeatmap';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import { useUpperBandHitters, useLowerBandHitters, useVolumeGainers, useAiAlerts, useLogStats, useSectorAnalysis, useTopSignals } from '@/hooks/useMarketData';
import { TrendingUp, TrendingDown, BarChart2, Bell, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import SentimentBadge from '@/components/ui/SentimentBadge';

export default function OverviewPage() {
  const { data: upper } = useUpperBandHitters({ limit: 5, page: 1 });
  const { data: lower } = useLowerBandHitters({ limit: 5, page: 1 });
  const { data: volume } = useVolumeGainers({ limit: 5, page: 1 });
  const { data: alerts } = useAiAlerts({ limit: 5, page: 1 });
  const { data: logStats } = useLogStats();
  const { data: sector } = useSectorAnalysis();
  const { data: signals } = useTopSignals(undefined, 10);

  const moversColumns = [
    { key: 'symbol', header: 'Symbol', sortable: false, render: (v: any) => <span className="font-semibold text-gray-900 dark:text-white">{v}</span> },
    { key: 'ltp', header: 'LTP', render: (v: any) => <span className="font-mono">₹{Number(v || 0).toFixed(2)}</span> },
    { key: 'pctChng', header: 'Chg%', render: (v: any) => <PriceChange value={v} /> },
    { key: 'volume', header: 'Volume', render: (v: any) => formatVolume(v) },
  ];

  const alertColumns = [
    { key: 'symbol', header: 'Symbol', render: (v: any) => <span className="font-semibold">{v || 'Market'}</span> },
    { key: 'alertType', header: 'Type', render: (v: any) => <span className="badge badge-blue text-xs">{v}</span> },
    { key: 'severity', header: 'Severity', render: (v: any) => {
      const cls: Record<string, string> = { critical: 'badge-red', high: 'badge-yellow', medium: 'badge-blue', low: 'badge-gray', info: 'badge-gray' };
      return <span className={`badge ${cls[v] || 'badge-gray'} text-xs`}>{v}</span>;
    }},
    { key: 'alertMessage', header: 'Message', render: (v: any) => <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate block">{v}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Market Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">NSE India · Live market intelligence powered by AI</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upper Circuit" value={upper?.total ?? '—'} icon={TrendingUp} iconColor="bg-green-500" description="Stocks at upper limit" />
        <StatCard title="Lower Circuit" value={lower?.total ?? '—'} icon={TrendingDown} iconColor="bg-red-500" description="Stocks at lower limit" />
        <StatCard title="Volume Gainers" value={volume?.total ?? '—'} icon={BarChart2} iconColor="bg-blue-500" description="High volume activity" />
        <StatCard title="Active Alerts" value={alerts?.total ?? '—'} icon={Bell} iconColor="bg-yellow-500" description="Unread AI alerts" />
      </div>

      {/* Market Summary */}
      <MarketSummaryCard />

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sector Heatmap */}
        <div className="xl:col-span-2 card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sector Performance</h3>
          <SectorHeatmap data={sector?.sectors || []} />
        </div>

        {/* Job Stats */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm">Completed Jobs</span></div>
              <span className="font-semibold text-green-600 dark:text-green-400">{logStats?.completed ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-sm">Failed Jobs</span></div>
              <span className="font-semibold text-red-600 dark:text-red-400">{logStats?.failed ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-500" /><span className="text-sm">Success Rate</span></div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{logStats?.successRate ?? 0}%</span>
            </div>
            {logStats?.lastRun && (
              <p className="text-xs text-gray-400 text-center pt-1">Last run: {new Date(logStats.lastRun).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            )}
          </div>
        </div>
      </div>

      {/* Data Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable
          title="Top Upper Circuit" description="Stocks at upper price band"
          columns={moversColumns} data={upper?.data ?? []} loading={!upper}
        />
        <DataTable
          title="Top Lower Circuit" description="Stocks at lower price band"
          columns={moversColumns} data={lower?.data ?? []} loading={!lower}
        />
      </div>

      {/* AI Alerts */}
      <DataTable
        title="Recent AI Alerts" description="Latest automated alerts"
        columns={alertColumns} data={alerts?.data ?? []} loading={!alerts}
      />
    </div>
  );
}
