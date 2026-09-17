"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

/** Prepare the same website for Telegram Mini App and normal browser use. */
export function TelegramMiniAppBridge() {
  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (!app) return;
    app.ready?.();
    app.expand?.();
    app.setHeaderColor?.("#10100e");
    app.setBackgroundColor?.("#10100e");
  }, []);

  return null;
}
