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

      const profileResponse = await client.get('/profile/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = profileResponse.data?.data;

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
          setError('Email not verified. Please check your inbox or verify your email below.');
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
      await haulierService.forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotSuccess('Password reset instructions have been sent to your email.');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to send reset email.');
      } else {
        setError('Failed to send reset email.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface w-full">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-navy p-3 rounded-full mb-4">
              <Truck className="text-amber" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-navy">Reset Password</h1>
            <p className="text-gray-500 text-sm mt-1">We'll send reset instructions to your email</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6">
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
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode('login'); setError(''); setForgotSuccess(''); }}
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
                onClick={() => { setMode('forgot'); setError(''); }}
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
