import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import {
  createProviderToken,
  deleteProviderToken,
  listProviderTokens,
  listTokenUsage,
  publicTokenView,
  updateProviderToken,
  usageSummary,
} from "@/lib/music-generation/token-pool";
import { healthCheckAllProviders } from "@/lib/music-generation/registry";
import { grantPurchaseCredits, FREE_GENERATION_CREDITS } from "@/lib/music-generation/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const store = await cookies();
  const admin = verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (!admin) return null;
  return admin;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "overview";

  try {
    if (section === "usage") {
      const tokenId = url.searchParams.get("tokenId") || undefined;
      const items = await listTokenUsage({ tokenId, limit: 80 });
      return NextResponse.json({ ok: true, items });
    }

    if (section === "tokens") {
      const tokens = await listProviderTokens();
      return NextResponse.json({ ok: true, tokens: tokens.map(publicTokenView) });
    }

    if (section === "health") {
      const health = await healthCheckAllProviders();
      return NextResponse.json({ ok: true, health });
    }

    const summary = await usageSummary();
    const health = await healthCheckAllProviders();
    return NextResponse.json({
      ok: true,
      freeCreditsPerUser: FREE_GENERATION_CREDITS,
      summary,
      health,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg.includes("supabase_not_configured")) {
      return NextResponse.json({ ok: false, error: "Supabase پیکربندی نشده" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    if (action === "create_token") {
      const row = await createProviderToken({
        label: String(body.label || "token"),
        providerKind: body.providerKind || "openai_compat",
        baseUrl: String(body.baseUrl || ""),
        apiKey: String(body.apiKey || ""),
        modelId: body.modelId ? String(body.modelId) : undefined,
        path: body.path ? String(body.path) : undefined,
        priority: body.priority != null ? Number(body.priority) : 100,
        creditsTotal: body.creditsTotal != null ? Number(body.creditsTotal) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
      });
      return NextResponse.json({ ok: true, token: publicTokenView(row) });
    }

    if (action === "update_token") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
      const row = await updateProviderToken(id, {
        label: body.label,
        providerKind: body.providerKind,
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        modelId: body.modelId,
        path: body.path,
        enabled: body.enabled,
        priority: body.priority != null ? Number(body.priority) : undefined,
        creditsTotal: body.creditsTotal !== undefined ? body.creditsTotal : undefined,
        creditsRemaining: body.creditsRemaining !== undefined ? body.creditsRemaining : undefined,
        notes: body.notes,
      });
      return NextResponse.json({ ok: true, token: publicTokenView(row) });
    }

    if (action === "delete_token") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
      await deleteProviderToken(id);
      return NextResponse.json({ ok: true });
    }

    if (action === "grant_credits") {
      const userId = String(body.userId || "").trim();
      const amount = Math.floor(Number(body.amount) || 0);
      const paymentId = String(body.paymentId || `admin-${Date.now()}`);
      if (!userId || amount <= 0) {
        return NextResponse.json({ ok: false, error: "userId و amount لازم است" }, { status: 400 });
      }
      const result = await grantPurchaseCredits({ userId, amount, paymentId });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
