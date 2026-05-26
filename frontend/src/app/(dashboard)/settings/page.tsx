'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings, User, Bell, Shield, Sun, Moon } from 'lucide-react';

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
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-500 flex items-center justify-center"><Settings className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1><p className="text-sm text-gray-500">Manage your account and preferences</p></div>
      </div>

      {/* Profile */}
      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4"><User className="w-4 h-4" /> Profile</h3>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label><input value={name} onChange={e => setName(e.target.value)} className="input" /></div>
          <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label><input value={user?.email || ''} disabled className="input opacity-60 cursor-not-allowed" /></div>
          <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label><input value={user?.role || ''} disabled className="input opacity-60 cursor-not-allowed capitalize" /></div>
          <button onClick={handleUpdateProfile} disabled={saving} className="btn-primary btn-sm">Save Changes</button>
        </div>
      </div>

      {/* Appearance */}
      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4"><Sun className="w-4 h-4" /> Appearance</h3>
        <div className="flex gap-3">
          <button onClick={() => setTheme('light')} className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${theme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-dark-600'}`}>
            <Sun className="w-5 h-5 text-yellow-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Light</span>
          </button>
          <button onClick={() => setTheme('dark')} className={`flex-1 p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-dark-600'}`}>
            <Moon className="w-5 h-5 text-blue-400" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark</span>
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4"><Shield className="w-4 h-4" /> Security</h3>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Current Password</label><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="input" /></div>
          <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="input" /></div>
          <button onClick={handleChangePassword} disabled={saving} className="btn-primary btn-sm">Update Password</button>
        </div>
      </div>
    </div>
  );
}
