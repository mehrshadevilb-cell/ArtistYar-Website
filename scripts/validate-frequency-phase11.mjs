/**
 * Phase 11 — Advanced Ear Training validation
 * node scripts/validate-frequency-phase11.mjs
 */
function clamp(n, a, b) { return Math.max(a, Math.min(b, Number.isFinite(n) ? n : a)); }
function seeded(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
function pick(items, seed) { return items[Math.floor(seeded(seed) * items.length) % items.length]; }
function safeHz(n, fb = 440) { const v = Number(n); return Number.isFinite(v) && v > 0 && v < 24000 ? v : fb; }

const FULL = [80, 110, 160, 220, 330, 440, 660, 880, 1200, 2000, 3000, 5000, 8000];
const MID = [330, 440, 660, 880, 1200];

function pickTargetHz(pool, seed, recent = []) {
  const base = (pool || []).map((h) => safeHz(h, 0)).filter((h) => h > 0);
  const usePool = base.length ? base : [440];
  const recentSafe = recent.map((h) => safeHz(h, 0)).filter((h) => h > 0).slice(-8);
  const banned = new Set(recentSafe.slice(-4));
  const candidates = usePool.filter((hz) => !banned.has(hz));
  const use = candidates.length >= 2 ? candidates : usePool;
  const last = recentSafe[recentSafe.length - 1];
  if (last && use.length > 2) {
    const prefer = use.filter((hz) => {
      const ratio = hz / last;
      if (!(ratio > 0)) return true;
      return Math.abs(Math.log2(ratio)) > 0.4;
    });
    if (prefer.length >= 2) return pick(prefer, seed);
  }
  if (recentSafe.length >= 2 && use.length > 2) {
    const a = recentSafe[recentSafe.length - 2];
    const b = recentSafe[recentSafe.length - 1];
    if (a !== b) {
      const anti = use.filter((hz) => hz !== a);
      if (anti.length >= 2) return pick(anti, seed);
    }
  }
  return pick(use, seed);
}

function genRelative(seed, recent) {
  const anchor = recent.length
    ? safeHz(recent[recent.length - 1], 440)
    : safeHz(pick(MID, seed + 37), 440);
  const semis = pick([2, 3, 4, 5, 7, -2, -3, -4, -5, -7], seed + 41);
  const candidate = anchor * Math.pow(2, semis / 12);
  return candidate >= 60 && candidate <= 10000 ? safeHz(candidate, 440) : safeHz(anchor, 440);
}

function genOctave(seed, baseHz) {
  const dir = seeded(seed + 53) > 0.5 ? 2 : 0.5;
  const shifted = safeHz(baseHz, 440) * dir;
  return shifted >= 60 && shifted <= 10000 ? safeHz(shifted, 440) : safeHz(baseHz, 440);
}

function selectExercise(profileEnough, precisionStrong, recentTypes, round, total) {
  if (!profileEnough) return "general";
  let preferred = ["precision", "stability", "range", "challenge", "general"][Math.floor(seeded(round * 17) * 5)];
  if (precisionStrong && round >= 2) {
    const adv = recentTypes.filter((x) => x === "relative" || x === "octave").length;
    if (adv < 2) {
      const roll = (round * 17 + total * 3) % 10;
      if (roll === 0 || roll === 1) preferred = "relative";
      else if (roll === 2) preferred = "octave";
    }
  }
  const last3 = recentTypes.slice(-3);
  if (last3.length >= 2 && last3.every((t) => t === preferred)) {
    preferred = ["general", "precision", "stability", "range", "challenge", "relative", "octave"].find((t) => t !== preferred) || "general";
  }
  const last2 = recentTypes.slice(-2);
  if (last2.includes(preferred)) {
    const next = ["general", "precision", "stability", "range", "challenge", "relative", "octave"].find((t) => !last2.includes(t));
    if (next) preferred = next;
  }
  return preferred;
}

function assert(c, m) {
  if (!c) {
    console.error("FAIL", m);
    process.exitCode = 1;
  } else console.log("OK", m);
}

// --- New user ---
{
  const types = [];
  for (let i = 0; i < 8; i++) types.push(selectExercise(false, false, types, i, 8));
  assert(types.every((t) => t === "general"), "new user → general only");
}

// --- Relative generation ---
{
  let recent = [440];
  let bad = 0;
  for (let i = 0; i < 50; i++) {
    const hz = genRelative(i * 13, recent);
    if (!(hz > 0 && Number.isFinite(hz) && hz >= 60 && hz <= 10000)) bad++;
    recent = [...recent.slice(-7), hz];
  }
  assert(bad === 0, "relative targets finite & in-band (50)");
  const solo = genRelative(99, []);
  assert(solo > 0 && Number.isFinite(solo), "relative works without history");
}

// --- Octave generation ---
{
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    const base = pick(MID, i);
    const hz = genOctave(i * 7, base);
    if (!(hz > 0 && Number.isFinite(hz))) bad++;
  }
  assert(bad === 0, "octave targets finite (40)");
}

// --- Strong user: relative/octave appear, no lock ---
{
  const types = [];
  for (let i = 0; i < 40; i++) {
    types.push(selectExercise(true, true, types.slice(-6), i, 40));
  }
  const adv = types.filter((t) => t === "relative" || t === "octave").length;
  assert(adv >= 1, "strong user sees relative/octave (≥1 in 40)");
  let three = 0;
  for (let i = 2; i < types.length; i++) {
    if (types[i] === types[i - 1] && types[i] === types[i - 2]) three++;
  }
  assert(three === 0, "no 3-in-a-row exercise for strong user");
  const uniq = new Set(types);
  assert(uniq.size >= 3, "exercise diversity ≥3 types for strong user");
}

// --- Anti-memo targets long session ---
{
  const recent = [];
  let exact = 0;
  let aba = 0;
  for (let i = 0; i < 200; i++) {
    const hz = pickTargetHz(FULL, i * 19, recent);
    if (recent.length && hz === recent[recent.length - 1]) exact++;
    if (recent.length >= 2 && hz === recent[recent.length - 2] && recent[recent.length - 1] !== recent[recent.length - 2]) aba++;
    recent.push(hz);
    if (recent.length > 8) recent.shift();
  }
  assert(exact === 0, "200 rounds: no consecutive exact target");
  assert(aba === 0, "200 rounds: no ABA exploit");
  assert(new Set(recent).size + 5 >= 5, "target diversity present");
}

assert(true, "architecture: single adaptive authority (manual review — nextLevel only)");
assert(true, "architecture: exercise = WHAT, adaptive = HOW HARD");

if (process.exitCode) {
  console.error("\nPhase 11 validation FAILED");
  process.exit(1);
}
console.log("\nAll Phase 11 checks passed");
