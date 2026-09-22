"use client";

import { useEffect } from "react";
import type { TelegramWebApp } from "./AuthProvider";

/**
 * Only activate Telegram Mini App chrome when we are actually inside Telegram.
 * The official telegram-web-app.js script exposes a stub WebApp object in normal
 * browsers (platform "unknown", empty initData). Treating that as a real Mini App
 * applied overscroll-behavior:none and other locks that made mobile scrolling feel
 * sticky or frozen.
 */
function isRealTelegramWebApp(app: TelegramWebApp | undefined): app is TelegramWebApp {
  if (!app) return false;
  const platform = String(app.platform || "").toLowerCase();
  if (platform === "unknown" || platform === "") {
    // Real Telegram always provides initData (or a user in initDataUnsafe) inside the client.
    const hasInit = Boolean(app.initData && app.initData.length > 0);
    const hasUser = Boolean(app.initDataUnsafe && (app.initDataUnsafe as { user?: unknown }).user);
    return hasInit || hasUser;
  }
  return true;
}

/** Prepare the same website for Telegram Mini App and normal browser use. */
export function TelegramMiniAppBridge() {
  useEffect(() => {
    let app: TelegramWebApp | undefined;
    let poll: number | undefined;
    let attempts = 0;
    let cleanup = () => undefined;

    const connect = () => {
      app = window.Telegram?.WebApp;
      if (!isRealTelegramWebApp(app)) {
        if (attempts++ < 40) poll = window.setTimeout(connect, 75);
        return;
      }

      document.documentElement.classList.add("telegram-mini-app");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      document.body.classList.add("telegram-mini-app");

      const syncViewport = () => {
        const height = app?.viewportStableHeight || window.innerHeight;
        const inset = app?.contentSafeAreaInset || {};
        document.documentElement.style.setProperty("--tg-viewport-height", `${height}px`);
        document.documentElement.style.setProperty("--tg-safe-top", `${inset.top || 0}px`);
        document.documentElement.style.setProperty("--tg-safe-bottom", `${inset.bottom || 0}px`);
        document.documentElement.style.setProperty("--tg-safe-left", `${inset.left || 0}px`);
        document.documentElement.style.setProperty("--tg-safe-right", `${inset.right || 0}px`);
      };

      app.ready?.();
      app.expand?.();
      // Only disable vertical swipes inside a confirmed Telegram client.
      app.disableVerticalSwipes?.();
      app.setHeaderColor?.("#10100e");
      app.setBackgroundColor?.("#10100e");
      syncViewport();
      app.onEvent?.("viewportChanged", syncViewport);

      cleanup = () => {
        app?.offEvent?.("viewportChanged", syncViewport);
      };
    };

    connect();

    return () => {
      if (poll) window.clearTimeout(poll);
      cleanup();
      document.documentElement.classList.remove("telegram-mini-app");
      document.body.classList.remove("telegram-mini-app");
    };
  }, []);

  return null;
}
