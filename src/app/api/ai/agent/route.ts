import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "این مسیر در Admin AI Assistant غیرفعال شده است. از /admin/assistant استفاده کنید." },
    { status: 410 },
  );
}
