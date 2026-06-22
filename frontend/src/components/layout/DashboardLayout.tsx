'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import Sidebar from './Sidebar';
import Header from './Header';

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'admin@nseanalytics.com';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'Admin@123';

function NeonBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Subtle grid texture */}
      <div className="absolute inset-0 bg-grid opacity-50" />

      {/* Cyan blob — top-left */}
      <div
        className="aurora-blob -top-40 -left-32 h-[640px] w-[640px] bg-gradient-to-br from-cyan-400/30 via-cyan-500/15 to-transparent dark:from-cyan-500/30 dark:via-cyan-500/15"
      />

      {/* Magenta blob — top-right */}
      <div
        className="aurora-blob -top-20 -right-40 h-[720px] w-[720px] bg-gradient-to-bl from-fuchsia-400/25 via-pink-500/15 to-transparent dark:from-fuchsia-500/30 dark:via-fuchsia-500/15"
        style={{ animationDelay: '-9s' }}
      />

      {/* Violet blob — bottom-left */}
      <div
        className="aurora-blob bottom-0 left-1/4 h-[560px] w-[560px] bg-gradient-to-tr from-violet-400/25 via-indigo-500/12 to-transparent dark:from-violet-500/25 dark:via-indigo-500/12"
        style={{ animationDelay: '-16s' }}
      />

      {/* Scanline shimmer — top edge accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth } = useAuthStore();
  const [autoLoginFailed, setAutoLoginFailed] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.login(DEMO_EMAIL, DEMO_PASSWORD);
        if (cancelled) return;
        setAuth(res.data.user, res.data.accessToken);
      } catch {
        if (!cancelled) setAutoLoginFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setAuth]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        {autoLoginFailed ? 'Unable to connect. Please refresh the page.' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen">
      <NeonBackdrop />
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col transition-all duration-300">
        <Header />
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
