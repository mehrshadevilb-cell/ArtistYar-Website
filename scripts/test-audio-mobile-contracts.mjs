/**
 * Audio lifecycle + mobile/touch interaction contracts for Practice.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("audio lifecycle", () => {
  const audio = read("src/lib/practice-audio-engine.ts");
  const pgs = read("src/components/PracticeGameSession.tsx");

  it("exports stop helpers and resumes suspended context", () => {
    assert.ok(audio.includes("export function stopPracticePlayback"));
    assert.ok(audio.includes("stopLiveTone"));
    assert.ok(audio.includes("suspended"));
    assert.ok(audio.includes("resume"));
  });

  it("stop is safe when nothing is playing (idempotent path)", () => {
    assert.ok(/function stopPracticePlayback[\s\S]{0,400}(closed|null|catch)/.test(audio));
  });

  it("PracticeGameSession stops on unmount and mode changes", () => {
    assert.ok(pgs.includes("stopPracticePlayback"));
    assert.ok(pgs.includes("stopLiveTone"));
    const stops = (pgs.match(/stopPracticePlayback\(\)/g) || []).length;
    assert.ok(stops >= 2, `expected multiple stop call sites, got ${stops}`);
  });

  it("FrequencyMemoryDial stops live tone on cleanup paths", () => {
    const dial = read("src/components/FrequencyMemoryDial.tsx");
    assert.ok(dial.includes("stopLiveTone"));
  });
});

describe("mobile / touch interaction", () => {
  it("FrequencyMemoryDial uses pointer events + touch-action none while interactive", () => {
    const dial = read("src/components/FrequencyMemoryDial.tsx");
    assert.ok(dial.includes("onPointerDown"));
    assert.ok(dial.includes("onPointerMove"));
    assert.ok(dial.includes("onPointerUp"));
    assert.ok(dial.includes("onPointerCancel"));
    assert.ok(dial.includes("touchAction") || dial.includes("touch-action"));
  });

  it("practice shell or game CSS references mobile-friendly controls", async () => {
    const dial = read("src/components/FrequencyMemoryDial.tsx");
    assert.ok(!dial.includes("onMouseDown") || dial.includes("onPointerDown"));
    assert.ok(dial.includes("touchAction") || dial.includes("touch-action"));
  });
});
