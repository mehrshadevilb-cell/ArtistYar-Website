import { ensurePluginWebhook } from "@/lib/telegram-plugin-bot";
import { getPluginWebhookInfo } from "@/lib/telegram-plugin-sync";
/**
 * Production fallback for Telegram plugin queue processing.
 * Render Blueprint may also define a cron; DB claim RPCs serialize work across instances.
 * Disable inline processor with ARTISTYAR_DISABLE_INLINE_TELEGRAM_PROCESSOR=1 when cron is sufficient.
 */
let started = false;
let stopped = false;
let inFlight: Promise<void> | null = null;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
let webhookRetryHandle: ReturnType<typeof setTimeout> | null = null;
let webhookHealInFlight = false;
let webhookHealSucceeded = false;

function shouldRunInlineProcessor(): boolean {
  if (process.env.NEXT_RUNTIME !== "nodejs") return false;
  if (process.env.ARTISTYAR_DISABLE_INLINE_TELEGRAM_PROCESSOR === "1") return false;
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  return true;
}

async function runOnce(correlationId: string): Promise<void> {
  if (stopped) return;
  try {
    const secret = String(process.env.TELEGRAM_PLUGIN_PROCESS_SECRET || "").trim();
    if (!secret) return;
    const port = String(process.env.PORT || "10000");
    const response = await fetch(
      "http://127.0.0.1:" + port + "/api/telegram/plugins/process?limit=5",
      {
        cache: "no-store",
        signal: AbortSignal.timeout(120000),
        headers: {
          "x-telegram-plugin-process-secret": secret,
          "x-correlation-id": correlationId,
        },
      },
    );
    if (!response.ok) {
      console.error("telegram_plugin_runtime_processor_http_error", {
        correlationId,
        status: response.status,
      });
      return;
    }
    const result = await response.json().catch(() => null);
    if (result?.result?.processed || result?.result?.errors?.length) {
      console.info("telegram_plugin_runtime_processor", {
        correlationId,
        processed: result.result.processed || 0,
        errors: result.result.errors?.length || 0,
        pending_checked: result.result.pending_checked || 0,
      });
    }
  } catch (error) {
    if (stopped) return;
    console.error("telegram_plugin_runtime_processor_failed", {
      correlationId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function scheduleRun(): void {
  if (stopped) return;
  const correlationId = `tg-proc-${Date.now().toString(36)}`;
  inFlight = runOnce(correlationId).finally(() => {
    inFlight = null;
  });
}

async function runWebhookWatchdog(): Promise<void> {
  if (stopped || webhookHealInFlight) return;
  try {
    const info = await getPluginWebhookInfo();
    const pending = Number(info?.pending_update_count || 0);
    const lastError = String(info?.last_error_message || "").trim();
    const webhookUrl = String(info?.url || "");
    const expected =
      String(process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "") +
      "/api/telegram/plugins/webhook";
    const healthy = webhookUrl === expected && !lastError;
    console.info("telegram_plugin_webhook_watchdog", {
      healthy,
      pending_updates: pending,
      has_last_error: Boolean(lastError),
      expected_url_match: webhookUrl === expected,
    });
    if (!healthy) await runWebhookSelfHeal("delayed");
  } catch (error) {
    console.error("telegram_plugin_webhook_watchdog_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Single-flight webhook self-heal with one delayed recovery pass for transient failures.
 * Never starts concurrent repair loops.
 */
async function runWebhookSelfHeal(source: "startup" | "delayed"): Promise<void> {
  if (stopped || webhookHealSucceeded) return;
  if (webhookHealInFlight) return;
  webhookHealInFlight = true;
  try {
    const result = await ensurePluginWebhook();
    if (result.ok) {
      webhookHealSucceeded = true;
      console.info("telegram_plugin_webhook_self_healed", {
        source,
        attempts: result.attempts,
        verified: result.verified,
      });
      return;
    }

    console.error("telegram_plugin_webhook_self_heal_failed", {
      source,
      category: result.category || "unknown",
      attempts: result.attempts,
      error: result.error,
    });

    // Only schedule one delayed recovery for transient/network failures.
    if (
      source === "startup" &&
      !stopped &&
      !webhookHealSucceeded &&
      result.category === "transient" &&
      !webhookRetryHandle
    ) {
      const delayMs = 45000;
      console.info("telegram_plugin_webhook_schedule_retry", { delayMs });
      webhookRetryHandle = setTimeout(() => {
        webhookRetryHandle = null;
        void runWebhookSelfHeal("delayed");
      }, delayMs);
    }
  } finally {
    webhookHealInFlight = false;
  }
}

function onShutdown(signal: string): void {
  if (stopped) return;
  stopped = true;
  console.info("telegram_plugin_runtime_processor_shutdown", { signal });
  if (timeoutHandle) clearTimeout(timeoutHandle);
  if (intervalHandle) clearInterval(intervalHandle);
  if (webhookRetryHandle) clearTimeout(webhookRetryHandle);
  timeoutHandle = null;
  intervalHandle = null;
  webhookRetryHandle = null;
}

export async function register() {
  if (started || !shouldRunInlineProcessor()) return;
  started = true;

  process.once("SIGTERM", () => onShutdown("SIGTERM"));
  process.once("SIGINT", () => onShutdown("SIGINT"));

  timeoutHandle = setTimeout(() => scheduleRun(), 5000);
  void runWebhookSelfHeal("startup");
  intervalHandle = setInterval(() => {
    scheduleRun();
    void runWebhookWatchdog();
  }, 120000);

  console.info("telegram_plugin_runtime_processor_started", {
    intervalMs: 120000,
    note: "DB claim RPCs prevent duplicate pair processing across instances",
  });
}
