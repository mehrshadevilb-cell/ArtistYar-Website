/**
 * Lightweight in-process Telegram plugin processor fallback.
 *
 * Render's production Blueprint defines a 2-minute cron processor, but the
 * current free workspace cannot provision cron jobs. Keep queue processing
 * available from the always-on web process as a safe fallback.
 */
let started = false;

export async function register() {
  if (started || process.env.NEXT_RUNTIME !== "nodejs") return;
  started = true;

  const run = async () => {
    try {
      const port = String(process.env.PORT || "10000");
      const secret = String(process.env.TELEGRAM_PLUGIN_PROCESS_SECRET || "").trim();
      if (!secret) {
        console.warn("telegram_plugin_runtime_processor_disabled", { reason: "process_secret_missing" });
        return;
      }

      const endpoint =
        "http://127.0.0.1:" +
        port +
        "/api/telegram/plugins/process?process_secret=" +
        encodeURIComponent(secret) +
        "&limit=5";
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(120000),
      });
      const text = await response.text();
      if (!response.ok) {
        console.error("telegram_plugin_runtime_processor_http_error", {
          status: response.status,
          body: text.slice(0, 500),
        });
        return;
      }

      try {
        const data = JSON.parse(text);
        if (data.result?.processed || data.result?.errors?.length) {
          console.info("telegram_plugin_runtime_processor", {
            processed: data.result?.processed || 0,
            errors: data.result?.errors?.length || 0,
            pending_checked: data.result?.pending_checked || 0,
          });
        }
      } catch {
        console.error("telegram_plugin_runtime_processor_invalid_response");
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
