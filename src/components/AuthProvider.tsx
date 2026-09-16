"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSession,
  login as doLogin,
  logout as doLogout,
  registerLocal,
  saveSession,
  type SessionUser,
} from "@/lib/auth";

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  login: (username: string, password: string) => { ok: true } | { ok: false; error: string };
  register: (input: {
    username: string;
    password: string;
    fullName: string;
  }) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  linkTelegram: (telegramId: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getSession());
    setReady(true);
  }, []);

  const login = useCallback((username: string, password: string) => {
    const session = doLogin(username, password);
    if (!session) return { ok: false as const, error: "نام کاربری یا رمز عبور نادرست است." };
    setUser(session);
    return { ok: true as const };
  }, []);

  const register = useCallback(
    (input: { username: string; password: string; fullName: string }) => {
      const result = registerLocal(input);
      if ("error" in result) return { ok: false as const, error: result.error };
      setUser(result);
      return { ok: true as const };
    },
    [],
  );

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
  }, []);

  const linkTelegram = useCallback(
    (telegramId: string) => {
      if (!user) return;
      const next = { ...user, telegramLinked: true, telegramId };
      saveSession(next);
      setUser(next);
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, ready, login, register, logout, linkTelegram }),
    [user, ready, login, register, logout, linkTelegram],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
