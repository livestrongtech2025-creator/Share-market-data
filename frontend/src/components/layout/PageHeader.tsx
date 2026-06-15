import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

type Accent = 'cyan' | 'magenta' | 'violet' | 'emerald' | 'rose' | 'amber' | 'blue' | 'indigo' | 'purple' | 'teal';

const ACCENT_GRADIENTS: Record<Accent, { bg: string; glow: string }> = {
  cyan:    { bg: 'from-cyan-400 via-cyan-500 to-blue-500',         glow: 'shadow-glow-cyan' },
  magenta: { bg: 'from-fuchsia-400 via-pink-500 to-rose-500',      glow: 'shadow-glow-magenta' },
  violet:  { bg: 'from-violet-400 via-purple-500 to-fuchsia-500',  glow: 'shadow-glow-violet' },
  emerald: { bg: 'from-emerald-400 via-teal-500 to-cyan-500',      glow: 'shadow-glow-emerald' },
  rose:    { bg: 'from-rose-400 via-rose-500 to-pink-600',         glow: 'shadow-glow-rose' },
  amber:   { bg: 'from-amber-400 via-orange-500 to-rose-500',      glow: 'shadow-glow-amber' },
  blue:    { bg: 'from-sky-400 via-blue-500 to-indigo-500',        glow: 'shadow-glow-cyan' },
  indigo:  { bg: 'from-indigo-400 via-violet-500 to-fuchsia-500',  glow: 'shadow-glow-violet' },
  purple:  { bg: 'from-purple-400 via-fuchsia-500 to-pink-500',    glow: 'shadow-glow-magenta' },
  teal:    { bg: 'from-teal-400 via-cyan-500 to-sky-500',          glow: 'shadow-glow-cyan' },
};

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: Accent;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export default function PageHeader({ icon: Icon, title, description, accent = 'cyan', actions, badge }: Props) {
  const t = ACCENT_GRADIENTS[accent];
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className={clsx('relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', t.bg, t.glow)}>
          <Icon className="h-5.5 w-5.5" strokeWidth={2.2} />
          <span className={clsx('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50 blur-md -z-10', t.bg)} />
        </div>
        <div>
          {badge && <div className="mb-1.5">{badge}</div>}
          <h1 className="gradient-text-strong text-3xl font-extrabold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
