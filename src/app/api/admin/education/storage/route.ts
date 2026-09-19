import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { listEducationStorageVideos, EDUCATION_BUCKET } from "@/lib/educational-videos";

export async function GET() {
  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(value)) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  try { return NextResponse.json({ bucket: EDUCATION_BUCKET, items: await listEducationStorageVideos() }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}
