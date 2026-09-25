import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { getServiceSupabase } from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
  const q = url.searchParams.get("q")?.trim().slice(0, 80) || "";
  const db = getServiceSupabase();
  if (!db) return NextResponse.json({ entries: [], source: "memory", warning: "supabase_not_configured" });
  let query = db.from("admin_audit_logs").select("id,actor,action,resource_type,resource_id,created_at,before_state,after_state,metadata").order("created_at",{ascending:false}).limit(limit);
  if (q) query = query.or("actor.ilike.%"+q+"%,action.ilike.%"+q+"%,resource_type.ilike.%"+q+"%,resource_id.ilike.%"+q+"%");
  const {data,error}=await query;
  if(error) return NextResponse.json({error:"audit_query_failed"},{status:500});
  return NextResponse.json({entries:data||[],source:"database"});
}
