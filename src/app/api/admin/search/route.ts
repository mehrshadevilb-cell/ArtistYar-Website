import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { backendBase } from "@/lib/admin-proxy";
import { searchAdminEntities } from "@/lib/admin/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q") || "";
  return NextResponse.json(await searchAdminEntities(q,{backendBase:backendBase(),adminKey:process.env.WEB_ADMIN_API_KEY||""}));
}
