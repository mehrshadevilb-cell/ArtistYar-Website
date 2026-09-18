import { NextResponse } from "next/server";
import { proxyAdmin, requireAdminBackendKey, backendBase } from "@/lib/admin-proxy";
import { spotplayerLicenses } from "@/data/spotplayer-licenses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(raw: string | null | undefined): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("98") && digits.length >= 12) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  return digits;
}

type UnifiedStudent = {
  id: number | string;
  full_name: string;
  phone: string | null;
  email: string | null;
  bio: string | null;
  level: string | null;
  experience_years: number;
  telegram_id: string | null;
  telegram_username: string | null;
  created_at: string;
  is_active: boolean;
  sources: Array<"bot" | "spot">;
  spot_courses?: string[];
  spot_activated?: boolean;
  spot_watch_seconds?: number;
  spot_download_bytes?: number;
  editable: boolean;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(url.searchParams.get("limit") || 500) || 500, 1000);

  const auth = await requireAdminBackendKey();
  if (!auth.ok) return auth.response;

  let botRows: any[] = [];
  let botError = "";
  let botOk = false;

  try {
    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    if (q) qs.set("q", q);
    const res = await fetch(`${backendBase()}/api/v1/admin/students?${qs.toString()}`, {
      headers: { "X-Admin-Key": auth.key },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (res.ok) {
      botOk = true;
      if (Array.isArray(data)) botRows = data;
      else if (data && typeof data === "object" && Array.isArray((data as any).items))
        botRows = (data as any).items;
      else if (data && typeof data === "object" && Array.isArray((data as any).students))
        botRows = (data as any).students;
    } else {
      botError =
        (data && typeof data === "object" && ((data as any).detail || (data as any).error || (data as any).message)) ||
        `HTTP ${res.status}`;
    }
  } catch (err) {
    botError = err instanceof Error ? err.message : String(err);
  }

  const byPhone = new Map<string, UnifiedStudent>();
  const list: UnifiedStudent[] = [];

  for (const row of botRows) {
    const phone = normalizePhone(row.phone);
    const item: UnifiedStudent = {
      id: row.id,
      full_name: String(row.full_name || row.name || "بدون نام"),
      phone: row.phone || null,
      email: row.email || null,
      bio: row.bio || null,
      level: row.level || null,
      experience_years: Number(row.experience_years || 0),
      telegram_id: row.telegram_id ? String(row.telegram_id) : null,
      telegram_username: row.telegram_username || null,
      created_at: row.created_at || "",
      is_active: row.is_active !== false,
      sources: ["bot"],
      editable: true,
    };
    if (phone) byPhone.set(phone, item);
    list.push(item);
  }

  for (const lic of spotplayerLicenses) {
    const phone = normalizePhone(lic.phone);
    if (q) {
      const hay = `${lic.name} ${lic.phone} ${lic.courses.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    const existing = phone ? byPhone.get(phone) : undefined;
    if (existing) {
      if (!existing.sources.includes("spot")) existing.sources.push("spot");
      existing.spot_courses = Array.from(new Set([...(existing.spot_courses || []), ...lic.courses]));
      existing.spot_activated = existing.spot_activated || lic.activated;
      existing.spot_watch_seconds = (existing.spot_watch_seconds || 0) + lic.watch_seconds;
      existing.spot_download_bytes = (existing.spot_download_bytes || 0) + lic.download_bytes;
      if (!existing.full_name || existing.full_name === "بدون نام") existing.full_name = lic.name;
    } else {
      const item: UnifiedStudent = {
        id: `spot:${lic.id}`,
        full_name: lic.name,
        phone: lic.phone || null,
        email: null,
        bio: null,
        level: null,
        experience_years: 0,
        telegram_id: null,
        telegram_username: null,
        created_at: lic.created_at || "",
        is_active: true,
        sources: ["spot"],
        spot_courses: [...lic.courses],
        spot_activated: lic.activated,
        spot_watch_seconds: lic.watch_seconds,
        spot_download_bytes: lic.download_bytes,
        editable: false,
      };
      if (phone) byPhone.set(phone, item);
      list.push(item);
    }
  }

  list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  return NextResponse.json({
    ok: true,
    items: list,
    meta: {
      total: list.length,
      from_bot: list.filter((s) => s.sources.includes("bot")).length,
      from_spot: list.filter((s) => s.sources.includes("spot")).length,
      bot_ok: botOk,
      bot_error: botError || null,
      bot_raw_count: botRows.length,
      spot_raw_count: spotplayerLicenses.length,
    },
  });
}

export async function PUT(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: "student_id_required", message: "شناسه هنرجو لازم است (فقط رکوردهای ربات قابل ویرایش‌اند)." },
      { status: 400 },
    );
  }
  const body = await request.text();
  return proxyAdmin(`/api/v1/admin/students/${id}`, {
    method: "PUT",
    body,
  });
}
