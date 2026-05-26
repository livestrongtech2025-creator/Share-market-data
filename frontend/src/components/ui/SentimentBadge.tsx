import clsx from 'clsx';

interface Props { sentiment: string; score?: number; size?: 'sm' | 'md' }

const config: Record<string, { label: string; className: string }> = {
  very_bullish:  { label: '🚀 Very Bullish',  className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  bullish:       { label: '📈 Bullish',        className: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
  neutral:       { label: '➡️ Neutral',        className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  bearish:       { label: '📉 Bearish',        className: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
  very_bearish:  { label: '⚠️ Very Bearish',   className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
};

export default function SentimentBadge({ sentiment, score, size = 'md' }: Props) {
  const cfg = config[sentiment] || config.neutral;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 font-medium rounded-full', cfg.className, size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1')}>
      {cfg.label}
      {score !== undefined && <span className="opacity-75">({score}/100)</span>}
    </span>
  );
}
