'use client';

import { useState } from 'react';
import { Bell, Search, RefreshCw, Command } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { aiApi, adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { format } from 'date-fns';

export default function Header() {
  const { user } = useAuthStore();
  const [triggering, setTriggering] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => aiApi.getUnreadCount().then(r => r.data),
    refetchInterval: 60 * 1000,
  });

  const handleTrigger = async () => {
    if (user?.role !== 'admin') {
      toast.error('Admin access required');
      return;
    }
    setTriggering(true);
    try {
      const res = await adminApi.triggerIngestion();
      toast.success(`Ingestion ${res.data.success ? 'completed' : 'failed'}: ${res.data.records} records`);
    } catch {
      toast.error('Failed to trigger ingestion');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] backdrop-blur-2xl bg-white/60 dark:bg-[#05070d]/70">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        {/* Search */}
        <div className="max-w-md flex-1">
          <div className="group relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-400" />
            <input
              type="text"
              placeholder="Search symbols, sectors, signals..."
              className="input h-10 pl-10 pr-16 text-sm"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded-md border border-white/10 bg-white/40 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:bg-white/[0.04] dark:text-slate-400 sm:inline-flex">
              <Command className="h-3 w-3" /> K
            </kbd>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Live clock */}
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/40 px-3 py-1.5 text-xs text-slate-600 backdrop-blur-md dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300 md:flex">
            <span className="live-dot" />
            <span className="font-mono tabular-nums">{format(new Date(), 'HH:mm')} IST</span>
            <span className="text-slate-400">·</span>
            <span>{format(new Date(), 'dd MMM')}</span>
          </div>

          {user?.role === 'admin' && (
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="btn-secondary btn-sm gap-1.5"
              title="Trigger Manual Ingestion"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${triggering ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}

          {/* Notification bell */}
          <button
            className="relative rounded-xl p-2.5 text-slate-500 transition-all hover:bg-cyan-500/10 hover:text-cyan-500 dark:text-slate-400 dark:hover:text-cyan-300"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {(unreadData?.count || 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 text-[10px] font-bold text-white shadow-glow-rose">
                {unreadData!.count > 9 ? '9+' : unreadData!.count}
              </span>
            )}
          </button>

          {/* Avatar */}
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-glow-cyan">
            {user?.name?.charAt(0).toUpperCase()}
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 opacity-40 blur-md -z-10" />
          </div>
        </div>
      </div>
    </header>
  );
}
