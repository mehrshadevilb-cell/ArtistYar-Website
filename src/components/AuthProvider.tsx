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
  platform?: string;
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
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
  login: (username: string, password: string) => Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }>;
  register: (input: { username: string; password: string; fullName: string }) => { ok: true; user: SessionUser } | { ok: false; error: string };
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadTelegramSdk(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.Telegram?.WebApp) return;
  if (document.querySelector('script[data-telegram-webapp="1"]')) {
    await new Promise<void>((resolve) => {
      const existing = document.querySelector('script[data-telegram-webapp="1"]');
      if (!existing) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      setTimeout(() => resolve(), 1500);
    });
    return;
  }
  await new Promise<void>((resolve) => {
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
      // Only load telegram-web-app.js inside Telegram clients.
      const maybeTelegram =
        typeof navigator !== "undefined" &&
        /Telegram/i.test(navigator.userAgent || "");

      let telegramUser: SessionUser | null = null;
      if (maybeTelegram) {
        await loadTelegramSdk();
        if (cancelled) return;
        telegramUser = await authenticateTelegram();
        if (cancelled) return;
      }

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
      if (!result.ok) return result;
      setUser(result.user);
      return result;
    },
    [],
  );

  const logout = useCallback(async () => {
    await doLogout();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const sessionUser = await authenticateExistingSession();
    setUser(sessionUser);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, refresh }),
    [user, ready, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
