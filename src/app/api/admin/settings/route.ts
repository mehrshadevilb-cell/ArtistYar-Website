import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { backendBase } from "@/lib/admin-proxy";
import { hasSupabase } from "@/lib/supabase-media";
import { discoverAllModels, getConfiguredProviders } from "@/lib/ai-providers";
import { communityLinkList } from "@/data/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function flag(name: string, fallback = false): boolean {
  const v = (process.env[name] || "").trim().toLowerCase();
  if (!v) return fallback;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export async function GET(request: Request) {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifyAdminSession(sessionCookie);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const discover = url.searchParams.get("discover") === "1";

  const providers = getConfiguredProviders().map((p) => ({
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    chatStyle: p.chatStyle,
    hasKey: Boolean(p.apiKey),
    defaultModels: p.defaultModels || [],
  }));

  let models: Awaited<ReturnType<typeof discoverAllModels>> | null = null;
  if (discover) {
    try {
      models = await discoverAllModels();
    } catch {
      models = [];
    }
  }

  const features = {
    assistantEnabled: !flag("ASSISTANT_DISABLED", false),
    freePlayerEnabled: !flag("FREE_PLAYER_DISABLED", false),
    onlineClassesEnabled: !flag("ONLINE_CLASSES_DISABLED", false),
    registrationEnabled: !flag("REGISTRATION_DISABLED", false),
    maintenanceMode: flag("MAINTENANCE_MODE", false),
  };

  const envPresence = {
    ARTISTYAR_ADMIN_USERNAME: Boolean((process.env.ARTISTYAR_ADMIN_USERNAME || "").trim()),
    ARTISTYAR_ADMIN_PASSWORD: Boolean((process.env.ARTISTYAR_ADMIN_PASSWORD || "").trim()),
    WEB_ADMIN_API_KEY: Boolean((process.env.WEB_ADMIN_API_KEY || "").trim()),
    RAHYAR_API_URL: Boolean((process.env.RAHYAR_API_URL || "").trim()),
    SUPABASE_URL: Boolean((process.env.SUPABASE_URL || "").trim()),
    SUPABASE_SECRET_KEY: Boolean(
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
    ),
    OPENAI_API_KEY: Boolean((process.env.OPENAI_API_KEY || "").trim()),
    ANTHROPIC_API_KEY: Boolean(
      (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "").trim(),
    ),
    GOOGLE_API_KEY: Boolean(
      (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        ""
      ).trim(),
    ),
    OPENROUTER_API_KEY: Boolean((process.env.OPENROUTER_API_KEY || "").trim()),
    XKIRO_API_KEY: Boolean(
      (process.env.XKIRO_API_KEY || process.env.KIRA_API_KEY || "").trim(),
    ),
    OPENCODE_API_KEY: Boolean(
      (process.env.OPENCODE_API_KEY || process.env.OPENCODE_ZEN_API_KEY || "").trim(),
    ),
    AGENTROUTER_API_KEY: Boolean(
      (process.env.AGENTROUTER_API_KEY || process.env.AGENT_ROUTER_API_KEY || "").trim(),
    ),
  };

  return NextResponse.json({
    ok: true,
    session: { username: session.username },
    backend: backendBase(),
    supabase: hasSupabase(),
    features,
    envPresence,
    providers,
    models,
    community: communityLinkList,
    nodeEnv: process.env.NODE_ENV || "unknown",
    generatedAt: new Date().toISOString(),
  });
}
