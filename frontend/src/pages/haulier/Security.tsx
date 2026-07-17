import { useState } from 'react';
import haulierService from '../../api/haulierService';

export default function HaulierSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await haulierService.changePassword({
        currentPassword,
        newPassword,
      });
      setMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const deactivateAccount = async () => {
    setDeactivating(true);
    setMessage(null);
    setError(null);
    try {
      await haulierService.deactivateAccount({ password: deactivatePassword });
      setMessage('Account deactivated successfully.');
    } catch {
      setError('Failed to deactivate account.');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1066b1]">Haulier Settings</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">Security</h1>
        <p className="text-on-surface-variant font-medium">Change your password or deactivate the account using backend endpoints.</p>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-primary">Change Password</h2>
          <p className="text-sm text-slate-500">Uses `PUT /auth/change-password` behind the scenes.</p>

          <div className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Current Password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <button
              onClick={() => void changePassword()}
              disabled={saving}
              className="rounded-xl bg-primary px-6 py-3 text-xs font-black text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-rose-700">Deactivate Account</h2>
          <p className="text-sm text-slate-500">Uses `PUT /profile/deactivate` and can be protected by password confirmation.</p>

          <div className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Password Confirmation</span>
              <input
                type="password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <button
              onClick={() => void deactivateAccount()}
              disabled={deactivating}
              className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {deactivating ? 'Processing...' : 'Deactivate Account'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
