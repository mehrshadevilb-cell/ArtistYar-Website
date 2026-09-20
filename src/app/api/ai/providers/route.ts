import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { discoverAllModels } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderResult = Awaited<ReturnType<typeof discoverAllModels>>[number];

export async function GET() {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });

  const providers = await discoverAllModels();
  return NextResponse.json({ ok: true, providers: providers as ProviderResult[], fetchedAt: new Date().toISOString() });
}
