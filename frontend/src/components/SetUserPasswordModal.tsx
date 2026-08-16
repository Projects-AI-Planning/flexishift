import React, { useState } from 'react';
import adminService from '../api/adminService';

export function canAdminSetPassword(role?: string) {
  const r = (role || '').toUpperCase();
  return r === 'DRIVER' || r === 'HAULIER' || r === 'FIRM';
}

function validatePassword(password: string): string {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/\d/.test(password)) return 'Password must contain a digit';
  return '';
}

export const AdminPasswordField: React.FC<{ onChangePassword: () => void }> = ({ onChangePassword }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Password</p>
    <div className="flex items-center gap-3">
      <p className="text-sm font-bold text-primary tracking-[0.35em]">••••••••</p>
      <button
        type="button"
        onClick={onChangePassword}
        className="text-xs font-black text-primary hover:underline"
      >
        Change
      </button>
    </div>
    <p className="text-[11px] font-medium text-slate-400 mt-1">
      Stored securely — the current password cannot be displayed. Set a new one to share with this user.
    </p>
  </div>
);

interface SetUserPasswordModalProps {
  userId: string;
  userName: string;
  roleLabel?: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

const SetUserPasswordModal: React.FC<SetUserPasswordModalProps> = ({
  userId,
  userName,
  roleLabel,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const strengthError = validatePassword(password);
    if (strengthError) {
      setError(strengthError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await adminService.setUserPassword(userId, password);
      setSavedPassword(password);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; detail?: unknown } } })?.response?.data;
      const detail = data?.detail;
      const detailText = Array.isArray(detail)
        ? detail.map((item: { msg?: string }) => item?.msg).filter(Boolean).join('. ')
        : typeof detail === 'string'
          ? detail
          : '';
      setError(data?.message || detailText || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(savedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const finish = () => {
    onSuccess?.(`Password updated for ${userName}.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-primary">Set Password</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {userName}{roleLabel ? ` · ${roleLabel}` : ''}
            </p>
          </div>
          <button onClick={savedPassword ? finish : onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {savedPassword ? (
          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-green-600">check_circle</span>
              <p className="text-sm font-bold text-green-800">
                Password updated. Copy it now — the previous password cannot be recovered, and this new one will not be shown again.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New password</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  type={showPassword ? 'text' : 'password'}
                  value={savedPassword}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                  title={showPassword ? 'Hide' : 'Show'}
                >
                  <span className="material-symbols-outlined text-sm">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void copyPassword()}
                  className="px-3 py-2 text-xs font-black text-primary bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={finish}
                className="px-5 py-2 text-sm font-black text-white bg-primary rounded-xl hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
            <p className="text-sm text-slate-600 font-medium">
              The current password is hashed and cannot be displayed. Set a new password for this {roleLabel?.toLowerCase() || 'user'}.
            </p>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New password</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent py-2 px-3 text-sm outline-none"
                  placeholder="At least 8 characters, 1 uppercase, 1 digit"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="px-3 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-sm">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirm password</label>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="Re-enter new password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 font-bold bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-black text-[#44474C] bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-black text-white bg-primary rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                Set Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SetUserPasswordModal;
