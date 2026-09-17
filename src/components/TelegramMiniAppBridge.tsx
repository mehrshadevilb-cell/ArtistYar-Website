"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        disableVerticalSwipes?: () => void;
        onEvent?: (event: string, callback: () => void) => void;
        offEvent?: (event: string, callback: () => void) => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        viewportStableHeight?: number;
        contentSafeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
      };
    };
  }
}

/** Prepare the same website for Telegram Mini App and normal browser use. */
export function TelegramMiniAppBridge() {
  useEffect(() => {
    let app: NonNullable<NonNullable<Window["Telegram"]>["WebApp"]> | undefined;
    let poll: number | undefined;
    let attempts = 0;

    const connect = () => {
      app = window.Telegram?.WebApp;
      if (!app) {
        if (attempts++ < 100) poll = window.setTimeout(connect, 50);
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
      };

      app.ready?.();
      app.expand?.();
      app.disableVerticalSwipes?.();
      app.setHeaderColor?.("#10100e");
      app.setBackgroundColor?.("#10100e");
      syncViewport();
      app.onEvent?.("viewportChanged", syncViewport);

      cleanup = () => {
        app?.offEvent?.("viewportChanged", syncViewport);
      };
    };
    let cleanup = () => undefined;
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
