/**
 * Provider abstraction for User AI Music Generator.
 * UI and domain never import vendor SDKs directly.
 */

import type {
  GenerationSpec,
  MusicGenerationProvider,
  ProviderCapability,
  AssetType,
  Instrument,
} from "./types";

export type ProviderSelectionResult = {
  provider: MusicGenerationProvider;
  capability: ProviderCapability;
  modelId: string;
  reason: string;
};

export function matchesCapability(
  cap: ProviderCapability,
  spec: GenerationSpec,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!cap.enabled) reasons.push("provider_disabled");
  if (!cap.supportedAssetTypes.includes(spec.assetType) && !cap.supportedAssetTypes.includes("other"))
    reasons.push(`unsupported_asset:${spec.assetType}`);
  if (
    spec.instrument !== "unspecified" &&
    !cap.supportedInstruments.includes(spec.instrument) &&
    !cap.supportedInstruments.includes("other")
  )
    reasons.push(`unsupported_instrument:${spec.instrument}`);
  if (spec.durationMs && spec.durationMs > cap.maxDurationMs)
    reasons.push(`duration_too_long:${spec.durationMs}>${cap.maxDurationMs}`);
  if (spec.durationMs && spec.durationMs < cap.minDurationMs)
    reasons.push(`duration_too_short`);
  if (spec.bpm && !cap.supportsBpm) reasons.push("bpm_not_supported");
  if (spec.key && !cap.supportsKey) reasons.push("key_not_supported");
  if (spec.referenceAudioUrl && !cap.supportsReferenceAudio)
    reasons.push("reference_audio_not_supported");
  return { ok: reasons.length === 0, reasons };
}

export function scoreProvider(
  cap: ProviderCapability,
  spec: GenerationSpec,
  policy: GenerationSpec["providerPolicy"] = "prefer_quality",
): number {
  const match = matchesCapability(cap, spec);
  if (!match.ok) return -1;

  let score = 50;
  if (cap.supportedAssetTypes.includes(spec.assetType)) score += 20;
  if (spec.instrument !== "unspecified" && cap.supportedInstruments.includes(spec.instrument))
    score += 15;
  if (cap.supportsBpm && spec.bpm) score += 5;
  if (cap.supportsKey && spec.key) score += 5;
  if (cap.supportsBars && spec.bars) score += 5;

  if (policy === "prefer_free" && cap.isFreeTierAvailable) score += 25;
  if (policy === "prefer_quality" && cap.qualityTier.includes("studio")) score += 20;
  if (policy === "prefer_quality" && cap.qualityTier.includes("high")) score += 10;
  if (policy === "prefer_speed" && cap.latencyClass === "fast") score += 20;
  if (policy === "prefer_speed" && cap.latencyClass === "medium") score += 8;

  // Prefer cheaper when scores otherwise close
  score -= Math.min(15, cap.costPerSecondEstimateUsd * 100);

  return score;
}

export function selectBestProvider(
  providers: MusicGenerationProvider[],
  spec: GenerationSpec,
): ProviderSelectionResult | null {
  let best: ProviderSelectionResult | null = null;
  let bestScore = -1;

  for (const provider of providers) {
    const capability = provider.getCapabilities();
    const score = scoreProvider(capability, spec, spec.providerPolicy);
    if (score <= bestScore) continue;
    bestScore = score;
    best = {
      provider,
      capability,
      modelId: capability.id, // concrete model chosen in plan()
      reason: `score=${score}; policy=${spec.providerPolicy || "any"}`,
    };
  }
  return best;
}

/** Expected duration in ms from bars + bpm + meter. */
export function expectedDurationMs(spec: GenerationSpec): number | undefined {
  if (spec.durationMs) return spec.durationMs;
  if (!spec.bars || !spec.bpm) return undefined;
  const beatsPerBar = spec.meter?.startsWith("6") ? 6 : 4;
  return Math.round((spec.bars * beatsPerBar * 60_000) / spec.bpm);
}

export function assetTypeLabelFa(t: AssetType): string {
  const map: Record<AssetType, string> = {
    riff: "ریف",
    melody: "ملودی",
    bassline: "بیس‌لاین",
    chord_progression: "پیشروی آکورد",
    guitar_part: "پارت گیتار",
    piano_part: "پارت پیانو",
    keyboard_part: "پارت کیبورد",
    synth_part: "پارت سینت",
    pad: "پد",
    arpeggio: "آرپژ",
    drum_loop: "لوپ درام",
    percussion_loop: "لوپ پرکاشن",
    fill: "فیل",
    transition: "ترانزیشن",
    intro: "اینترو",
    outro: "اوترو",
    riser: "رایزر",
    impact: "ایمپکت",
    texture: "تکسچر",
    sound_effect: "افکت صوتی",
    backing_fragment: "فرگمنت بکینگ",
    arrangement_fragment: "فرگمنت تنظیم",
    other: "سایر",
  };
  return map[t] || t;
}

export function instrumentLabelFa(i: Instrument): string {
  const map: Record<Instrument, string> = {
    guitar: "گیتار",
    electric_guitar: "گیتار الکتریک",
    acoustic_guitar: "گیتار آکوستیک",
    bass: "بیس",
    electric_bass: "بیس الکتریک",
    piano: "پیانو",
    keys: "کیبورد",
    synth: "سینت",
    pad: "پد",
    drums: "درام",
    percussion: "پرکاشن",
    strings: "زه",
    brass: "برنج",
    vocals: "ووکال",
    other: "سایر",
    unspecified: "نامشخص",
  };
  return map[i] || i;
}
