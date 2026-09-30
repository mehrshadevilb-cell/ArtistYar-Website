/**
 * Telegram-only plugin cover policy.
 *
 * Plugin binaries and covers are not persisted in Supabase Storage.
 * The public catalog uses the Telegram photo file_id through the server-side
 * Telegram media proxy. This module remains as a compatibility surface for
 * older routes/scripts that still call syncPublishedPluginCover.
 */

export async function syncPublishedPluginCover(_options: {
  postId: string;
  photoFileId: string;
}): Promise<null> {
  return null;
}

export async function prunePluginCoversToLatestThree(): Promise<{
  kept: string[];
  removed: string[];
}> {
  return { kept: [], removed: [] };
}
