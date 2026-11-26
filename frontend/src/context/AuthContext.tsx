"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getStoredToken, setStoredToken } from "@/lib/api";
import type { User } from "@/types/dti";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => Promise<{ user: User; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const data = await api.auth.me();
      setUser(data.user);
      return data.user;
    } catch {
      setStoredToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshUser();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await api.auth.login({ email, password });
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
    }): Promise<{ user: User; message: string }> => {
      const res = await api.auth.register(payload);
      setStoredToken(res.token);
      setUser(res.user);
      return { user: res.user, message: res.message };
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await api.auth.logout();
      }
    } catch {
      // Clear local session even if token was already invalidated.
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
