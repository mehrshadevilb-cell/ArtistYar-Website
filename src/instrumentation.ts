/**
 * Lightweight in-process Telegram plugin processor fallback.
 *
 * Render's production Blueprint defines a 2-minute cron processor, but the
 * current free workspace cannot provision cron jobs. Keep queue processing
 * available from the always-on web process as a safe fallback. The database
 * claim RPC prevents concurrent processors from publishing the same pair.
 */
let started = false;

export async function register() {
  if (started || process.env.NEXT_RUNTIME !== "nodejs") return;
  started = true;

  const run = async () => {
    try {
      const { processPendingPluginPairs } = await import("@/lib/telegram-plugin-sync");
      const result = await processPendingPluginPairs(5);
      if (result.processed || result.errors.length) {
        console.info("telegram_plugin_runtime_processor", {
          processed: result.processed,
          errors: result.errors.length,
          pending_checked: result.pending_checked,
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
