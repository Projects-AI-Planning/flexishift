import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { Truck } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const profile = profileResponse.data?.data;

      login(accessToken, refreshToken, {
        userId: profile?.userId ?? authData?.userId,
        email: profile?.email ?? email,
        name: profile?.name ?? email.split('@')[0],
        role: profile?.role ?? authData?.role,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Login failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="block text-sm font-semibold text-navy mb-2">Password</label>
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
        
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>FreightFlex Logistics Platform v1.0</p>
          <p className="mt-1">Use a real backend account to sign in</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
