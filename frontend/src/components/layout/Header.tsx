'use client';

import { useState } from 'react';
import { Bell, Search, RefreshCw } from 'lucide-react';
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
    } catch (err: any) {
      toast.error('Failed to trigger ingestion');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search symbols..."
            className="input pl-9 bg-gray-50 dark:bg-dark-700 border-gray-200 dark:border-dark-600 text-sm h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          {format(new Date(), 'EEE, dd MMM yyyy HH:mm')} IST
        </span>

        {user?.role === 'admin' && (
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="btn-secondary btn-sm gap-1.5"
            title="Trigger Manual Ingestion"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        )}

        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400">
          <Bell className="w-5 h-5" />
          {(unreadData?.count || 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadData?.count > 9 ? '9+' : unreadData?.count}
            </span>
          )}
        </button>

        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
