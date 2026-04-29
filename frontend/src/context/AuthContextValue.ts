import { createContext } from 'react';
import type { User } from '../types';

export type AuthContextType = {
  user: User | null;
  login: (token: string, refreshToken: string | null, user: User) => void;
  logout: () => void;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
