"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { clearSession, readSession, writeSession } from "@/lib/auth-storage";
import type { AuthSession, UserRole } from "@/types/domain";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthSession>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = readSession();
    setSession(current);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiRequest<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    writeSession(result);
    setSession(result);
    return result;
  };

  const register = async (payload: { name: string; email: string; password: string; role: UserRole }) => {
    await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: false,
    });
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  const value = useMemo(
    () => ({
      session,
      loading,
      login,
      register,
      logout,
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
