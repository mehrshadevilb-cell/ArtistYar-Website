"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SiteAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    void fetch("/api/rahyar/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_type: "page_view", path: pathname }), keepalive: true }).catch(() => undefined);
  }, [pathname]);
  return null;
}
