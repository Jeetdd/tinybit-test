'use client';
import React, { createContext, useContext, useState } from 'react';
import type { AdminUser } from '../types';
import { currentAdmin } from '../data/mockData';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  requiresTwoFactor: boolean;
  verifyOtp: (otp: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  requiresTwoFactor: false,
  verifyOtp: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem('tb-admin-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);

  const login = async (email: string, _password: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 800));
    if (email === 'admin@tinybit.care' || email === currentAdmin.email) {
      setPendingUser(currentAdmin);
      setRequiresTwoFactor(true);
      return true;
    }
    return false;
  };

  const verifyOtp = async (otp: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 600));
    if (otp === '123456' || otp.length === 6) {
      setUser(pendingUser);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tb-admin-user', JSON.stringify(pendingUser));
      }
      setRequiresTwoFactor(false);
      setPendingUser(null);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tb-admin-user');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      requiresTwoFactor,
      verifyOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
