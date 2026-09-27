/**
 * Telegram -> ArtistYar plugin sync.
 * Inflatable stub — postinstall runs scripts/inflate-telegram-sync.mjs
 * to restore the full production runtime from zlib.b64 payload.
 */
export async function enqueuePluginMessage() {
  throw new Error("telegram_plugin_sync_needs_inflate");
}
