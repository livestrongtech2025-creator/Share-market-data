import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus, Flame, AlertTriangle } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Props { sentiment: string; score?: number; size?: 'sm' | 'md' }

const config: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  very_bullish: {
    label: 'Very Bullish',
    icon: Flame,
    className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-glow-emerald',
  },
  bullish: {
    label: 'Bullish',
    icon: TrendingUp,
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  neutral: {
    label: 'Neutral',
    icon: Minus,
    className: 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300',
  },
  bearish: {
    label: 'Bearish',
    icon: TrendingDown,
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300',
  },
  very_bearish: {
    label: 'Very Bearish',
    icon: AlertTriangle,
    className: 'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300 shadow-glow-rose',
  },
};

export default function SentimentBadge({ sentiment, score, size = 'md' }: Props) {
  const cfg = config[sentiment] || config.neutral;
  const Icon = cfg.icon;
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide',
      cfg.className,
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.4} />
      {cfg.label}
      {score !== undefined && <span className="font-mono tabular-nums opacity-70">({score}/100)</span>}
    </span>
  );
}
