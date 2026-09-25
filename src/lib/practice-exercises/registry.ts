/**
 * Professional ear-training exercise registry.
 */
import type { ExerciseDefinition, GeneratedRound, RoundOption } from "./types";
import { difficultyCurve, fingerprint, fmtHz, lerp, pick, shuffle } from "./util";

function seededOffset(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function choiceRound(
  exerciseId: string, difficulty: number, seed: number,
  prompt: string, hint: string, correctId: string, options: RoundOption[],
  source: GeneratedRound["source"], challengeDsp: GeneratedRound["challengeDsp"],
  reviewText: string, truth: Record<string, number | string>,
): GeneratedRound {
  return {
    exerciseId,
    fingerprint: fingerprint([exerciseId, correctId, difficulty, seed]),
    prompt, hint, difficulty, answerMode: "choice",
    correctOptionId: correctId, options: shuffle(options, seed + 7),
    source, challengeDsp, reviewText, truth,
  };
}

function genFreqDetect(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const pool = [80, 120, 250, 500, 1000, 2000, 4000, 8000, 12000];
  const freq = pick(pool, seed);
  const spread = lerp(0.45, 0.08, subtlety);
  const distractors = [Math.round(freq * (1 + spread)), Math.round(freq * (1 - spread)), Math.round(freq * (1 + spread * 1.7))]
    .map((f) => Math.max(40, Math.min(16000, f))).filter((f, i, a) => a.indexOf(f) === i && f !== freq);
  const opts: RoundOption[] = [{ id: String(freq), label: fmtHz(freq) }, ...distractors.slice(0, 3).map((hz) => ({ id: String(hz), label: fmtHz(hz) }))];
  return choiceRound("freq-detect", difficulty, seed, "فرکانس غالب را انتخاب کن",
    subtlety > 0.55 ? "فاصله‌ها نزدیک‌تر شده" : "ابتدا محدوده را پیدا کن",
    String(freq), opts, { kind: "harmonic", fundamental: freq, partials: [1, 0.25], duration: 1.15 },
    { type: "none" }, `فرکانس صحیح: ${fmtHz(freq)}`, { frequency: freq });
}

function genPitchInterval(difficulty: number, seed: number): GeneratedRound {
  const { tier, subtlety } = difficultyCurve(difficulty);
  const intervals = tier === 0
    ? ([["Minor 2nd", 1], ["Major 2nd", 2], ["Perfect 5th", 7], ["Octave", 12]] as const)
    : tier === 1
      ? ([["Minor 3rd", 3], ["Major 3rd", 4], ["Perfect 4th", 5], ["Perfect 5th", 7]] as const)
      : ([["Minor 2nd", 1], ["Major 2nd", 2], ["Minor 3rd", 3], ["Major 3rd", 4], ["Perfect 4th", 5], ["Tritone", 6], ["Perfect 5th", 7], ["Minor 6th", 8], ["Major 6th", 9], ["Minor 7th", 10], ["Major 7th", 11], ["Octave", 12]] as const);
  const picked = pick([...intervals], seed);
  const [label, semitones] = picked;
  const opts = shuffle([...intervals].slice(0, Math.min(6, intervals.length)).map(([l, s]) => ({ id: String(s), label: l })), seed + 3);
  if (!opts.some((o) => o.id === String(semitones))) opts[0] = { id: String(semitones), label };
  return choiceRound("pitch-interval", difficulty, seed, "فاصلهٔ بین دو نت را تشخیص بده",
    subtlety > 0.5 ? "فواصل نزدیک سخت‌تر شنیده می‌شوند" : "اول نت پایه را قفل کن",
    String(semitones), opts,
    { kind: "harmonic", fundamental: 440 * Math.pow(2, (48 + Math.floor(seededOffset(seed) * 12) - 69) / 12), partials: [1], duration: 0.55 },
    { type: "none" }, `فاصله: ${label}`, { interval: label, semitones });
}

function genEqPeak(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const bands = [
    { id: "sub", label: "زیر ۱۰۰Hz", hz: 80 }, { id: "low", label: "حدود ۲۵۰Hz", hz: 250 },
    { id: "mid", label: "حدود ۱kHz", hz: 1000 }, { id: "high", label: "حدود ۸kHz", hz: 8000 },
  ];
  const band = pick(bands, seed);
  const gain = lerp(10, 2.5, subtlety);
  return choiceRound("eq-peak", difficulty, seed, "ناحیهٔ تقویت‌شده را پیدا کن", "به محل انرژی تغییر گوش بده",
    band.id, bands.map((b) => ({ id: b.id, label: b.label })),
    { kind: "noise", seconds: 1.4, color: "pink" },
    { type: "peaking", frequency: band.hz, gainDb: gain, q: 1.4 },
    `تقویت در ${band.label}`, { frequency: band.hz, gainDb: gain });
}

function genEqCut(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const bands = [
    { id: "mud", label: "کاهش گل‌آلودگی (~۳۰۰Hz)", hz: 300 },
    { id: "box", label: "کاهش boxiness (~۵۰۰Hz)", hz: 500 },
    { id: "nasal", label: "کاهش nasal (~۱.۵kHz)", hz: 1500 },
    { id: "harsh", label: "کاهش harshness (~۴kHz)", hz: 4000 },
  ];
  const band = pick(bands, seed);
  const gain = -lerp(10, 3, subtlety);
  return choiceRound("eq-cut", difficulty, seed, "کدام ناحیه کم شده؟", "به جای خالی‌شده در طیف توجه کن",
    band.id, bands.map((b) => ({ id: b.id, label: b.label })),
    { kind: "noise", seconds: 1.4, color: "pink" },
    { type: "peaking", frequency: band.hz, gainDb: gain, q: 1.6 },
    `کاهش در ${band.label}`, { frequency: band.hz, gainDb: gain });
}

function genCompAttack(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const isFast = seededOffset(seed) > 0.5;
  const attack = isFast ? (subtlety > 0.5 ? 0.002 : 0.005) : (subtlety > 0.5 ? 0.08 : 0.15);
  return choiceRound("comp-attack", difficulty, seed, "رفتار Attack کمپرسور را تشخیص بده", "به transient اول ضربه گوش کن",
    isFast ? "fast" : "slow",
    [{ id: "fast", label: "Attack سریع" }, { id: "slow", label: "Attack آهسته" }, { id: "high-ratio", label: "Ratio بالا" }, { id: "low-thresh", label: "Threshold پایین" }],
    { kind: "percussion", hits: 4, spacing: 0.4, toneHz: 180 }, { type: "none" },
    `Attack ${isFast ? "سریع" : "آهسته"} (~${(attack * 1000).toFixed(0)} ms)`, { attack });
}

function genLoudnessCompare(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const delta = lerp(6, 1.2, subtlety);
  const louder = seededOffset(seed) > 0.5 ? "a" : "b";
  return choiceRound("loudness-compare", difficulty, seed, "کدام نمونه بلندتر است؟", "سطح کلی را مقایسه کن",
    louder, [{ id: "a", label: "نمونه A" }, { id: "b", label: "نمونه B" }, { id: "same", label: "تقریباً یکسان" }, { id: "unclear", label: "نامشخص" }],
    { kind: "harmonic", fundamental: 220, partials: [1, 0.3, 0.15], duration: 1.0 },
    { type: "gain", gainDb: louder === "a" ? delta / 2 : -delta / 2 },
    `تفاوت حدود ${delta.toFixed(1)} dB`, { deltaDb: delta, louder });
}

function genPhaseDetect(difficulty: number, seed: number): GeneratedRound {
  const inverted = seededOffset(seed) > 0.5;
  return choiceRound("phase-detect", difficulty, seed, "Polarity را تشخیص بده", "روی استحکام low-end تمرکز کن",
    inverted ? "inverted" : "normal",
    [{ id: "normal", label: "عادی (In phase)" }, { id: "inverted", label: "معکوس (Out of phase)" }],
    { kind: "harmonic", fundamental: 110, partials: [1, 0.5, 0.25], duration: 1.2 }, { type: "none" },
    inverted ? "فاز معکوس بود" : "فاز عادی بود", { phase: inverted ? "inverted" : "normal" });
}

function genPanDetect(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const positions = [
    { id: "L", label: "چپ", pan: -0.85 }, { id: "C", label: "مرکز", pan: 0 },
    { id: "R", label: "راست", pan: 0.85 }, { id: "slight-L", label: "کمی چپ", pan: -0.35 },
  ];
  const pickPool = subtlety > 0.5 ? positions : positions.slice(0, 3);
  const pos = pick(pickPool, seed);
  return choiceRound("pan-detect", difficulty, seed, "موقعیت صدا در استریو را پیدا کن", "با هدفون دقیق‌تر است",
    pos.id, pickPool.map((p) => ({ id: p.id, label: p.label })),
    { kind: "harmonic", fundamental: 440, partials: [1], duration: 1.0 },
    { type: "pan", value: pos.pan }, `موقعیت: ${pos.label}`, { pan: pos.pan });
}

function genReverbType(difficulty: number, seed: number): GeneratedRound {
  const types = [
    { id: "dry", label: "بدون Reverb", decay: 0.05 }, { id: "room", label: "Room کوتاه", decay: 0.45 },
    { id: "hall", label: "Hall بلند", decay: 2.4 }, { id: "plate", label: "Plate", decay: 1.1 },
  ];
  const t = pick(types, seed);
  return choiceRound("reverb-type", difficulty, seed, "نوع فضا / reverb را تشخیص بده", "به طول دم بعد از قطع نت گوش کن",
    t.id, types.map((x) => ({ id: x.id, label: x.label })),
    { kind: "percussion", hits: 2, spacing: 0.9, toneHz: 330 }, { type: "none" },
    `نوع: ${t.label}`, { reverb: t.id, decay: t.decay });
}

function genChordQuality(difficulty: number, seed: number): GeneratedRound {
  const { tier } = difficultyCurve(difficulty);
  const chords = tier === 0
    ? ([["maj", "Major"], ["min", "Minor"]] as const)
    : tier === 1
      ? ([["maj", "Major"], ["min", "Minor"], ["dim", "Diminished"], ["aug", "Augmented"]] as const)
      : ([["maj", "Major"], ["min", "Minor"], ["dim", "Diminished"], ["aug", "Augmented"], ["sus4", "Sus4"], ["maj7", "Maj7"]] as const);
  const picked = pick([...chords], seed);
  const [id, label] = picked;
  return choiceRound("chord-quality", difficulty, seed, "کیفیت آکورد را تشخیص بده", "به حس شاد/غمگین توجه کن",
    id, chords.map(([cid, clabel]) => ({ id: cid, label: clabel })),
    { kind: "loop", pattern: "pad", duration: 1.4 }, { type: "none" }, `آکورد: ${label}`, { chord: label });
}

function genScaleType(difficulty: number, seed: number): GeneratedRound {
  const scales = [
    { id: "major", label: "Major" }, { id: "minor", label: "Natural Minor" },
    { id: "pent", label: "Pentatonic" }, { id: "blues", label: "Blues" },
  ];
  const s = pick(scales, seed);
  return choiceRound("scale-type", difficulty, seed, "نوع گام را تشخیص بده", "به حس کلی و نت‌های مشخصه گوش کن",
    s.id, scales.map((x) => ({ id: x.id, label: x.label })),
    { kind: "loop", pattern: "pluck", duration: 1.6 }, { type: "none" }, `گام: ${s.label}`, { scale: s.label });
}

function genRhythmCount(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const hits = pick(subtlety > 0.4 ? [3, 4, 5, 6] : [2, 3, 4], seed);
  const spacing = lerp(0.45, 0.22, subtlety);
  return choiceRound("rhythm-count", difficulty, seed, "تعداد ضربه‌ها را بشمار", "با انگشت بشمار",
    String(hits),
    shuffle([hits, hits + 1, Math.max(1, hits - 1), hits + 2].map((n) => ({ id: String(n), label: `${n} ضربه` })), seed + 5),
    { kind: "percussion", hits, spacing, toneHz: 160 }, { type: "none" }, `${hits} ضربه`, { hits });
}

function genSatAmount(difficulty: number, seed: number): GeneratedRound {
  const levels = [
    { id: "clean", label: "تمیز" }, { id: "warm", label: "گرم" },
    { id: "tape", label: "Tape" }, { id: "heavy", label: "سنگین" },
  ];
  const lvl = pick(levels, seed);
  return choiceRound("sat-amount", difficulty, seed, "میزان saturation را تخمین بزن", "به هارمونیک‌های اضافه گوش کن",
    lvl.id, levels.map((x) => ({ id: x.id, label: x.label })),
    { kind: "loop", pattern: "bass", duration: 1.3 }, { type: "none" }, `سطح: ${lvl.label}`, { saturation: lvl.label });
}

function genFilterType(difficulty: number, seed: number): GeneratedRound {
  const filters = [
    { id: "lpf", label: "Low-pass (حذف بالا)" }, { id: "hpf", label: "High-pass (حذف پایین)" },
    { id: "bpf", label: "Band-pass" }, { id: "none", label: "بدون فیلتر" },
  ];
  const f = pick(filters, seed);
  return choiceRound("filter-type", difficulty, seed, "نوع فیلتر را تشخیص بده", "کدام محدوده فرکانسی حذف شده؟",
    f.id, filters.map((x) => ({ id: x.id, label: x.label })),
    { kind: "noise", seconds: 1.3, color: "white" }, { type: "none" }, `فیلتر: ${f.label}`, { filter: f.id });
}

export const EXERCISE_REGISTRY: ExerciseDefinition[] = [
  { id: "freq-detect", title: "Frequency Detection", titleFa: "تشخیص فرکانس", skill: "frequency", description: "Identify the dominant frequency", gameId: "sg-freq-detect", answerMode: "choice", supportsAb: false, generate: genFreqDetect },
  { id: "pitch-interval", title: "Interval Recognition", titleFa: "تشخیص فاصله", skill: "tone", description: "Identify musical intervals by ear", gameId: "sg-interval", answerMode: "choice", supportsAb: false, generate: genPitchInterval },
  { id: "eq-peak", title: "EQ Boost Detection", titleFa: "تشخیص تقویت EQ", skill: "eq", description: "Find the boosted frequency region", gameId: "sg-eq-peak", answerMode: "choice", supportsAb: true, generate: genEqPeak },
  { id: "eq-cut", title: "EQ Cut Detection", titleFa: "تشخیص کاهش EQ", skill: "eq", description: "Find the cut frequency region", gameId: "sg-eq-cut", answerMode: "choice", supportsAb: true, generate: genEqCut },
  { id: "comp-attack", title: "Compressor Attack", titleFa: "Attack کمپرسور", skill: "dynamics", description: "Hear fast vs slow compressor attack", gameId: "sg-compressionist", answerMode: "choice", supportsAb: true, generate: genCompAttack },
  { id: "loudness-compare", title: "Loudness Comparison", titleFa: "مقایسه بلندی", skill: "balance", description: "Compare relative loudness", gameId: "sg-loudness-db", answerMode: "choice", supportsAb: true, generate: genLoudnessCompare },
  { id: "phase-detect", title: "Phase / Polarity", titleFa: "تشخیص فاز", skill: "spatial", description: "Detect phase inversion", gameId: "sg-phase", answerMode: "choice", supportsAb: false, generate: genPhaseDetect },
  { id: "pan-detect", title: "Pan Position", titleFa: "موقعیت پن", skill: "spatial", description: "Locate stereo pan position", gameId: "sg-pan-train", answerMode: "choice", supportsAb: false, generate: genPanDetect },
  { id: "reverb-type", title: "Reverb Type", titleFa: "نوع ریورب", skill: "spatial", description: "Identify room / hall / plate / dry", gameId: "sg-reverb-type", answerMode: "choice", supportsAb: true, generate: genReverbType },
  { id: "chord-quality", title: "Chord Quality", titleFa: "کیفیت آکورد", skill: "tone", description: "Major, minor, diminished, augmented", gameId: "theory-chord", answerMode: "choice", supportsAb: false, generate: genChordQuality },
  { id: "scale-type", title: "Scale Recognition", titleFa: "تشخیص گام", skill: "tone", description: "Major, minor, pentatonic, blues", gameId: "theory-scale", answerMode: "choice", supportsAb: false, generate: genScaleType },
  { id: "rhythm-count", title: "Rhythm Count", titleFa: "شمارش ریتم", skill: "time", description: "Count percussion hits", gameId: "sg-rhythm", answerMode: "choice", supportsAb: false, generate: genRhythmCount },
  { id: "sat-amount", title: "Saturation Amount", titleFa: "میزان سچوریشن", skill: "quality", description: "Clean to heavy saturation", gameId: "sg-sat-detect", answerMode: "choice", supportsAb: true, generate: genSatAmount },
  { id: "filter-type", title: "Filter Type", titleFa: "نوع فیلتر", skill: "eq", description: "LPF / HPF / BPF / none", gameId: "sg-filter-expert", answerMode: "choice", supportsAb: true, generate: genFilterType },
];

export function generateRound(exerciseId: string, difficulty: number, seed: number): GeneratedRound {
  const ex = EXERCISE_REGISTRY.find((e) => e.id === exerciseId) || EXERCISE_REGISTRY[0];
  return ex.generate(difficulty, seed);
}

export function getExercise(id: string): ExerciseDefinition | undefined {
  return EXERCISE_REGISTRY.find((e) => e.id === id);
}

export function listExercisesBySkill(skill: string): ExerciseDefinition[] {
  return EXERCISE_REGISTRY.filter((e) => e.skill === skill);
}

export function allExerciseIds(): string[] {
  return EXERCISE_REGISTRY.map((e) => e.id);
}
