# Dialed.gg Sound → ArtistYar Frequency Memory — Pixel Spec & Gap Table

**Date:** 2026-09-28  
**Reference:** https://dialed.gg/sound + user video IMG_5214.MP4 (17.4s)  
**Target:** https://artistyaar.ir/practice → Frequency Memory only  
**Authority:** main branch; stable baseline preserved for all non-FM paths

---

## 1. Reference game flow (verified live + video)

1. **Intro card** — title “sound”, short copy, Solo / Multi (beta) / Easy toggle, rainbow calendar CTA.
2. **Round N/5** — pure black portrait card (~630×786, ~4:5, radius ~16–20px, soft large shadow).
3. **Listen** — target tone plays; vertical multi-lobe waveform animates (teal ↔ purple interference + stacked echo outlines). No drag yet.
4. **Remember** — short silence / hold (reference uses ~2s memory window after tone ends).
5. **Recreate (tuning)** — full-surface **vertical** drag/scroll changes Hz logarithmically; live tone follows; white double-arrow cursor at pointer; large Hz bottom-left; white circular → submit bottom-right.
6. **Result** — score counts up 0.00 → final (right-aligned ~56px); “TARGET” + gray target Hz above user’s white Hz; witty gray feedback line under score; waveform keeps animating.
7. **Inter-round** — full black; counter “2 / 5”; sequential words **ready → set → go** (fade gray→white); then next listen.
8. **End** — aggregate score / 50 after 5 rounds.

Scoring (hypothesis confirmed by public docs + video 202.57 vs 209.36 → 7.14):
- Perceptual (cents / ERB-style). Practical formula matching the frame:
  - cents ≈ 1200 × log2(guess/target)
  - score ≈ clamp(0, 10, 10 × (1 − |cents| / 200))
- 5 rounds → total / 50.

Font (live): `Suisse Intl S Alt` (proprietary). We use system / Inter / ui-sans equivalent; no licensed copy.

Waveform: **canvas** (4 canvases observed). Dual-color thin lines + glow + frequency-dependent lobe density + continuous phase drift + bottom fade.

Audio: WebAudio sine (or near-sine); live portamento while dragging; envelope on start/stop.

---

## 2. Video frame reconciliation (IMG_5214.MP4)

| t (s) | State | Visible |
|------:|-------|--------|
| 0–1 | Tuning | 740→642 Hz, vertical wave, double-arrow cursor |
| 2–4 | Tuning | 440→340 Hz, lobes widen as Hz drops |
| 5–10 | Tuning | 382→202 Hz |
| 11 | Submit | Arrow button pressed |
| 12–14 | Result | Score 0.00→7.14 count-up; TARGET 209.36; user 202.57 |
| 14 | Feedback | “Adjacent zip code. Not the right pitch.” |
| 15–16 | Next | Black “ready” → “set” |

---

## 3. Current ArtistYar implementation (main HEAD)

| File | Role |
|------|------|
| `src/components/PracticeGameSession.tsx` | Session state machine, rounds, persist, auth, adaptive |
| `src/components/FrequencyMemoryDial.tsx` | Vertical SVG wave + log mapping + live tone |
| `src/styles/practice-shell.css` | Glass card, dial surface, meta |
| `src/lib/practice-audio-engine.ts` | playExerciseRound, startLiveTone, setLiveToneHz |
| `src/lib/practice-game/*` | catalog, rounds, difficulty, frequencyAccuracy, selectFreqExercise |

**Existing strengths (keep):** routing, auth, RLS/persist, adaptive level 1–50, SessionPlan, skill profile, IR sibling game, Persian RTL shell outside the card.

---

## 4. Gap table

