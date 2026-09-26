"use client";

/**
 * Core Ear Gym is merged into the unified SoundGym (6 professional games).
 * This file stays as a thin redirect so old imports / daily challenge paths keep working.
 */
import { SoundGymLab } from "@/components/SoundGymLab";

type Props = {
  onBack?: () => void;
  initialGame?: string;
  title?: string;
  onComplete?: () => void;
};

const LEGACY_TO_GAME: Record<string, string> = {
  tone: "freq-memory",
  eq: "eq-detective",
  compressor: "comp-detective",
  phase: "stereo-space",
};

export function CoreEarGym({ onBack, initialGame }: Props) {
  const mapped = initialGame ? LEGACY_TO_GAME[initialGame] || initialGame : undefined;
  return <SoundGymLab onBack={onBack} initialExercise={mapped} />;
}
