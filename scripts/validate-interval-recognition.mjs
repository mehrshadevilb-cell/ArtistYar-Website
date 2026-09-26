/**
 * Interval Recognition — generator / diversity / adaptive bounds validation.
 */
const INTERVALS = [
  { id: "P1", semitones: 0, titleFa: "هم‌صدا", weight: 1 },
  { id: "m2", semitones: 1, titleFa: "دوم کوچک", weight: 4 },
  { id: "M2", semitones: 2, titleFa: "دوم بزرگ", weight: 2 },
  { id: "m3", semitones: 3, titleFa: "سوم کوچک", weight: 2 },
  { id: "M3", semitones: 4, titleFa: "سوم بزرگ", weight: 2 },
  { id: "P4", semitones: 5, titleFa: "چهارم درست", weight: 2 },
  { id: "TT", semitones: 6, titleFa: "تریتون", weight: 4 },
  { id: "P5", semitones: 7, titleFa: "پنجم درست", weight: 1 },
  { id: "m6", semitones: 8, titleFa: "ششم کوچک", weight: 3 },
  { id: "M6", semitones: 9, titleFa: "ششم بزرگ", weight: 3 },
  { id: "m7", semitones: 10, titleFa: "هفتم کوچک", weight: 3 },
  { id: "M7", semitones: 11, titleFa: "هفتم بزرگ", weight: 4 },
  { id: "P8", semitones: 12, titleFa: "اکتاو", weight: 1 },
];

function seeded(seed) {
  let x = (seed >>> 0) || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return ((x >>> 0) % 1_000_000) / 1_000_000;
}
function pick(items, seed) {
  return items[Math.floor(seeded(seed) * items.length) % items.length];
}
function poolForLevel(level) {
  const safe = Math.max(1, Math.min(50, Math.round(level)));
  if (safe <= 5) return INTERVALS.filter((i) => ["P5", "P8", "M3", "M2", "P4"].includes(i.id));
  if (safe <= 10) return INTERVALS.filter((i) => ["P5", "P8", "M3", "m3", "M2", "P4", "M6"].includes(i.id));
  if (safe <= 20) return INTERVALS.filter((i) => i.id !== "P1" && i.weight <= 3);
  if (safe <= 35) return INTERVALS.filter((i) => i.id !== "P1");
  return [...INTERVALS];
}
function midiToHz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
function gen(level, seed, recent = []) {
  const pool = poolForLevel(level);
  let candidates = pool.filter((i) => !recent.includes(i.id));
  if (!candidates.length) {
    const lastSeen = new Map();
    recent.forEach((id, index) => lastSeen.set(id, index));
    const seenValues = [...lastSeen.values()];
    const oldestIndex = seenValues.length ? Math.min(...seenValues) : -1;
    candidates = pool.filter((i) => !lastSeen.has(i.id) || lastSeen.get(i.id) === oldestIndex);
    if (!candidates.length) candidates = [pool[0]];
  }
  const picked = pick(candidates, seed);
  const rootMidi = 48 + Math.floor(seeded(seed + 9) * 16);
  let otherMidi = rootMidi + picked.semitones;
  if (otherMidi > 84) otherMidi = rootMidi - picked.semitones;
  return {
    id: picked.id, semitones: picked.semitones,
    fund: midiToHz(rootMidi), other: midiToHz(otherMidi),
    level, correctOptionId: picked.id, mode: "choice",
  };
}
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK", msg);
}
function nextLevel(level, outcomes) {
  if (!outcomes.length) return level;
  const last = outcomes.slice(-5);
  const avg = last.reduce((s, o) => s + o.accuracy, 0) / last.length;
  let delta = 0;
  if (avg >= 85) delta = 1; else if (avg < 45) delta = -1;
  const next = Math.max(1, Math.min(50, level + delta));
  if (Math.abs(next - level) > 2) return level + Math.sign(next - level) * 2;
  return next;
}
function runStress(n, label) {
  const recent = []; const ids = [];
  let level = 1; const outcomes = [];
  let consecutiveSame = 0, maxConsec = 0, prev = null;
  for (let i = 0; i < n; i++) {
    const seed = (i * 97 + 13 + level * 3) >>> 0;
    const r = gen(level, seed, recent);
    assert(Number.isFinite(r.fund) && r.fund > 20 && r.fund < 8000, label + " finite fund @" + i);
    assert(Number.isFinite(r.other) && r.other > 20 && r.other < 9000, label + " finite other @" + i);
    assert(INTERVALS.some((x) => x.id === r.id), label + " valid id @" + i);
    assert(new Set(poolForLevel(level).map((x) => x.id)).has(r.id), label + " pool level " + level + " @" + i);
    if (prev && r.id === prev) consecutiveSame++; else consecutiveSame = 1;
    maxConsec = Math.max(maxConsec, consecutiveSame);
    assert(!(prev && r.id === prev), label + " no consecutive repeat @" + i);
    if (ids.length >= 2) assert(!(ids[ids.length - 2] === prev && r.id === ids[ids.length - 2]), label + " no ABA @" + i);
    ids.push(r.id); recent.push(r.id); if (recent.length > 6) recent.shift(); prev = r.id;
    const acc = 50 + (seed % 50);
    outcomes.push({ accuracy: acc }); if (outcomes.length > 24) outcomes.shift();
    level = nextLevel(level, outcomes);
  }
  const unique = new Set(ids).size;
  assert(unique >= 5, label + " diversity unique=" + unique);
  assert(maxConsec <= 1, label + " max consecutive " + maxConsec);
  assert(level >= 1 && level <= 50, label + " level bounds");
  console.log("OK " + label + ": " + n + " rounds unique=" + unique + " maxConsec=" + maxConsec + " endLevel=" + level);
}
assert(INTERVALS.length === 13, "13 intervals");
assert(poolForLevel(1).every((i) => !["m2", "TT", "M7"].includes(i.id)), "beginner pool");
runStress(200, "200");
runStress(500, "500");
runStress(1000, "1000");
console.log("\nAll Interval Recognition validation checks passed");
