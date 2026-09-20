/**
 * Music generation provider registry.
 * Register real adapters here. Free path + paid path without rewriting product.
 */

import type { MusicGenerationProvider } from "./types";
import { StubMusicProvider } from "./providers/stub";

const providers: MusicGenerationProvider[] = [];
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;

  // Always register stub so architecture + UI + jobs can be exercised offline.
  providers.push(new StubMusicProvider());

  // Real providers are registered only when their env keys exist.
  // Example (Phase 2):
  // if (process.env.ELEVENLABS_API_KEY) providers.push(new ElevenMusicProvider());
  // if (process.env.STABILITY_API_KEY) providers.push(new StableAudioProvider());
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
