import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function GET() {
  return NextResponse.json({
    ok: true,
    cardNumber: process.env.NEXT_PUBLIC_PRO_CARD_NUMBER || "",
    cardHolder: process.env.NEXT_PUBLIC_PRO_CARD_HOLDER || "",
  });
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ ok: false, error: "payment_store_not_configured" }, { status: 503 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16 * 1024) return NextResponse.json({ ok: false, error: "درخواست بیش از حد بزرگ است." }, { status: 413 });
  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  const reference = String(body.reference || "").trim().slice(0, 120);
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  if (!session || session.id !== userId) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });
  if (!userId || !reference) return NextResponse.json({ ok: false, error: "user_and_reference_required" }, { status: 400 });

  const { error } = await db.from("practice_payment_requests").insert({
    user_id: userId,
    reference,
    amount_toman: 40000,
    status: "pending",
  });
  if (error) return NextResponse.json({ ok: false, error: "ثبت درخواست پرداخت ناموفق بود." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
