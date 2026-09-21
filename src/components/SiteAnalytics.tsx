"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const params = new URLSearchParams(window.location.search);
    let visitorId = "";
    try {
      const key = "artistyar_visitor_id";
      visitorId = window.localStorage.getItem(key) || "";
      if (!visitorId) {
        visitorId = window.crypto?.randomUUID?.() || `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(key, visitorId);
      }
    } catch {
      visitorId = "";
    }

    const metadata: Record<string, string> = {
      device: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "mobile" : "desktop",
      ...(visitorId ? { visitor_id: visitorId } : {}),
    };
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
      const value = params.get(key);
      if (value) metadata[key] = value.slice(0, 120);
    }
    if (document.referrer) metadata.referrer = document.referrer.slice(0, 500);

    void fetch("/api/rahyar/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "page_view", path: pathname, metadata }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
