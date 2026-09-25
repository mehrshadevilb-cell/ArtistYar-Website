export type PracticeGameCategory =
  | "frequency"
  | "eq"
  | "dynamics"
  | "spatial"
  | "pitch"
  | "rhythm";

export type PracticeGameDef = {
  id: string;
  apiGameId: string;
  category: PracticeGameCategory;
  title: string;
  titleFa: string;
  tagline: string;
  skill: string;
  rounds: number;
  warmup: number;
  accent: "cyan" | "amber" | "rose" | "violet" | "emerald" | "gold";
};

export const PRACTICE_GAMES: PracticeGameDef[] = [
  {
    id: "freq-memory",
    apiGameId: "freq-memory",
    category: "frequency",
    title: "Frequency Memory",
    titleFa: "حافظهٔ فرکانس",
    tagline: "بشنو، به‌خاطر بسپار، با اسلایدر بازسازی کن",
    skill: "تشخیص pitch / Hz",
    rounds: 8,
    warmup: 2,
    accent: "cyan",
  },
  {
    id: "eq-detective",
    apiGameId: "eq-detective",
    category: "eq",
    title: "EQ Detective",
    titleFa: "کارآگاه اکولایزر",
    tagline: "A/B بشنو و باند تقویت یا کاهش را پیدا کن",
    skill: "EQ / tonal balance",
    rounds: 8,
    warmup: 2,
    accent: "amber",
  },
  {
    id: "comp-detective",
    apiGameId: "comp-detective",
    category: "dynamics",
    title: "Compression Detective",
    titleFa: "کارآگاه کمپرسور",
    tagline: "Attack، Release و نسبت را از روی transient بخوان",
    skill: "Dynamics",
    rounds: 8,
    warmup: 2,
    accent: "rose",
  },
  {
    id: "stereo-space",
    apiGameId: "stereo-space",
    category: "spatial",
    title: "Stereo & Space",
    titleFa: "استریو و فضا",
    tagline: "پن، عرض، عمق و ریورب را با گوش پیدا کن",
    skill: "Imaging",
    rounds: 8,
    warmup: 2,
    accent: "violet",
  },
  {
    id: "pitch-lab",
    apiGameId: "pitch-lab",
    category: "pitch",
    title: "Pitch Lab",
    titleFa: "آزمایشگاه زیروبمی",
    tagline: "نت، فاصله، آکورد و حافظهٔ ملودی",
    skill: "Ear / Harmony",
    rounds: 8,
    warmup: 2,
    accent: "gold",
  },
  {
    id: "rhythm-lab",
    apiGameId: "rhythm-lab",
    category: "rhythm",
    title: "Rhythm Lab",
    titleFa: "آزمایشگاه ریتم",
    tagline: "شمارش ضربه، تمپو و دقت زمان‌بندی",
    skill: "Timing",
    rounds: 8,
    warmup: 2,
    accent: "emerald",
  },
];

export function getPracticeGame(id: string) {
  return PRACTICE_GAMES.find((g) => g.id === id);
}
