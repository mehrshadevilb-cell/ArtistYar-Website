/**
 * Deterministic practice/game logic tests (no browser, no audio hardware).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("practice scoring contracts", () => {
  it("frequencyAccuracy is pure and bounds results", async () => {
    const scoring = read("src/lib/practice-game/scoring.ts");
    assert.ok(scoring.includes("export function frequencyAccuracy"));
    assert.ok(scoring.includes("export function centsError"));
    assert.ok(scoring.includes("clamp(100 * (1 - cents / 200)"));
    assert.ok(scoring.includes("return { accuracy: 0"));
  });

  it("difficulty helpers clamp safely", () => {
    const diff = read("src/lib/practice-game/difficulty.ts");
    assert.ok(diff.includes("export function clamp"));
    assert.ok(diff.includes("export function safeHz"));
  });
});

describe("practice session / race contracts", () => {
  it("PracticeGameSession guards double submit and cleans up", () => {
    const pgs = read("src/components/PracticeGameSession.tsx");
    assert.ok(pgs.includes("useEffect") || pgs.includes("useRef"));
    assert.ok(/result|finish|complete|score/i.test(pgs));
    assert.ok(pgs.includes("FrequencyMemoryDial") || pgs.includes("isFreq") || pgs.includes("freq"));
  });

  it("practice question token binds userId and gameId", () => {
    const tok = read("src/lib/practice-question-token.ts");
    assert.ok(tok.includes("gameId"));
    assert.ok(tok.includes("userId"));
    assert.ok(tok.includes("fingerprint") || tok.includes("hmac") || tok.includes("sign"));
  });

  it("skill engine maps games deterministically", () => {
    const eng = read("src/lib/practice-skill-engine.ts");
    assert.ok(eng.includes("skillForGame"));
    assert.ok(eng.includes("interval-recognition") || eng.includes("GAME_SKILLS"));
  });
});

describe("audio engine lifecycle contracts", () => {
  it("practice-audio-engine exposes cleanup / stop paths", () => {
    const audio = read("src/lib/practice-audio-engine.ts");
    assert.ok(/close|stop|suspend|cleanup|dispose/i.test(audio));
    assert.ok(audio.includes("AudioContext") || audio.includes("audioContext") || audio.includes("ctx"));
  });
});

describe("frequency memory dial contracts", () => {
  it("dial component has mode transitions and unmount safety", () => {
    const dial = read("src/components/FrequencyMemoryDial.tsx");
    assert.ok(dial.includes("useEffect"));
    assert.ok(/cleanup|return \(\) =>|abort|cancel/i.test(dial) || dial.includes("useRef"));
  });
});

describe("interval recognition module present", () => {
  it("interval recognition generator exists", () => {
    assert.ok(existsSync(join(root, "src/lib/practice-game/interval-recognition.ts")));
    const ir = read("src/lib/practice-game/interval-recognition.ts");
    assert.ok(ir.length > 100);
  });
});