| Element | dialed.gg | ours (main) | Change needed |
|---------|-----------|-------------|----------------|
| Card chrome | Pure `#000`, portrait ~4:5, radius ~16px, soft shadow on light page | Glass dark (rgba + blur), max-w 42rem, padding, gold accents | Replace FM-only chrome with pure black portrait card; keep outer practice shell |
| Round counter | Top-left `1 / 5` ~11px bold | `fm-meta` mono | Match size/weight/position; LTR numbers |
| Brand | Top-right `Dialed.gg` mid-gray | None / game title | Our wordmark or “ArtistYar” small mid-gray |
| Waveform | Canvas dual teal/purple interference + many echo outlines, lobe count ∝ Hz, bottom fade, continuous drift | SVG 5 mono-gradient paths (teal→purple→gold), single sine family | Rebuild canvas dual-wave + echo trails; remove gold; match lobe density math |
| Drag axis | **Vertical** (Y → log Hz) | Primarily X (+ circular/vertical fine) | Switch primary axis to **clientY**; invert so top=high Hz (or match reference feel) |
| Cursor | White vertical double-arrow at pointer | grab/grabbing | Custom cursor / floating ↑↓ icon while dragging |
| Hz readout | Bottom-left ~56px white + small “Hz” | Centered under wave, GUESS/TARGET label | Bottom-left large tabular; unit muted |
| Submit | White circle ~32px + black → | “قفل پاسخ” full button + extra actions | Circular arrow only; primary CTA |
| Live tone | Continuous while drag | startLiveTone / setLiveToneHz | Keep engine; ensure portamento/smoothing matches feel |
| Result layout | Score top-right count-up; TARGET gray above; user Hz white; witty line | Persian accuracy card + detail string | New result overlay inside same card; score 0–10 with count-up |
| Feedback copy | English witty tiers (“Adjacent zip code…”) | Persian accuracy lines | Keep Persian tone + length; mirror tier structure (near / mid / far) |
| Inter-round | Black full-bleed **ready → set → go** | `phase === "ready"` with Persian CTA | Implement ready/set/go sequence (Persian: آماده / تنظیم / برو or keep English short words for parity) |
| Score scale | 0.00–10.00 per round, /50 session | accuracy 0–100 → display /10 already partial | Align formula to cents-based 0–10; show 2 decimals |
| Listen → remember | Tone then silence | listen → 2s remember timer → recreate | Keep 2s remember; optionally show black hold |
| State machine | intro → listen → remember → recreate → result → ready/set/go → … | intro / play(freqSub) / result / ready / summary | Extend result + ready visuals only; do not break adaptive/persist |
| Mobile / touch | Full-card vertical drag | touch-action:none present | Verify vertical drag + 44px hit targets |
| Reduced motion | — | prefers-reduced-motion handled | Preserve |
| Font | Suisse Intl S Alt | system / Inter / mono for Hz | Keep open fonts; match weight & tracking |
| RTL | LTR card | Site RTL; card should stay LTR for numbers/Hz | `dir="ltr"` on the black card only |

---

## 5. Non-goals (explicit)

- Do **not** change Interval Recognition, EQ Detective, or other games.
- Do **not** alter auth, persist, adaptive `nextLevel`, SessionPlan, or skill API.
- Do **not** copy Dialed proprietary font or logo assets.
- Do **not** add heavy deps (no Three.js / extra animation libs unless already present).
- Branding text only: “Dialed.gg” → “ArtistYar” (or omit).

---

## 6. Implementation plan (after this spec)

1. Feature branch `feat/fm-dialed-pixel`.
2. Rewrite `FrequencyMemoryDial` presentation: canvas dual-wave, vertical log drag, bottom-left Hz, circular submit.
3. Extend `PracticeGameSession` FM result + ready/set/go overlays only (same black card).
4. CSS: pure-black portrait card scoped under `.fm-dialed-card`; leave glass path for non-FM if needed.
5. Scoring display: map existing `frequencyAccuracy` → 0–10 with 2 decimals + count-up animation.
6. Small logical commits; PR with side-by-side screenshots (tuning / result / ready-set-go) desktop + mobile.

---

## 7. Success criteria

- Side-by-side screenshots at 3 states show no obvious layout/typography/motion differences to a non-designer.
- Vertical drag + live tone + lobe density feel match reference.
- Auth / persist / adaptive still work; IR game unchanged.
- Remaining differences documented (font license, brand, Persian feedback wording).
