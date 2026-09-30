# Dialed.gg Sound → ArtistYar Frequency Memory — Recon, Gap Table & Verification

**Date:** 2026-09-30  
**Target:** `artistyaar.ir/practice` → Frequency Memory only  
**Reference:** `dialed.gg/sound` + `IMG_5214.MP4` (630×786, 24 fps, 17.4 s)  
**Implementation branch:** `feat/fm-dialed-pixel-20260930`

## Recon status

The repository already contained a prior Dialed parity recon dated 2026-09-28. That recon established the reference flow, the existing ArtistYar gaps, and the measured video timeline below. A fresh Playwright/Chromium attempt was made during this pass, but the execution environment blocks direct outbound navigation to both production origins (`ERR_BLOCKED_BY_ADMINISTRATOR` for the headless browser; Dialed also returns 403 through the web fetcher). Therefore this document does **not** claim a new live DOM/JS/network capture where one could not be obtained. The implementation below uses the existing recon + supplied frame-by-frame video ground truth, and the codebase itself was inspected from the GitHub default branch.

## Reference flow / measured video checkpoints

| Time | State | Ground truth |
|---:|---|---|
| 0.00–1.00s | tuning | `1/5`, wordmark top-right, ~740.09 Hz, dual teal/purple wave |
| 1.33–9.00s | drag | non-monotonic pitch changes; vertical double-arrow cursor; lobe density follows Hz |
| 9.00–12.00s | hold | ~202.57 Hz held before submit |
| ~12.33s | submit | wordmark disappears; score starts at `0.00`; waveform simplifies to one teal strand |
| ~12.67s | target | `TARGET` + `209.36 Hz` reveal |
| 13.00–14.67s | score | `0.00 → 6.02 → 7.12 → 7.14` ease-out |
| ~15.00s | transition | black card, `2/5`, then `ready → set → go` |
| 17.4s | capture end | round 2 tuning is outside the supplied recording |

## Reference technical model

- **Waveform:** canvas; dual-strand interference in tuning/listen, stacked faint echo/glow layers; result state becomes a single clean teal strand.
- **Palette:** teal approximately `#2ee6b8`, purple approximately `#7a3cff`; final-state wave is teal only.
- **Interaction:** vertical drag; frequency is mapped on a logarithmic/pitch-like scale rather than linear Hz-per-pixel.
- **Audio:** continuous sine oscillator during tuning with short pitch portamento; the ArtistYar implementation now uses exponential frequency ramps over a short interval rather than a linear Hz jump.
- **Scoring:** existing ArtistYar scoring is cents-based: `accuracy = clamp(100 * (1 - abs(cents)/200), 0, 100)`, where `cents = 1200 * log2(guess/target)`; displayed round score is accuracy/10. The supplied 202.57→209.36 example yields approximately 7.14/10.
- **Result dwell:** implementation uses 2.65 s from result entry before the next ready/set/go sequence; score count-up uses 1.65 s.
- **Ready/set/go:** implementation uses 700 ms / 650 ms / 700 ms.
- **Typography:** reference recon identified a proprietary Suisse-family face. ArtistYar intentionally keeps an open/system stack and does not copy the proprietary font files.

## Gap table — current main vs reference

