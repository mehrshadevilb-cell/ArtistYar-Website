import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { archiveConversation, createConversation, getConversation, listConversations, renameConversation, sendAdminMessage } from "@/lib/admin-ai-assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(value);
}

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });
  const url = new URL(request.url);
  try {
    const id = url.searchParams.get("conversation");
    if (id) {
      const conversation = await getConversation(session.username, id);
      return conversation
        ? NextResponse.json({ ok: true, conversation })
        : NextResponse.json({ ok: false, error: "گفتگو پیدا نشد." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, conversations: await listConversations(session.username) });
  } catch (error) {
    console.error("admin assistant GET failed", error);
    return NextResponse.json({ ok: false, error: "ذخیره‌سازی دستیار مدیریت در دسترس نیست." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });

  try {
    const body = await request.json() as {
      action?: unknown; conversationId?: unknown; content?: unknown;
      title?: unknown; provider?: unknown; model?: unknown;
    };
    const action = typeof body.action === "string" ? body.action : "message";

    if (action === "create") {
      return NextResponse.json({ ok: true, conversation: await createConversation(session.username) });
    }

    const id = typeof body.conversationId === "string" ? body.conversationId : "";
    if (!id) return NextResponse.json({ ok: false, error: "شناسه گفتگو لازم است." }, { status: 400 });

    if (action === "get") {
      const conversation = await getConversation(session.username, id);
      return conversation
        ? NextResponse.json({ ok: true, conversation })
        : NextResponse.json({ ok: false, error: "گفتگو پیدا نشد." }, { status: 404 });
    }

    if (action === "rename") {
      const title = typeof body.title === "string" ? body.title : "";
      if (!title.trim()) return NextResponse.json({ ok: false, error: "عنوان لازم است." }, { status: 400 });
      const conversation = await renameConversation(session.username, id, title);
      return conversation
        ? NextResponse.json({ ok: true, conversation })
        : NextResponse.json({ ok: false, error: "گفتگو پیدا نشد." }, { status: 404 });
    }

    if (action === "archive") {
      const conversation = await archiveConversation(session.username, id);
      return conversation
        ? NextResponse.json({ ok: true, conversation })
        : NextResponse.json({ ok: false, error: "گفتگو پیدا نشد." }, { status: 404 });
    }

    const content = typeof body.content === "string" ? body.content : "";
    if (!content.trim()) return NextResponse.json({ ok: false, error: "پیام خالی است." }, { status: 400 });

    const message = await sendAdminMessage(
      session.username,
      id,
      content,
      typeof body.provider === "string" ? body.provider : undefined,
      typeof body.model === "string" ? body.model : undefined
    );
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    console.error("admin assistant POST failed", error);
    return NextResponse.json({ ok: false, error: "اجرای درخواست دستیار مدیریت ناموفق بود." }, { status: 502 });
  }
}