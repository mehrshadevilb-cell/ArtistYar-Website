/**
 * Telegram -> ArtistYar plugin sync.
 *
 * EMERGENCY RESTORE IN PROGRESS - see artifacts
 */
export async function enqueuePluginMessage() { throw new Error('restore_pending'); }
export async function processPendingPluginPairs() { return { processed: 0 }; }
export async function processPluginPair() { throw new Error('restore_pending'); }
export function pluginTokenConfigured() { return false; }
export async function setPluginWebhook() { return null; }
export async function getPluginWebhookInfo() { return null; }
export async function getPluginChannelAdminStatus() { return null; }
export async function telegramGetFile() { throw new Error('restore_pending'); }
export async function telegramBytes() { throw new Error('restore_pending'); }
export function pluginImageResponse() { throw new Error('restore_pending'); }
export function channelHandle() { return '@ProAudios'; }
export function siteUrl() { return 'https://artistyaar.ir'; }
export function getAiRoutingDiagnostics() { return { providers: [] }; }
