'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';
import { Settings, User, Shield, Sun, Moon, Palette } from 'lucide-react';
import clsx from 'clsx';

export default function SettingsPage() {
  const { user, theme, setTheme } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile({ name });
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { toast.error('Fill both password fields'); return; }
    setSaving(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw('');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Manage your account and preferences"
        accent="violet"
      />

      {/* Profile */}
      <div className="card relative overflow-hidden p-5">
        <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          <User className="h-4 w-4 text-cyan-400" /> Profile
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</label>
            <input value={user?.email || ''} disabled className="input cursor-not-allowed opacity-60" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</label>
            <input value={user?.role || ''} disabled className="input cursor-not-allowed capitalize opacity-60" />
          </div>
          <button onClick={handleUpdateProfile} disabled={saving} className="btn-primary btn-sm">Save Changes</button>
        </div>
      </div>

      {/* Appearance */}
      <div className="card relative overflow-hidden p-5">
        <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/50 to-transparent" />
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          <Palette className="h-4 w-4 text-fuchsia-400" /> Appearance
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={clsx(
              'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all',
              theme === 'light'
                ? 'border-cyan-400/60 bg-cyan-500/10 shadow-glow-cyan'
                : 'border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.03]',
            )}
          >
            <Sun className="h-6 w-6 text-amber-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={clsx(
              'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all',
              theme === 'dark'
                ? 'border-cyan-400/60 bg-cyan-500/10 shadow-glow-cyan'
                : 'border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.03]',
            )}
          >
            <Moon className="h-6 w-6 text-violet-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dark</span>
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card relative overflow-hidden p-5">
        <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/50 to-transparent" />
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          <Shield className="h-4 w-4 text-rose-400" /> Security
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Password</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="input" />
          </div>
          <button onClick={handleChangePassword} disabled={saving} className="btn-primary btn-sm">Update Password</button>
        </div>
      </div>
    </div>
  );
}
