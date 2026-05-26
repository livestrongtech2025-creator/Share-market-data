'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 transition-all duration-300">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
