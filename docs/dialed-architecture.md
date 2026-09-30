# Dialed.gg Sound → ArtistYar Frequency Memory — Architecture

**Date:** 2026-09-28  
**Branch:** `feat/fm-dialed-pixel`  
**Authority:** Phase 0 `docs/dialed-spec.md` + video frames + live reference

## Goals
Reference-faithful presentation of Frequency Memory: pure-black portrait card, canvas dual-wave, vertical log drag, circular submit, score count-up, ready/set/go. Domain (adaptive, persist, XP, auth, other games) unchanged.

## State machine

| Reference | phase | freqSub / sub |
|-----------|-------|---------------|
| intro | intro | — |
| listen | play | listen |
| memory hold | play | remember (2s) |
| tuning | play | recreate |
| result | result | — |
| ready/set/go | ready | rs:ready → rs:set → rs:go |
| complete | summary | — |

Transitions reuse existing `enterRemember`, `finishRound`, `advanceToNextRound`, `beginNextFromReady`. Ready sequence is timed under `phase==="ready"`.

## Layers
- **Domain** (PracticeGameSession): phase, freqSub, rounds, adaptive, persist
- **Presentation** (FrequencyMemoryDial): black card surface, canvas wave, Hz, circular submit, result overlay
- **Animation**: RAF phase/glow (no domain re-renders per frame for wave)
- **Audio**: existing practice-audio-engine live tone API
- **Gesture**: vertical log drag, pointer capture, sr-only range

## Session ↔ Dial API
```ts
mode: "listen" | "remember" | "recreate" | "result"
resultScore?: number | null  // 0–10 display
resultFeedback?: string | null
roundLabel?: string          // "1 / 5"
brandLabel?: string          // "ArtistYar"
onLock?: () => void
```

## Score presentation
Domain accuracy stays 0–100. Display: `displayScore = accuracy/10` with 2 decimals, count-up. Optional cents formula for parity when target+guess available:
`clamp(0,10, 10*(1 - |cents|/200))`.

## Timing (central)

The implementation source of truth is `src/lib/frequency-memory-timing.ts`.

```text
rememberMs: 2000
resultTargetDelayMs: 340
resultFeedbackDelayMs: 620
resultScoreCountUpMs: 1650
resultDwellMs: 2650
readyMs: 700, setMs: 650, goMs: 700
```

## Non-goals
No change to IR/EQ/other games, auth, adaptive, skill API, proprietary fonts, second audio system.
