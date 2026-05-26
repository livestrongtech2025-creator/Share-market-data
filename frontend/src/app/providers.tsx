'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useAuthStore(s => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  if (!mounted) return null;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#1e293b', border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}` },
        }}
      />
    </QueryClientProvider>
  );
}
