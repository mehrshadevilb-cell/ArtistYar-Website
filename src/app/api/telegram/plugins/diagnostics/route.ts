import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getPluginWebhookInfo,
  getPluginChannelAdminStatus,
  pluginTokenConfigured,
  getAiRoutingDiagnostics,
} from "@/lib/telegram-plugin-sync";
import {
  pluginBotTokenSource,
  pluginBotTokenWarnings,
  probePluginBotIdentity,
  probeTelegramFileId,
  probeAlternateBotTokens,
} from "@/lib/telegram-plugin-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = (process.env.WEB_ADMIN_API_KEY || "").trim();
  const provided =
    request.headers.get("x-admin-api-key") ||
    request.headers.get("x-web-admin-key") ||
    new URL(request.url).searchParams.get("key") ||
    "";
  return Boolean(expected && provided === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  const db = url && key
    ? createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  const params = new URL(request.url).searchParams;
  const requestedProcess = params.get("process") === "1";
  const requestedProbe = params.get("probe") === "1";

  const identity = await probePluginBotIdentity();
  const alternate_tokens = await probeAlternateBotTokens();

  const out: Record<string, unknown> = {
    ok: true,
    telegram_bot_token_configured: pluginTokenConfigured(),
    token_source: pluginBotTokenSource(),
    token_warnings: pluginBotTokenWarnings(),
    bot_identity: {
      bot_id: identity.bot_id ?? null,
      bot_username: identity.bot_username ?? null,
      configured: identity.configured,
      error: identity.error ?? null,
    },
    alternate_token_probes: alternate_tokens,
    channel: process.env.TELEGRAM_PLUGIN_CHANNEL_ID || process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "@ProAudios",
    webhook_secret_configured: Boolean(
      (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim()
    ),
    webhook_secret_mode: (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim()
      ? "explicit"
      : pluginTokenConfigured()
        ? "token-derived"
        : "missing",
    google_ai_configured: Boolean(
      (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        ""
      ).trim()
    ),
    openai_ai_configured: Boolean((process.env.OPENAI_API_KEY || "").trim()),
    supabase_configured: Boolean(db),
    site_url: (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, ""),
    guidance: {
      critical:
        "Runtime getMe must succeed for TELEGRAM_PLUGIN_BOT_TOKEN. file_id values are bot-specific.",
      cases: {
        A: "getMe fails (Not Found/Unauthorized) → TELEGRAM_PLUGIN_BOT_TOKEN is invalid/revoked/malformed",
        B: "getMe ok but OLD DB file_ids fail → historical IDs from another bot; post a NEW channel message",
        C: "getMe ok and NEW file_id fails → webhook/media ownership bug",
        D: "getMe ok and NEW file_id works → continue cover storage + caption E2E",
      },
      then: "GET /api/telegram/plugins/setup?key=... after fixing the live bot token",
      probe: "GET /api/telegram/plugins/diagnostics?key=...&probe=1",
      mandatory: "Do not conclude from historical file_ids alone — require getMe success first",
    },
  };

  try {
    const routing = await getAiRoutingDiagnostics();
    out.ai_routing = routing;
    out.ai_model_pools = Object.fromEntries(
      (routing.providers || []).map((provider: any) => [
        provider.provider,
        (provider.models || []).map((model: any) => model.model),
      ]),
    );
  } catch (error) {
    out.ai_routing_error = error instanceof Error ? error.message : String(error);
  }

  try {
    out.webhook = await getPluginWebhookInfo();
  } catch (error) {
    out.webhook_error = error instanceof Error ? error.message : String(error);
  }

  try {
    out.channel_admin = await getPluginChannelAdminStatus();
  } catch (error) {
    out.channel_admin_error = error instanceof Error ? error.message : String(error);
  }

  if (db) {
    if (requestedProcess) {
      try {
        const { processPendingPluginPairs } = await import("@/lib/telegram-plugin-sync");
        out.process = await processPendingPluginPairs(1);
      } catch (error) {
        out.process = {
          processed: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const [queue, posts] = await Promise.all([
      db
        .from("telegram_plugin_ingest_queue")
        .select(
          "id,channel_id,message_id,kind,file_id,file_name,mime_type,file_size,caption,received_at,processing_at",
        )
        .order("received_at", { ascending: false })
        .limit(10),
      db
        .from("telegram_plugin_posts")
        .select(
          "id,channel_id,photo_message_id,document_message_id,title,developer,status,error_message,ai_provider,ai_model,created_at,updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    out.queue_error = queue.error?.message || null;
    out.queue = queue.data || [];
    const now = Date.now();
    const queueRows = queue.data || [];
    out.queue_health = {
      pending: queueRows.filter((row) => !row.processing_at).length,
      processing: queueRows.filter((row) => Boolean(row.processing_at)).length,
      stale_processing: queueRows.filter((row) => {
        const at = row.processing_at ? new Date(row.processing_at).getTime() : 0;
        return at > 0 && now - at > 10 * 60 * 1000;
      }).length,
      retryable_stale_lock_window_ms: 10 * 60 * 1000,
    };
    out.posts_error = posts.error?.message || null;
    out.posts = posts.data || [];

    if (requestedProbe) {
      try {
        const latest = await db
          .from("telegram_plugin_posts")
          .select("id,title,telegram_photo_file_id")
          .eq("status", "published")
          .not("telegram_photo_file_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(3);
        const probes = [];
        for (const row of latest.data || []) {
          const result = await probeTelegramFileId(String(row.telegram_photo_file_id || ""));
          probes.push({
            id: row.id,
            title: row.title,
            file_resolvable: result.ok,
            error: result.error || null,
          });
        }
        out.file_id_probes = probes;
        out.file_id_probes_summary = {
          total: probes.length,
          ok: probes.filter((p) => p.file_resolvable).length,
          failed: probes.filter((p) => !p.file_resolvable).length,
          hint: probes.some((p) => !p.file_resolvable)
            ? "If getMe also fails, fix the bot token first. If getMe works, old file_ids may be from a previous bot."
            : "ok",
        };
      } catch (error) {
        out.file_id_probe_error =
          error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200);
      }
    }
  }

  const channelAdmin = out.channel_admin as { required_permissions_ok?: boolean } | undefined;
  const configErrors: string[] = [];
  if (identity.error) {
    out.ok = false;
    configErrors.push("telegram_plugin_bot_getMe_failed:" + String(identity.error).slice(0, 120));
  }
  if (channelAdmin && channelAdmin.required_permissions_ok === false) {
    out.ok = false;
    configErrors.push("telegram_bot_must_be_channel_administrator");
    configErrors.push("telegram_bot_requires_can_edit_messages");
  }
  if (configErrors.length) {
    out.configuration_errors = configErrors;
  }
  const workingAlt = alternate_tokens.find((t) => t.ok && t.source !== pluginBotTokenSource());
  if (identity.error && workingAlt) {
    out.recovery_hint =
      "Active token source " +
      pluginBotTokenSource() +
      " fails getMe, but " +
      workingAlt.source +
      " resolves as @" +
      String(workingAlt.bot_username || workingAlt.bot_id) +
      " — either fix TELEGRAM_PLUGIN_BOT_TOKEN to that live token, or remove the broken PLUGIN token so fallback can win";
  } else if (identity.error) {
    out.recovery_hint =
      "TELEGRAM_PLUGIN_BOT_TOKEN is set but getMe fails. Replace it with a live BotFather token for the @ProAudioS admin bot (shape: 123456:ABC... — no leading 'bot', no quotes). Then re-run /api/telegram/plugins/setup and post a NEW channel message.";
  }
  return NextResponse.json(out, {
    headers: { "cache-control": "no-store" },
  });
}
