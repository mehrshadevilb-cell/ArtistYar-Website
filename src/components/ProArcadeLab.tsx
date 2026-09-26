"use client";

/**
 * Pro Arcade is merged into the unified SoundGym (باشگاه گوش).
 * Reverb / saturation / masking / transient map to the closest core skills.
 */
import { SoundGymLab } from "@/components/SoundGymLab";

type Props = { onBack?: () => void };

export function ProArcadeLab({ onBack }: Props) {
  return <SoundGymLab onBack={onBack} />;
}
