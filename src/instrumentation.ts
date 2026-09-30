/**
 * Production fallback for Telegram plugin queue processing.
 * Render's free workspace cannot provision the Blueprint cron, so the
 * always-on web service owns a lightweight 2-minute trigger.
 */
let started = false;

export async function register() {
  if (started || process.env.NEXT_RUNTIME !== "nodejs") return;
  started = true;

  const run = async () => {
    try {
      const secret = String(process.env.TELEGRAM_PLUGIN_PROCESS_SECRET || "").trim();
      if (!secret) return;
      const port = String(process.env.PORT || "10000");
      const response = await fetch(
        "http://127.0.0.1:" +
          port +
          "/api/telegram/plugins/process?process_secret=" +
          encodeURIComponent(secret) +
          "&limit=5",
        {
          cache: "no-store",
          signal: AbortSignal.timeout(120000),
        },
      );
      if (!response.ok) {
        console.error("telegram_plugin_runtime_processor_http_error", { status: response.status });
        return;
      }
      const result = await response.json().catch(() => null);
      if (result?.result?.processed || result?.result?.errors?.length) {
        console.info("telegram_plugin_runtime_processor", {
          processed: result.result.processed || 0,
          errors: result.result.errors?.length || 0,
          pending_checked: result.result.pending_checked || 0,
        });
      }
    } catch (error) {
      console.error(
        "telegram_plugin_runtime_processor_failed",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  setTimeout(() => void run(), 5000);
  setInterval(() => void run(), 120000);
}
