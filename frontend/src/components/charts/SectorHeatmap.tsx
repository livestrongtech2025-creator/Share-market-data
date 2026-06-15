'use client';
import clsx from 'clsx';

interface SectorData { sector: string; avg_change: number; sentiment: string; stock_count: number; }

interface Props { data: SectorData[]; loading?: boolean; }

function getStyle(change: number): { bg: string; glow: string } {
  if (change > 2)  return { bg: 'from-emerald-400 via-teal-500 to-cyan-500', glow: 'shadow-glow-emerald' };
  if (change > 1)  return { bg: 'from-emerald-500 via-emerald-600 to-teal-600', glow: 'shadow-[0_4px_16px_-4px_rgba(16,185,129,0.45)]' };
  if (change > 0)  return { bg: 'from-emerald-600/80 to-teal-700/80', glow: '' };
  if (change > -1) return { bg: 'from-rose-600/80 to-pink-700/80', glow: '' };
  if (change > -2) return { bg: 'from-rose-500 via-rose-600 to-pink-700', glow: 'shadow-[0_4px_16px_-4px_rgba(244,63,94,0.45)]' };
  return { bg: 'from-rose-400 via-pink-500 to-fuchsia-600', glow: 'shadow-glow-rose' };
}

export default function SectorHeatmap({ data, loading }: Props) {
  if (loading) return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  );
  if (!data?.length) return <div className="py-12 text-center text-sm text-slate-400">No sector data</div>;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
      {data.map(s => {
        const style = getStyle(s.avg_change);
        return (
          <div
            key={s.sector}
            className={clsx(
              'group relative cursor-default overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 text-center text-white transition-all duration-300 hover:scale-[1.04]',
              style.bg, style.glow,
            )}
          >
            {/* Subtle inner highlight */}
            <span className="absolute inset-x-0 top-0 h-px bg-white/30" />
            <span className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/20 blur-xl transition group-hover:scale-150" />

            <div className="relative">
              <p className="text-sm font-bold tracking-wide">{s.sector}</p>
              <p className="mt-1.5 font-mono text-xl font-extrabold tabular-nums">
                {s.avg_change >= 0 ? '+' : ''}{s.avg_change?.toFixed(2)}%
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider opacity-80">
                {s.stock_count} stocks
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