| Element | dialed.gg | ours (current main before this branch) | change needed | risk |
|---|---|---|---|---|
| Card | black portrait ~4:5, soft shadow | black FM card existed but capped at 32rem | use 630×786 geometry and 16px radius | medium |
| Round counter | top-left, compact tabular | present | retain LTR/tabular placement | low |
| Wordmark | top-right during tuning | ArtistYar wordmark | retain own branding only | low |
| Wave | canvas, two-strand teal/purple + echoes | canvas but result also reused multi-layer wave | result must be single teal; keep interference only pre-result | high |
| Lobe density | tracks frequency | approximate logarithmic lobe count | keep frequency-dependent density; tune constants only from captures | high |
| Drag | vertical pitch/log feel | vertical log drag | preserve, improve ramp feel | medium |
| Cursor | white vertical double arrow while dragging | custom SVG double arrow | retain | low |
| Hz | large bottom-left, tabular | large bottom-left | retain; reference-sized typography | medium |
| Submit | small white circular arrow | circular submit was present but oversized | 32px reference-sized control | low |
| Listen/replay | replay mechanics need live verification | replay control exists | keep only where already supported; do not add alternate chrome | medium |
| Result score | top-right, count-up | top-right, 900ms count-up | 1.65s measured presentation | medium |
| Target | gray reveal below result score | target lived in bottom-left block | move target to right result stack | high |
| Feedback | right-aligned under result stack | right-aligned but too high | align under target/result area | medium |
| Result wave | one teal strand | reused dual wave | single teal renderer | high |
| Ready/set/go | full black surface, literal words | Persian words in previous implementation | use literal `ready/set/go` | high |
| Transition timing | ~0.6–0.7s words | 700/600/500 | 700/650/700 | medium |
| Result dwell | ~submit→next transition ≈2.6s | 2.0s | 2.65s | medium |
| Summary | reference has a dedicated final summary | existing ArtistYar glass card | use black portrait summary surface | high |
| Intro | reference has a dedicated sound intro | existing FM-specific intro | retain dedicated FM surface; exact live copy requires a fresh unblocked capture | high |
| Mobile | same interaction model, touch | touch-action + pointer capture | preserve and test on deployed/staging origin | medium |
| Reduced motion | live behavior requires capture | existing media-query handling | preserve; disable nonessential transitions/count-up | low |
| Audio envelope | short sine attack/release + pitch glide | existing WebAudio sine | use short ramps and exponential pitch glide | high |
| Font | proprietary Suisse family | system/Inter-like stack | keep licensed substitute | low |
| RTL | chrome may be RTL, game card geometry LTR | card already `dir=ltr` | preserve | low |

## Current branch changes

1. **Waveform renderer:** result-state renderer is a single teal strand; tuning retains dual-strand interference and glow/echo layers.
2. **Audio engine:** live oscillator pitch changes now use a short exponential ramp to better match pitch-perceptual movement.
3. **Result sequence:** target is presented in the upper-right result stack; feedback remains right-aligned; score count-up is 1.65 s.
4. **Round transition:** result dwell is 2.65 s; ready/set/go is 700/650/700 ms and uses literal reference words.
5. **Geometry:** FM and final-summary surfaces use the 630×786 reference aspect and 16px radius, with a 32px submit control.
6. **Domain isolation:** no routing, auth, analytics, persistence, adaptive logic, or Supabase schema changes.

## Verification limitations / remaining work

A production side-by-side recording cannot honestly be marked complete from this environment because the headless browser cannot reach either live origin. The required comparison captures should therefore be generated in an environment with outbound Chromium navigation enabled (or from the deployment CI runner), at minimum for desktop and mobile: intro, listen, tuning, result, ready/set/go, and final summary.

The exact live feedback-tier copy, exact waveform draw constants, exact WebAudio envelope constants, and exact intro/final-summary copy remain **capture-dependent** and should not be represented as verified facts until the live browser trace is available again.


## Frequency Memory Engineering Audit

**Audit branch:** `fix/frequency-memory-engineering-audit-20260930`  
**Scope:** Frequency Memory presentation, state transitions, input, audio lifecycle, rendering, accessibility, mobile behavior, and replay cleanup. Unrelated practice games, routing, auth, analytics, persistence, and Supabase behavior remain out of scope.

### Bugs found and root causes

1. **Submit did not immediately make the dial non-interactive.** The session waited for round persistence to finish before entering `result`, leaving a window where pointer input could still mutate the guess. The result phase now starts immediately after the score/outcome is computed; persistence continues independently.
2. **Result/ready timings were duplicated and stale.** The session still contained `700/600/500ms` ready timings and a 2.0s result dwell even though the parity pass documented `700/650/700ms` and ~2.65s. All Frequency Memory timings now come from one named constants module.
3. **Result transition callback could be captured through a changing render closure.** The automatic result timer now calls a ref-backed transition callback, while its effect depends only on the actual result conditions. This avoids timer churn caused by function identity changes.
4. **Pointer cursor position used React state on every pointer move.** The cursor is now positioned through a DOM ref, while the renderer reads a ref-backed Y coordinate. Dragging no longer schedules a component-tree render solely to move the cursor.
5. **The parent session state was updated on every pointer move.** Frequency Memory now keeps the authoritative live guess in a ref during tuning. The dial owns its live display/canvas value; the parent reads the ref when submitting. This removes parent/session rerenders from the high-frequency drag path.
6. **Async live-tone startup could race with submit/unmount.** A generation/request token now invalidates pending `startLiveTone()` calls when a newer request or `stopLiveTone()` occurs, preventing an oscillator from being created after the interaction has already ended.
7. **Target/feedback reveal did not model the documented stagger.** The result target now uses a delayed blur/fade reveal and feedback has its own later fade-in. Reduced motion bypasses those delays.

