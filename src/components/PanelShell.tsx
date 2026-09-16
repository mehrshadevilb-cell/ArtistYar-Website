"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

type NavItem = { href: string; label: string };

export function PanelShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="container-ay py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-500">
            {title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-sand-50">
            سلام، {user?.fullName}
          </h1>
        </div>
        <button type="button" onClick={logout} className="btn-ghost !py-2 text-xs">
          خروج
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="card-ay h-fit p-3">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-gold-500/15 text-gold-300"
                      : "text-ink-300 hover:bg-white/[0.04] hover:text-sand-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
