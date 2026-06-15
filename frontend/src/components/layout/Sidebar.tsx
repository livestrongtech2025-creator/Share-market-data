'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, TrendingDown, TrendingUp, BarChart2, Activity,
  Database, Brain, Zap, PieChart, History, Star, FileText,
  Settings, LogOut, Sun, Moon, Menu, X, MessageSquare, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface NavItem { label: string; href: string; icon: any; group: string; }

const navItems: NavItem[] = [
  { label: 'Overview',           href: '/overview',         icon: LayoutDashboard, group: 'Markets' },
  { label: 'Upper Band Hitters', href: '/upper-band',       icon: TrendingUp,      group: 'Markets' },
  { label: 'Lower Band Hitters', href: '/lower-band',       icon: TrendingDown,    group: 'Markets' },
  { label: 'Volume Gainers',     href: '/volume-gainers',   icon: BarChart2,       group: 'Markets' },
  { label: 'Most Active',        href: '/most-active',      icon: Activity,        group: 'Markets' },
  { label: 'Bhav Copy',          href: '/bhav-copy',        icon: Database,        group: 'Markets' },

  { label: 'AI Insights',        href: '/ai-insights',      icon: Brain,           group: 'Intelligence' },
  { label: 'AI Signals',         href: '/ai-signals',       icon: Zap,             group: 'Intelligence' },
  { label: 'AI Chat',            href: '/chat',             icon: MessageSquare,   group: 'Intelligence' },

  { label: 'Sector Analytics',   href: '/sector-analytics', icon: PieChart,        group: 'Tools' },
  { label: 'Historical',         href: '/historical',       icon: History,         group: 'Tools' },
  { label: 'Watchlists',         href: '/watchlists',       icon: Star,            group: 'Tools' },

  { label: 'Job Logs',           href: '/logs',             icon: FileText,        group: 'System' },
  { label: 'Settings',           href: '/settings',         icon: Settings,        group: 'System' },
];

const groupOrder = ['Markets', 'Intelligence', 'Tools', 'System'];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth, theme, toggleTheme } = useAuthStore();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300',
        'border-r border-white/[0.06] backdrop-blur-2xl',
        'bg-gradient-to-b from-white/70 via-white/50 to-white/40',
        'dark:from-[#0a0f1c]/90 dark:via-[#080c17]/80 dark:to-[#05070d]/90',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Brand */}
      <div className="relative flex items-center justify-between border-b border-white/5 px-4 py-4 dark:border-white/5">
        {!collapsed && (
          <Link href="/overview" className="flex items-center gap-2.5 group">
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 shadow-glow-cyan transition-transform group-hover:scale-105">
              <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.5} />
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 opacity-50 blur-md -z-10" />
            </div>
            <div>
              <p className="gradient-text-strong text-sm font-extrabold leading-none tracking-tight">
                NSE Analytics
              </p>
              <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
                AI-Powered
              </p>
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-cyan-500/10 hover:text-cyan-500 dark:hover:text-cyan-300"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groupOrder.map(group => {
          const items = navItems.filter(n => n.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {group}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ label, href, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={clsx('sidebar-link', isActive && 'active', collapsed && 'justify-center px-0')}
                    >
                      <Icon className={clsx('h-4 w-4 flex-shrink-0', isActive && 'drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]')} strokeWidth={isActive ? 2.5 : 2} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-white/5 p-2 dark:border-white/5">
        <button
          onClick={toggleTheme}
          className={clsx('sidebar-link w-full', collapsed && 'justify-center')}
          title={collapsed ? 'Toggle theme' : undefined}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-violet-400" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {!collapsed && user && (
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/30 p-2.5 backdrop-blur-md dark:bg-white/[0.03]">
            <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-cyan-400/15 blur-2xl" />
            <div className="relative flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-xs font-bold text-white shadow-glow-cyan">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={clsx(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-rose-500 transition-all hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300',
            collapsed && 'justify-center',
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
