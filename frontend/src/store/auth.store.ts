import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  theme: 'dark' | 'light';
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      theme: 'dark',

      setAuth: (user, token) => {
        Cookies.set('auth_token', token, { expires: 7, sameSite: 'strict' });
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true });
      },

      clearAuth: () => {
        Cookies.remove('auth_token');
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      setTheme: (theme) => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        set({ theme });
      },

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          if (newTheme === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return { theme: newTheme };
        }),
    }),
    {
      name: 'nse-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated, theme: state.theme }),
    }
  )
);