### State-machine behavior

The authoritative lifecycle remains:

`intro → play/listen → play/remember → play/recreate → result → ready(ready/set/go) → next round → summary`.

Submit is guarded by both `submitLockRef` and the `recreate` sub-state. The result phase is entered immediately after the round score is computed, so pointer interaction and live audio are cut off before persistence completes. All timers are cleared on round construction, transition start, unmount, and route/session cleanup. The automatic result advance is guarded by the current phase/feedback state and a memoized transition callback.

### Timing constants

The single source of truth is `src/lib/frequency-memory-timing.ts`:

| Constant | Value |
|---|---:|
| remember window | 2000 ms |
| result target reveal delay | 340 ms |
| result feedback reveal delay | 620 ms |
| score count-up | 1650 ms |
| result dwell | 2650 ms |
| ready | 700 ms |
| set | 650 ms |
| go | 700 ms |

These are presentation constants, not scoring constants.

### Rendering/performance changes

- One stable canvas and one `requestAnimationFrame` loop per mounted dial; cleanup cancels the RAF and disconnects `ResizeObserver`/listeners.
- Canvas backing resolution is capped by device class to avoid uncontrolled high-DPR work.
- Gradients are created during resize rather than inside the hot drawing loop.
- Visual-only phase/cursor values are ref-backed; React state is reserved for values that affect rendered React content.
- Tuning keeps the dual-strand interference renderer; result mode uses one teal strand.
- The waveform continues to use the logarithmic frequency-to-lobe relationship already documented; no linear-Hz remapping was introduced.

### Audio lifecycle

The existing shared `AudioContext` remains in place. Frequency Memory uses one live sine oscillator for continuous tuning. Pitch changes use bounded exponential ramps with a safe minimum frequency. Submit, round change, replay, unmount, and transition cleanup call `stopLiveTone()`. Pending async live-tone requests are invalidated so they cannot resurrect audio after cleanup. No second audio engine was introduced.

### Input / mobile behavior

Pointer capture remains the common mouse/touch path. Vertical movement maps through the existing logarithmic frequency transform, with min/max clamping. `touch-action: none`, `preventDefault()`, pointer capture, pointer-up, and pointer-cancel prevent page scrolling and stuck drags. The visible submit circle remains visually close to the 32px reference while its button hit area is larger for accessibility. The card remains `dir="ltr"`; surrounding ArtistYar chrome can remain RTL.

### Accessibility / reduced motion

The tuning surface remains a semantic slider with a keyboard path and visible focus ring. The hidden range input provides a native fallback control. Result score uses `aria-live`, and feedback is announced politely. Under `prefers-reduced-motion: reduce`, score count-up becomes immediate, result reveal delays are removed, waveform phase drift is stopped, and CSS transitions/ready animation are disabled while the game flow remains intact.

### Replay and cleanup verification

Code-level cleanup was audited for repeated sessions: timers, interval ticks, RAF, resize observers, visibility listeners, pointer capture, live oscillator state, and exercise playback are explicitly stopped/cleared at their lifecycle boundaries. A full five-session browser soak (including actual audio/frame measurements) still requires a browser environment with outbound navigation or an accessible deployment runner.

### Verification limitations

This environment does not provide a runnable checkout/terminal or an unrestricted Playwright browser against the production/reference origins. Therefore `npm ci`, `npm run typecheck`, `npm run build`, `npm audit --omit=dev`, project tests, and desktop/mobile browser recordings have **not** been represented as passed here. Production/reference live DOM, exact FPS, exact audio envelope measurements, and side-by-side captures remain pending external browser verification. No such measurements are claimed by this audit.

### Remaining deliberate differences

- The reference proprietary Suisse-family font is not copied; ArtistYar continues to use its licensed/system stack.
- ArtistYar branding remains in place instead of Dialed branding.
- Persian surrounding copy remains where it is part of ArtistYar's existing UI; the game card's numeric geometry stays LTR.
- Exact reference feedback-tier wording remains capture-dependent; this audit does not invent or claim unverified Dialed strings.
