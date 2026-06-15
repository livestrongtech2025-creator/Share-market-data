'use client';
import MarketSummaryCard from '@/components/dashboard/MarketSummaryCard';
import SectorHeatmap from '@/components/charts/SectorHeatmap';
import DataTable, { PriceChange, formatVolume } from '@/components/ui/DataTable';
import {
  useUpperBandHitters, useLowerBandHitters, useVolumeGainers,
  useAiAlerts, useLogStats, useSectorAnalysis,
} from '@/hooks/useMarketData';
import {
  TrendingUp, TrendingDown, BarChart2, Bell,
  CheckCircle, AlertTriangle, Sparkles, LucideIcon, Activity,
} from 'lucide-react';
import clsx from 'clsx';

interface GlassStatProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  accent: 'emerald' | 'rose' | 'cyan' | 'amber';
  description: string;
}

const STAT_ACCENT: Record<GlassStatProps['accent'], { gradient: string; glow: string; ring: string }> = {
  emerald: { gradient: 'from-emerald-400 via-teal-500 to-cyan-500',     glow: 'shadow-glow-emerald', ring: 'from-emerald-400/30 to-cyan-400/10' },
  rose:    { gradient: 'from-rose-400 via-pink-500 to-fuchsia-500',     glow: 'shadow-glow-rose',    ring: 'from-rose-400/30 to-fuchsia-400/10' },
  cyan:    { gradient: 'from-cyan-400 via-sky-500 to-blue-500',         glow: 'shadow-glow-cyan',    ring: 'from-cyan-400/30 to-blue-400/10' },
  amber:   { gradient: 'from-amber-400 via-orange-500 to-rose-500',     glow: 'shadow-glow-amber',   ring: 'from-amber-400/30 to-rose-400/10' },
};

function GlassStat({ title, value, icon: Icon, accent, description }: GlassStatProps) {
  const t = STAT_ACCENT[accent];
  return (
    <div className="card card-interactive group relative overflow-hidden p-5">
      {/* Decorative glow blob */}
      <div className={clsx('absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br blur-2xl opacity-50 transition-all duration-500 group-hover:scale-125 group-hover:opacity-80', t.ring)} />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className={clsx('relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', t.gradient, t.glow)}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
          <span className={clsx('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-40 blur-md -z-10', t.gradient)} />
        </div>
      </div>
    </div>
  );
}

interface HealthRowProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: 'emerald' | 'rose' | 'cyan';
}

const HEALTH_TONES: Record<HealthRowProps['tone'], { icon: string; value: string; ring: string; bg: string }> = {
  emerald: { icon: 'text-emerald-400', value: 'text-emerald-600 dark:text-emerald-300', ring: 'border-emerald-500/20', bg: 'from-emerald-500/10 to-teal-500/5' },
  rose:    { icon: 'text-rose-400',    value: 'text-rose-600 dark:text-rose-300',       ring: 'border-rose-500/20',    bg: 'from-rose-500/10 to-pink-500/5' },
  cyan:    { icon: 'text-cyan-400',    value: 'text-cyan-600 dark:text-cyan-300',       ring: 'border-cyan-500/20',    bg: 'from-cyan-500/10 to-blue-500/5' },
};

function HealthRow({ icon: Icon, label, value, tone }: HealthRowProps) {
  const t = HEALTH_TONES[tone];
  return (
    <div className={clsx('relative flex items-center justify-between overflow-hidden rounded-2xl border bg-gradient-to-r px-4 py-3 backdrop-blur-sm', t.ring, t.bg)}>
      <div className="flex items-center gap-2.5">
        <Icon className={clsx('h-4 w-4', t.icon)} strokeWidth={2.4} />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <span className={clsx('font-mono font-bold tabular-nums', t.value)}>{value}</span>
    </div>
  );
}

