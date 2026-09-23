"use client";

import { CoreEarGym } from "@/components/CoreEarGym";

type Props = { onBack?: () => void; initialExercise?: string };

const gameMap: Record<string, "tone" | "eq" | "compressor" | "phase"> = {
  "sg-freq-detect": "tone",
  "sg-eq": "eq",
  "sg-compressor": "compressor",
  "sg-phase": "phase",
};

export function SoundGymLab({ onBack, initialExercise }: Props) {
  return (
    <div dir="rtl">
      <CoreEarGym onBack={onBack} initialGame={gameMap[initialExercise || ""] || "tone"} title="باشگاه گوش · تمرین حرفه‌ای" />
    </div>
  );
}
