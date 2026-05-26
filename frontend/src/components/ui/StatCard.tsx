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

export function StatCard({ title, value, change, icon: Icon, iconColor = 'bg-primary-500', description, loading }: StatCardProps) {
  if (loading) return (
    <div className="stat-card">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-32 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={clsx('text-sm mt-1 font-medium', change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </p>
          )}
          {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>}
        </div>
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-4', iconColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
