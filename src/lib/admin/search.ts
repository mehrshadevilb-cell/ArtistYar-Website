/**
 * Global Admin search foundation. Bounded, authorized entities only.
 */
export type SearchResultGroup = {
  type: string;
  label: string;
  items: SearchResultItem[];
};

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type SearchResponse = {
  query: string;
  groups: SearchResultGroup[];
  total: number;
};

const MAX_PER_GROUP = 8;
const MAX_QUERY_LEN = 80;

export function normalizeQuery(q: string): string {
  return q.trim().slice(0, MAX_QUERY_LEN);
}

export async function searchAdminEntities(
  query: string,
  opts: { backendBase: string; adminKey: string },
): Promise<SearchResponse> {
  const q = normalizeQuery(query);
  if (q.length < 2) return { query: q, groups: [], total: 0 };

  const groups: SearchResultGroup[] = [];
  const headers = {
    "X-Admin-Key": opts.adminKey,
    Accept: "application/json",
  };

  try {
    const res = await fetch(
      `${opts.backendBase}/api/v1/admin/students?search=${encodeURIComponent(q)}&limit=${MAX_PER_GROUP}`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(6000) },
    );
    if (res.ok) {
      const json = (await res.json()) as {
        students?: Array<{ id: number; name?: string; full_name?: string; phone?: string }>;
      };
      const students = json.students || [];
      if (students.length) {
        groups.push({
          type: "students",
          label: "هنرجویان",
          items: students.slice(0, MAX_PER_GROUP).map((s) => ({
            id: String(s.id),
            title: s.full_name || s.name || `هنرجو #${s.id}`,
            subtitle: s.phone || undefined,
            href: `/admin/students?q=${encodeURIComponent(String(s.id))}`,
          })),
        });
      }
    }
  } catch {
    // backend may be down
  }

  const { enabledAdminRoutes } = await import("@/lib/admin/nav");
  const navHits = enabledAdminRoutes()
    .filter((r) => r.label.includes(q) || r.href.includes(q))
    .slice(0, MAX_PER_GROUP)
    .map((r) => ({ id: r.href, title: r.label, subtitle: r.href, href: r.href }));
  if (navHits.length) {
    groups.push({ type: "modules", label: "بخش‌های ادمین", items: navHits });
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return { query: q, groups, total };
}
