import { describe, it } from "node:test";
import assert from "node:assert/strict";

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}
function safeHz(v, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}
function centsError(targetHz, guessHz) {
  const t = safeHz(targetHz, 0);
  const g = safeHz(guessHz, 0);
  if (!(t > 0) || !(g > 0)) return 1200;
  return 1200 * Math.log2(g / t);
}
function frequencyAccuracy(targetHz, guessHz) {
  const rawTarget = Number(targetHz);
  const rawGuess = Number(guessHz);
  if (
    !Number.isFinite(rawTarget) ||
    !Number.isFinite(rawGuess) ||
    rawTarget <= 0 ||
    rawGuess <= 0 ||
    rawTarget >= 24000 ||
    rawGuess >= 24000
  ) {
    return { accuracy: 0, hzErr: Infinity, cents: Infinity, perfect: false };
  }
  const t = safeHz(rawTarget, 0);
  const g = safeHz(rawGuess, 0);
  const hzErr = Math.abs(g - t);
  const cents = Math.abs(centsError(t, g));
  const accuracy = Math.round(clamp(100 * (1 - cents / 200), 0, 100) * 100) / 100;
  const perfect = cents <= 12;
  return { accuracy, hzErr, cents, perfect };
}

describe("frequencyAccuracy pure behavior", () => {
  it("exact match is perfect ~100", () => {
    const r = frequencyAccuracy(440, 440);
    assert.equal(r.accuracy, 100);
    assert.equal(r.perfect, true);
  });
  it("invalid inputs yield 0", () => {
    assert.equal(frequencyAccuracy(0, 440).accuracy, 0);
    assert.equal(frequencyAccuracy(440, NaN).accuracy, 0);
    assert.equal(frequencyAccuracy(-1, 100).accuracy, 0);
  });
  it("large error approaches 0", () => {
    const r = frequencyAccuracy(440, 880);
    assert.ok(r.accuracy === 0);
  });
  it("small error is high score", () => {
    const r = frequencyAccuracy(440, 442);
    assert.ok(r.accuracy > 80);
  });
});
