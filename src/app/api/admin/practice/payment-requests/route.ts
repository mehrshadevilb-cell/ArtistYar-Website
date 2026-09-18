import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;


export async function GET() {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ ok: false, error: "store_not_configured" }, { status: 503 });
  const { data, error } = await db.from("practice_payment_requests").select("*").eq("status","pending").order("created_at",{ascending:false}).limit(100);
  if (error) return NextResponse.json({ ok:false,error:error.message },{status:503});
  return NextResponse.json({ok:true,requests:data||[]});
}

export async function POST(request: Request) {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ ok: false, error: "store_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const requestId = String(body.requestId || "").trim();
  const action = body.action === "reject" ? "reject" : "approve";
  if (!requestId) return NextResponse.json({ok:false,error:"requestId_required"},{status:400});
  const { data:req, error:reqError } = await db.from("practice_payment_requests").select("*").eq("id",requestId).single();
  if (reqError || !req) return NextResponse.json({ok:false,error:"request_not_found"},{status:404});
  if (req.status !== "pending") return NextResponse.json({ok:false,error:"request_already_reviewed"},{status:409});
  const now=new Date();
  if(action==="reject"){
    const {error}=await db.from("practice_payment_requests").update({status:"rejected",reviewed_at:now.toISOString(),reviewed_by:session.username}).eq("id",requestId);
    if(error)return NextResponse.json({ok:false,error:error.message},{status:503});
    return NextResponse.json({ok:true,status:"rejected"});
  }
  const expires=new Date(now);expires.setMonth(expires.getMonth()+1);
  const {error:subError}=await db.from("practice_subscriptions").insert({user_id:req.user_id,status:"active",price_toman:40000,started_at:now.toISOString(),expires_at:expires.toISOString()});
  if(subError)return NextResponse.json({ok:false,error:subError.message},{status:503});
  const {error:updateError}=await db.from("practice_payment_requests").update({status:"approved",reviewed_at:now.toISOString(),reviewed_by:session.username}).eq("id",requestId);
  if(updateError)return NextResponse.json({ok:false,error:updateError.message},{status:503});
  return NextResponse.json({ok:true,status:"approved"});
}
