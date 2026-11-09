import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PublicUser } from '@rosco/shared';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<PublicUser>;
  login: (email: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleFavorite: (gameId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red.');
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setUser(data.user);
    return data.user as PublicUser;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(data.user);
    return data.user as PublicUser;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await apiFetch('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
  }, []);

  const toggleFavorite = useCallback(
    async (gameId: string) => {
      if (!user) return;
      const next = user.favorites.includes(gameId)
        ? user.favorites.filter((f) => f !== gameId)
        : [...user.favorites, gameId];
      const data = await apiFetch('/api/auth/favorites', { method: 'PUT', body: JSON.stringify({ favorites: next }) });
      setUser(data.user);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, resendVerification, refreshUser, toggleFavorite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
