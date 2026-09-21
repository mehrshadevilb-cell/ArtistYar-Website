/**
 * Music generation provider registry.
 * Prefer admin token pool, then env ElevenLabs, then stub (dev only).
 */

import type { MusicGenerationProvider } from "./types";
import { StubMusicProvider } from "./providers/stub";
import { ElevenMusicProvider } from "./providers/elevenlabs";
import { ConfigurableMusicProvider } from "./providers/configurable";

const providers: MusicGenerationProvider[] = [];
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;

  // 1) Admin-managed tokens (base URL + API key from panel)
  providers.push(new ConfigurableMusicProvider());

  // 2) Env-based ElevenLabs (optional fallback)
  providers.push(new ElevenMusicProvider());

  // 3) Stub only for architecture/dev
  providers.push(new StubMusicProvider());
}

export function getMusicProviders(): MusicGenerationProvider[] {
  ensureInit();
  return providers.filter((p) => p.getCapabilities().enabled);
}

export function getMusicProvider(id: string): MusicGenerationProvider | undefined {
  ensureInit();
  return providers.find((p) => p.id === id);
}

export function registerMusicProvider(provider: MusicGenerationProvider) {
  ensureInit();
  const idx = providers.findIndex((p) => p.id === provider.id);
  if (idx >= 0) providers[idx] = provider;
  else providers.push(provider);
}

export async function healthCheckAllProviders() {
  const list = getMusicProviders();
  return Promise.all(
    list.map(async (p) => {
      try {
        const h = await p.healthCheck();
        return { id: p.id, ...h };
      } catch (e) {
        return { id: p.id, ok: false, message: e instanceof Error ? e.message : "error" };
      }
    }),
  );
}
