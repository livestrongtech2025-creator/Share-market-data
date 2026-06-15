'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { TrendingUp, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const loginSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

type LoginForm = z.infer<typeof loginSchema>;

function NeonBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="aurora-blob -top-32 -left-24 h-[720px] w-[720px] bg-gradient-to-br from-cyan-400/35 via-cyan-500/15 to-transparent dark:from-cyan-500/30 dark:via-cyan-500/15" />
      <div
        className="aurora-blob top-1/4 -right-32 h-[760px] w-[760px] bg-gradient-to-br from-fuchsia-400/30 via-pink-400/15 to-transparent dark:from-fuchsia-500/30 dark:via-pink-500/15"
        style={{ animationDelay: '-9s' }}
      />
      <div
        className="aurora-blob -bottom-20 left-1/4 h-[620px] w-[620px] bg-gradient-to-tr from-violet-400/30 via-indigo-400/15 to-transparent dark:from-violet-500/30 dark:via-indigo-500/15"
        style={{ animationDelay: '-16s' }}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

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
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <NeonBackdrop />

      <div className="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="relative mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 shadow-glow-cyan animate-glow">
            <TrendingUp className="h-8 w-8 text-white" strokeWidth={2.5} />
            <span className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 opacity-60 blur-xl -z-10" />
          </div>
          <h1 className="gradient-text-strong text-4xl font-extrabold tracking-tight">NSE Analytics</h1>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            AI-Powered Market Intelligence
          </p>
        </div>

        <div className="card relative overflow-hidden p-8">
          {/* Top-edge neon stripe */}
          <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              Secure
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="admin@nseanalytics.com"
              />
              {errors.email && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-cyan-500 dark:hover:text-cyan-300"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary group mt-2 w-full py-3 text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Default creds hint */}
          <div className="mt-6 rounded-xl border border-white/10 bg-white/30 p-3 backdrop-blur-md dark:bg-white/[0.03]">
            <div className="flex items-start gap-2">
              <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Demo:{' '}
                <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-300">admin@nseanalytics.com</span>
                {' / '}
                <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-300">Admin@123</span>
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          Not financial advice. Data is for informational purposes only.
        </p>
      </div>
    </div>
  );
}
