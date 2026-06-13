import React, { useState } from 'react';
import type { User } from '../types';
import { AuthContext } from './AuthContextValue';
import { setDisplayCurrency } from '../utils/currency';

const normalizeUser = (user: User): User => ({
  ...user,
  role: user.role === 'SUPPLIER' || user.role === 'FIRM' ? 'HAULIER' : user.role,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (savedUser && token) {
        const u = normalizeUser(JSON.parse(savedUser) as User);
        setDisplayCurrency(u.currency);   // app-wide display currency = user's country currency
        return u;
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
    }

    return null;
  });

  const [isLoading] = useState(false);

  const login = (token: string, refreshToken: string | null, userData: User) => {
    const normalizedUser = normalizeUser(userData);
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setDisplayCurrency(normalizedUser.currency);
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setDisplayCurrency(null);
    setUser(null);
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = normalizeUser({ ...prev, ...patch });
      localStorage.setItem('user', JSON.stringify(updated));
      setDisplayCurrency(updated.currency);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
