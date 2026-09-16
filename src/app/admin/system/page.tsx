"use client";

import { useEffect, useState } from "react";

type Health = {
  status: string;
  service: string;
  phase: string;
  backend: string;
};

export default function AdminSystemPage() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-sand-50">وضعیت سیستم</h2>
      <div className="card-ay space-y-3 p-6 text-sm">
        <p className="text-ink-300">
          وب: <span className="text-gold-400">آنلاین</span>
        </p>
        <p className="text-ink-300">
          API health:{" "}
          <span className="text-gold-400">{health?.status ?? "در حال بررسی…"}</span>
        </p>
        <p className="text-ink-400">{health?.backend}</p>
        <p className="text-xs text-ink-500">phase: {health?.phase}</p>
      </div>
    </div>
  );
}
