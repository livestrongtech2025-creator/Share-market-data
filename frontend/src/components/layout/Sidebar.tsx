'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, TrendingDown, TrendingUp, BarChart2, Activity,
  Database, Brain, Zap, PieChart, History, Star, FileText,
  Settings, LogOut, Bell, Sun, Moon, Menu, X, MessageSquare
} from 'lucide-react';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const navItems = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Lower Band Hitters', href: '/lower-band', icon: TrendingDown },
  { label: 'Upper Band Hitters', href: '/upper-band', icon: TrendingUp },
  { label: 'Volume Gainers', href: '/volume-gainers', icon: BarChart2 },
  { label: 'Most Active', href: '/most-active', icon: Activity },
  { label: 'Bhav Copy', href: '/bhav-copy', icon: Database },
  { label: 'AI Insights', href: '/ai-insights', icon: Brain },
  { label: 'AI Signals', href: '/ai-signals', icon: Zap },
  { label: 'Sector Analytics', href: '/sector-analytics', icon: PieChart },
  { label: 'Historical', href: '/historical', icon: History },
  { label: 'Watchlists', href: '/watchlists', icon: Star },
  { label: 'AI Chat', href: '/chat', icon: MessageSquare },
  { label: 'Job Logs', href: '/logs', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

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
    <aside className={clsx(
      'fixed left-0 top-0 h-screen flex flex-col bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-700 z-40 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white leading-none">NSE Analytics</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Market Intelligence</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-gray-100',
                collapsed && 'justify-center'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 dark:border-dark-700 space-y-1">
        <button
          onClick={toggleTheme}
          className={clsx('flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors', collapsed && 'justify-center')}
          title={collapsed ? 'Toggle theme' : undefined}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={clsx('flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors', collapsed && 'justify-center')}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
