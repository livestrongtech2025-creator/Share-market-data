'use client';
import clsx from 'clsx';

interface SectorData { sector: string; avg_change: number; sentiment: string; stock_count: number; }

interface Props { data: SectorData[]; loading?: boolean; }

function getColor(change: number): string {
  if (change > 2) return 'bg-green-600 dark:bg-green-600';
  if (change > 1) return 'bg-green-500 dark:bg-green-500';
  if (change > 0) return 'bg-green-400/70 dark:bg-green-700';
  if (change > -1) return 'bg-red-400/70 dark:bg-red-700';
  if (change > -2) return 'bg-red-500 dark:bg-red-500';
  return 'bg-red-600 dark:bg-red-600';
}

export default function SectorHeatmap({ data, loading }: Props) {
  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-20 rounded-lg" />)}
    </div>
  );
  if (!data?.length) return <div className="text-center py-8 text-gray-400 text-sm">No sector data</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {data.map(s => (
        <div key={s.sector} className={clsx('rounded-xl p-3 text-white text-center cursor-default transition-transform hover:scale-105', getColor(s.avg_change))}>
          <p className="font-semibold text-sm">{s.sector}</p>
          <p className="text-xl font-bold mt-1">{s.avg_change >= 0 ? '+' : ''}{s.avg_change?.toFixed(2)}%</p>
          <p className="text-xs opacity-75 mt-0.5">{s.stock_count} stocks</p>
        </div>
      ))}
    </div>
  );
}
