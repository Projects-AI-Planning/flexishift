import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Truck } from 'lucide-react';
import haulierService from '../api/haulierService';

type LoginMode = 'login' | 'forgot';

const Login: React.FC = () => {
  const [mode, setMode] = useState<LoginMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const loginResponse = await client.post('/auth/login', { email, password });
      const authData = loginResponse.data?.data;
      const accessToken = authData?.accessToken;
      const refreshToken = authData?.refreshToken ?? null;

      if (!accessToken) {
        throw new Error('Login response did not include an access token.');
      }

      let profile: Record<string, string> | null = null;
      try {
        const profileResponse = await client.get('/profile/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        profile = profileResponse.data?.data ?? null;
      } catch {
        // profile fetch is best-effort; proceed with data from login response
      }

      login(accessToken, refreshToken, {
        userId: profile?.userId ?? authData?.userId,
        email: profile?.email ?? email,
        name: profile?.name ?? email.split('@')[0],
        role: profile?.role ?? authData?.role ?? 'USER',
        status: profile?.status ?? authData?.status ?? 'ACTIVE',
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || err.response?.data?.detail;
        if (err.response?.status === 403 && msg?.toLowerCase().includes('verif')) {
          setError('Email not verified. Please check your inbox (and spam/junk folder) for the 6-digit code, then verify below.');
        } else {
          setError(msg || 'Invalid credentials.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    setIsSubmitting(true);
    try {
      const res = await haulierService.forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotOtpSent(true);
      const sent = res?.data?.emailSent !== false;
      setForgotSuccess(
        sent
          ? 'A 6-digit OTP has been sent to your email. Check your inbox and spam/junk folder.'
          : 'OTP generated. Email delivery may be delayed — use Resend OTP if needed.'
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to send OTP.');
      } else {
        setError('Failed to send OTP.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');

    if (!forgotOtp.trim()) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await haulierService.resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });
      setForgotSuccess('Password reset successfully. You can sign in with your new password.');
      setTimeout(() => {
        setMode('login');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotOtpSent(false);
        setForgotSuccess('');
      }, 1800);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to reset password.');
      } else {
        setError('Failed to reset password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface w-full">
        <div className="bg-white p-5 sm:p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-navy p-3 rounded-full mb-4">
              <Truck className="text-amber" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-navy">Reset Password</h1>
            <p className="text-gray-500 text-sm mt-1">
              {forgotOtpSent
                ? 'Enter the OTP and set a new password'
                : "We'll send a 6-digit OTP to your email"}
            </p>
          </div>

          <form onSubmit={forgotOtpSent ? handleResetPassword : handleForgotPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Email Address</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            {forgotOtpSent ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
                    placeholder="6-digit code"
                    maxLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">New Password</label>
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
                    placeholder="Repeat password"
                    required
                  />
                </div>
              </>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}
            {forgotSuccess ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                {forgotSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-navy text-white font-bold py-3 rounded-lg hover:bg-navy/90 transition-colors shadow-md disabled:opacity-60"
            >
              {isSubmitting
                ? forgotOtpSent
                  ? 'Resetting...'
                  : 'Sending OTP...'
                : forgotOtpSent
                ? 'Reset Password'
                : 'Send OTP'}
            </button>

            {forgotOtpSent ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  void handleForgotPassword(event);
                }}
                disabled={isSubmitting}
                className="w-full bg-white text-navy font-bold py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Resend OTP
              </button>
            ) : null}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setForgotSuccess('');
                setForgotOtp('');
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                setForgotOtpSent(false);
              }}
              className="text-sm font-semibold text-navy hover:underline"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface w-full">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-navy p-3 rounded-full mb-4">
            <Truck className="text-amber" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-navy">FreightFlex Login</h1>
          <p className="text-gray-500 text-sm">Logistics Management Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
              placeholder="admin@freightflex.com"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-navy">Password</label>
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError('');
                  setForgotSuccess('');
                  setForgotOtp('');
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                  setForgotOtpSent(false);
                }}
                className="text-xs font-semibold text-gray-500 hover:text-navy transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
              {error.includes('not verified') && (
                <Link
                  to={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="block mt-2 text-blue-700 underline"
                >
                  Verify email →
                </Link>
              )}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-navy text-white font-bold py-3 rounded-lg hover:bg-navy/90 transition-colors shadow-md"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500">
            New haulier?{' '}
            <Link to="/register" className="font-semibold text-navy hover:underline">
              Create an account
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            Registered but not verified?{' '}
            <Link to="/verify-email" className="font-semibold text-navy hover:underline">
              Verify your email
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          <p>FreightFlex Logistics Platform v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
