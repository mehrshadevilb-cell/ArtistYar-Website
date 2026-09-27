import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { resolvePluginBotToken } from "@/lib/telegram-plugin-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const fileId = new URL(request.url).searchParams.get("file_id") || "";
  const token = resolvePluginBotToken();
  if (!fileId || !token) return NextResponse.json({ error: "image_unavailable" }, { status: 404 });
  try {
    const info = await fetch("https://api.telegram.org/bot" + token + "/getFile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const json = await info.json().catch(() => null);
    const path = json?.result?.file_path;
    if (!info.ok || !json?.ok || !path) return NextResponse.json({ error: "telegram_file_unavailable" }, { status: 404 });
    const image = await fetch("https://api.telegram.org/file/bot" + token + "/" + path, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!image.ok) return NextResponse.json({ error: "telegram_image_unavailable" }, { status: 404 });
    return new NextResponse(await image.arrayBuffer(), {
      headers: {
        "Content-Type": image.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "telegram_image_unavailable" }, { status: 404 });
  }
}