export default function OverviewPage() {
  const { data: upper }     = useUpperBandHitters({ limit: 5, page: 1 });
  const { data: lower }     = useLowerBandHitters({ limit: 5, page: 1 });
  const { data: volume }    = useVolumeGainers({ limit: 5, page: 1 });
  const { data: alerts }    = useAiAlerts({ limit: 5, page: 1 });
  const { data: logStats }  = useLogStats();
  const { data: sector }    = useSectorAnalysis();

  const moversColumns = [
    { key: 'symbol',  header: 'Symbol', render: (v: any) => <span className="font-bold text-slate-900 dark:text-white">{v}</span> },
    { key: 'ltp',     header: 'LTP',    render: (v: any) => <span className="font-mono tabular-nums">₹{Number(v || 0).toFixed(2)}</span> },
    { key: 'pctChng', header: 'Chg%',   render: (v: any) => <PriceChange value={v} /> },
    { key: 'volume',  header: 'Volume', render: (v: any) => <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">{formatVolume(v)}</span> },
  ];

  const alertColumns = [
    { key: 'symbol',       header: 'Symbol',   render: (v: any) => <span className="font-bold text-slate-900 dark:text-white">{v || 'Market'}</span> },
    { key: 'alertType',    header: 'Type',     render: (v: any) => <span className="badge badge-blue">{v}</span> },
    { key: 'severity',     header: 'Severity', render: (v: any) => {
      const cls: Record<string, string> = { critical: 'badge-red', high: 'badge-yellow', medium: 'badge-blue', low: 'badge-gray', info: 'badge-gray' };
      return <span className={cls[v] || 'badge-gray'}>{v}</span>;
    } },
    { key: 'alertMessage', header: 'Message',  render: (v: any) => <span className="block max-w-xs truncate text-xs text-slate-600 dark:text-slate-400">{v}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 backdrop-blur-md dark:text-emerald-300">
            <span className="live-dot" />
            <span>Live · NSE India</span>
          </div>
          <h1 className="gradient-text-strong mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
            Market Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            AI-powered market intelligence, refreshed in real time
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/40 px-4 py-2.5 text-xs text-slate-600 backdrop-blur-md dark:bg-white/[0.03] dark:text-slate-300 sm:flex">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          Updated {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GlassStat title="Upper Circuit"  value={upper?.total ?? '—'}  icon={TrendingUp}   accent="emerald" description="Stocks at upper limit" />
        <GlassStat title="Lower Circuit"  value={lower?.total ?? '—'}  icon={TrendingDown} accent="rose"    description="Stocks at lower limit" />
        <GlassStat title="Volume Gainers" value={volume?.total ?? '—'} icon={BarChart2}    accent="cyan"    description="High volume activity" />
        <GlassStat title="Active Alerts"  value={alerts?.total ?? '—'} icon={Bell}         accent="amber"   description="Unread AI alerts" />
      </div>

      {/* Market summary */}
      <MarketSummaryCard />

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card relative overflow-hidden p-5 xl:col-span-2">
          <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Sector Performance
          </h3>
          <SectorHeatmap data={sector?.sectors || []} />
        </div>

        <div className="card relative overflow-hidden p-5">
          <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/50 to-transparent" />
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <Activity className="h-4 w-4 text-fuchsia-400" />
            System Health
          </h3>
          <div className="space-y-3">
            <HealthRow icon={CheckCircle}   label="Completed Jobs" value={logStats?.completed ?? 0}         tone="emerald" />
            <HealthRow icon={AlertTriangle} label="Failed Jobs"    value={logStats?.failed ?? 0}            tone="rose" />
            <HealthRow icon={BarChart2}     label="Success Rate"   value={`${logStats?.successRate ?? 0}%`} tone="cyan" />
            {logStats?.lastRun && (
              <p className="pt-1 text-center font-mono text-[11px] text-slate-400">
                Last run: {new Date(logStats.lastRun).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DataTable title="Top Upper Circuit" description="Stocks at upper price band" columns={moversColumns} data={upper?.data ?? []} loading={!upper} />
        <DataTable title="Top Lower Circuit" description="Stocks at lower price band" columns={moversColumns} data={lower?.data ?? []} loading={!lower} />
      </div>

      {/* AI alerts */}
      <DataTable title="Recent AI Alerts" description="Latest automated alerts" columns={alertColumns} data={alerts?.data ?? []} loading={!alerts} />
    </div>
  );
}
