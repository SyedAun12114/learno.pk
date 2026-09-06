import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface User {
  id: number;
  email: string;
  role: 'student' | 'admin';
  isOnboarded: boolean;
}

interface AuthCtx {
  user: User | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, name: string): Promise<User>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const r = await api.get<{ success: boolean; data: User }>('/auth/me');
      if (r.data.success) setUser(r.data.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const r = await api.post<{ success: boolean; data: User }>('/auth/login', { email, password });
    if (!r.data.success) throw new Error('Login failed');
    setUser(r.data.data);
  };

  const register = async (email: string, password: string, name: string): Promise<User> => {
    const r = await api.post<{ success: boolean; data: User }>('/auth/register', { email, password, name });
    if (!r.data.success) throw new Error('Registration failed');
    setUser(r.data.data);
    return r.data.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
