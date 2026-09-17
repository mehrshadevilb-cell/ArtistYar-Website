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
  loginViaApi,
  logout as doLogout,
  registerLocal,
  saveSession,
  clearLocalSession,
  type SessionUser,
} from "@/lib/auth";

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }>;
  register: (input: {
    username: string;
    password: string;
    fullName: string;
  }) => { ok: true } | { ok: false; error: string };
  logout: () => Promise<void>;
  linkTelegram: (telegramId: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.authenticated && data.user) {
          saveSession(data.user);
          setUser(data.user);
        } else {
          const local = getSession();
          // An admin session is valid only when the HttpOnly server cookie is
          // valid too. Keeping a stale local admin session causes /admin ->
          // /login -> /admin redirect loops after cookie expiry.
          if (local?.role === "admin") {
            clearLocalSession();
            setUser(null);
          } else {
            setUser(local);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          const local = getSession();
          setUser(local?.role === "admin" ? null : local);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginViaApi(username, password);
    if (!result.ok) return { ok: false as const, error: result.error };
    setUser(result.user);
    return { ok: true as const, user: result.user };
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

  const logout = useCallback(async () => {
    await doLogout();
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
