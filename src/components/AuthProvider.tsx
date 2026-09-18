"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearLocalSession,
  getSession,
  loginViaApi,
  logout as doLogout,
  registerLocal,
  saveSession,
  type SessionUser,
} from "@/lib/auth";

/** Shared Telegram Mini App surface used across the site. */
export type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  onEvent?: (event: string, callback: () => void) => void;
  offEvent?: (event: string, callback: () => void) => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  viewportStableHeight?: number;
  contentSafeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink?: (url: string) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

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

async function loadTelegramSdk(): Promise<void> {
  if (typeof window === "undefined" || window.Telegram?.WebApp) return;

  await new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-telegram-webapp="1"]',
    );

    if (existing) {
      if (window.Telegram?.WebApp) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.dataset.telegramWebapp = "1";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

async function authenticateTelegram(): Promise<SessionUser | null> {
  if (typeof window === "undefined") return null;

  const webApp = window.Telegram?.WebApp;
  if (!webApp?.initData) return null;

  webApp.ready?.();
  webApp.expand?.();

  try {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ initData: webApp.initData }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.authenticated && data.user) {
      return data.user as SessionUser;
    }
  } catch {
    // Continue with normal session authentication.
  }

  return null;
}

async function authenticateExistingSession(): Promise<SessionUser | null> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data?.authenticated && data.user) {
        return data.user as SessionUser;
      }
    }
  } catch {
    // Fall back to the local student session below.
  }

  const local = getSession();
  if (local?.role === "admin") {
    clearLocalSession();
    return null;
  }
  return local;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      await loadTelegramSdk();

      const telegramUser = await authenticateTelegram();
      if (cancelled) return;

      if (telegramUser) {
        saveSession(telegramUser);
        setUser(telegramUser);
        setReady(true);
        return;
      }

      const sessionUser = await authenticateExistingSession();
      if (cancelled) return;

      if (sessionUser) {
        saveSession(sessionUser);
        setUser(sessionUser);
      }

      setReady(true);
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginViaApi(username, password);
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }

    setUser(result.user);
    return { ok: true as const, user: result.user };
  }, []);

  const register = useCallback(
    (input: { username: string; password: string; fullName: string }) => {
      const result = registerLocal(input);
      if ("error" in result) {
        return { ok: false as const, error: result.error };
      }

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

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
