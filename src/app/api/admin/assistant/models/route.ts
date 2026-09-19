import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { listAdminAiModels, syncAdminAiModels, updateAdminAiModel, validateAdminAiModel } from "@/lib/admin-ai-model-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(value);
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, models: await listAdminAiModels() });
  } catch (error) {
    console.error("admin model registry GET failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Model Registry در دسترس نیست." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });
  try {
    const body = await request.json() as { action?: unknown; id?: unknown; enabled?: unknown; priority?: unknown; preferred?: unknown; status?: unknown };
    if (body.action === "sync") return NextResponse.json({ ok: true, models: await syncAdminAiModels() });
    if (body.action === "validate") {
      if (typeof body.id !== "string") return NextResponse.json({ ok: false, error: "شناسه مدل لازم است." }, { status: 400 });
      return NextResponse.json({ ok: true, model: await validateAdminAiModel(body.id) });
    }
    if (typeof body.id !== "string") return NextResponse.json({ ok: false, error: "شناسه مدل لازم است." }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.priority === "number" && Number.isInteger(body.priority)) patch.priority = Math.max(0, Math.min(1000, body.priority));
    if (typeof body.preferred === "boolean") patch.preferred = body.preferred;
    if (typeof body.status === "string" && ["discovered", "registered", "enabled", "disabled", "deprecated"].includes(body.status)) patch.status = body.status;
    if (!Object.keys(patch).length) return NextResponse.json({ ok: false, error: "تغییری ارسال نشده است." }, { status: 400 });
    return NextResponse.json({ ok: true, model: await updateAdminAiModel(body.id, patch) });
  } catch (error) {
    console.error("admin model registry POST failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ ok: false, error: "تغییر Model Registry ناموفق بود." }, { status: 502 });
  }
}