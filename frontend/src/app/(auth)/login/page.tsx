'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.email, data.password);
      setAuth(res.data.user, res.data.accessToken);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      router.push('/overview');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">NSE Analytics</h1>
          <p className="text-gray-400 mt-1">AI-Powered Market Intelligence</p>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input bg-dark-700 border-dark-600 text-white placeholder-gray-500"
                placeholder="admin@nseanalytics.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input bg-dark-700 border-dark-600 text-white placeholder-gray-500 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? (
                <span className="flex items-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Signing in...</span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-dark-700">
            <p className="text-xs text-gray-500 text-center">
              Default: admin@nseanalytics.com / Admin@123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
