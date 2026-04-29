import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Truck } from 'lucide-react';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login for now - ideally call backend POST /auth/login
    // For development, we'll allow an 'admin@example.com' to login as ADMIN
    const role = email.includes('admin') ? UserRole.ADMIN : UserRole.HAULIER;
    login('mock-token', {
      userId: '1',
      email,
      name: email.split('@')[0],
      role,
      status: 'ACTIVE',
    });
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
          <button 
            type="submit"
            className="w-full bg-navy text-white font-bold py-3 rounded-lg hover:bg-navy/90 transition-colors shadow-md"
          >
            Sign In
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>FreightFlex Logistics Platform v1.0</p>
          <p className="mt-1">Use 'admin@' in email to login as Admin</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
