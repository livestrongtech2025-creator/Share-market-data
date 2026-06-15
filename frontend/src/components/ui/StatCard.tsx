import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  loading?: boolean;
}

// Map legacy `bg-X-500` strings to neon gradient + glow combos.
const LEGACY_MAP: Record<string, { gradient: string; glow: string }> = {
  'bg-blue-500':    { gradient: 'from-cyan-400 via-sky-500 to-blue-500',          glow: 'shadow-glow-cyan' },
  'bg-green-500':   { gradient: 'from-emerald-400 via-teal-500 to-cyan-500',      glow: 'shadow-glow-emerald' },
  'bg-red-500':     { gradient: 'from-rose-400 via-pink-500 to-fuchsia-500',      glow: 'shadow-glow-rose' },
  'bg-teal-500':    { gradient: 'from-teal-400 via-cyan-500 to-sky-500',          glow: 'shadow-glow-cyan' },
  'bg-yellow-500':  { gradient: 'from-amber-400 via-orange-500 to-rose-500',      glow: 'shadow-glow-amber' },
  'bg-purple-500':  { gradient: 'from-violet-400 via-purple-500 to-fuchsia-500',  glow: 'shadow-glow-violet' },
  'bg-violet-500':  { gradient: 'from-violet-400 via-purple-500 to-fuchsia-500',  glow: 'shadow-glow-violet' },
  'bg-cyan-500':    { gradient: 'from-cyan-400 via-sky-500 to-blue-500',          glow: 'shadow-glow-cyan' },
  'bg-amber-500':   { gradient: 'from-amber-400 via-orange-500 to-rose-500',      glow: 'shadow-glow-amber' },
  'bg-indigo-500':  { gradient: 'from-indigo-400 via-violet-500 to-fuchsia-500',  glow: 'shadow-glow-violet' },
  'bg-pink-500':    { gradient: 'from-fuchsia-400 via-pink-500 to-rose-500',      glow: 'shadow-glow-magenta' },
  'bg-orange-500':  { gradient: 'from-amber-400 via-orange-500 to-rose-500',      glow: 'shadow-glow-amber' },
  'bg-slate-500':   { gradient: 'from-slate-400 via-slate-500 to-slate-600',      glow: '' },
  'bg-gray-500':    { gradient: 'from-slate-400 via-slate-500 to-slate-600',      glow: '' },
  'bg-primary-500': { gradient: 'from-cyan-400 via-violet-500 to-fuchsia-500',    glow: 'shadow-glow-cyan' },
};

export function StatCard({ title, value, change, icon: Icon, iconColor = 'bg-primary-500', description, loading }: StatCardProps) {
  const { gradient, glow } = LEGACY_MAP[iconColor] ?? LEGACY_MAP['bg-primary-500'];

  if (loading) return (
    <div className="stat-card">
      <div className="skeleton mb-3 h-4 w-24" />
      <div className="skeleton mb-2 h-8 w-32" />
      <div className="skeleton h-3 w-20" />
    </div>
  );

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          {change !== undefined && (
            <p className={clsx(
              'mt-1 font-mono text-sm font-semibold',
              change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
            )}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </p>
          )}
          {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <div className={clsx('relative ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', gradient, glow)}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
          <span className={clsx('absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br opacity-40 blur-md', gradient)} />
        </div>
      </div>
    </div>
  );
}
