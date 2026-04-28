import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  userId: string;
  email: string;
  role: 'ADMIN' | 'HAULIER' | 'SUPPLIER' | 'FIRM' | 'DRIVER' | 'USER';
  name: string;
};

type AuthContextType = {
  user: User | null;
  login: (token: string, refreshToken: string | null, user: User) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (user: User): User => ({
  ...user,
  role: user.role === 'SUPPLIER' || user.role === 'FIRM' ? 'HAULIER' : user.role,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(normalizeUser(JSON.parse(savedUser) as User));
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, refreshToken: string | null, userData: User) => {
    const normalizedUser = normalizeUser(userData);
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
