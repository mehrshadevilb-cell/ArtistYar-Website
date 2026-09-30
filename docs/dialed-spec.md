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

### Restore / correctness

- Restored `src/components/PracticeGameSession.tsx` from the last known complete production implementation after the branch contained placeholder content. The branch file now contains the real session implementation; no `RESTORE_VIA_SCRIPT`, `PLACEHOLDER`, or `PLACEHOLDER_PGS` marker is intentionally present.
- The Frequency Memory flow is `intro → listen → remember → recreate → submit → result → ready → set → go → next round → summary`.
- Frequency Memory uses five rounds by default. Duplicate submission is guarded by `submitLockRef`.
- A round generation token (`roundGenRef`) is incremented when a round is built and when a submission is accepted. Async playback, remember, result-dwell, and ready/set/go callbacks capture the generation and bail when stale.
- Timer ownership is centralized in `clearTimers()`. Ready/set/go timers are stored in `readyTimersRef[]`; result dwell has its own cleanup owner. Unmount clears timers and stops both playback and live tone.

### Runtime / input model

- Pointer Events remain the single drag input path: pointerdown → pointermove → pointerup/pointercancel, with pointer capture and `touch-action: none` during recreation.
- High-frequency pointer movement no longer drives React state for cursor position. The cursor is updated through a DOM ref, while the current Hz value is kept in a ref and React updates are coalesced at the animation-frame boundary.
- Drag geometry is measured once on pointerdown and reused during the drag; pointermove no longer calls `getBoundingClientRect()`.
- Keyboard and the visually-hidden range control remain available for accessible frequency adjustment.

### Waveform rendering model

- One RAF loop is created by the mounted dial and cancelled on cleanup. It reads mutable refs for frequency, mode, playing, drag state, reduced motion, and low-power behavior.
- Canvas backing resolution is DPR-aware and capped on coarse/narrow devices. Static gradients are rebuilt only during resize rather than inside RAF.
- Tuning keeps the layered teal/purple interference renderer; result mode uses the single teal strand. Visibility changes pause meaningful drawing work while keeping the loop lifecycle intact.
- No per-frame React state is used by the waveform renderer.

### Audio model

- The dial uses the shared practice WebAudio engine rather than allocating audio nodes per pointer event. Live pitch changes remain exponential-ramp based and the audio path is stopped on submit, phase changes, and unmount.
- The session explicitly unlocks audio from the user start action and handles rejected/suspended playback with a minimal retryable error message.

### Timing constants

| Sequence | Constant |
|---|---:|
| Remember phase | 2000 ms base (display countdown derived from duration) |
| Result score count-up | 1650 ms |
| Result dwell | 2650 ms |
| Ready | 700 ms |
| Set | 650 ms |
| Go | 700 ms |

### Reduced motion / mobile

- `prefers-reduced-motion: reduce` disables CSS transition/animation effects and snaps the result score to its final value instead of running the count-up.
- Canvas motion also stops advancing its phase under reduced motion. Pointer/touch interaction remains available without changing the game mechanics.
- The card keeps the same 4:5 interaction surface on desktop and mobile. At narrow widths the controls retain reachable circular targets and the summary switches its four-stat grid to two columns.

### UX polish kept within the reference interaction

- Summary presentation now uses the compact portrait session surface with `YOUR SESSION`, Total, Average, Best, Level, R1–R5, Play again, and بازگشت.
- Play Again reuses the same session reset path: timers, audio, round history, target history, exercise history, score, and generation state are rebuilt for a fresh five-round run.
- No routing, authentication, analytics, Supabase schema, or unrelated application infrastructure was changed.

### Verification status

- Repository inspection was performed through the GitHub integration because a local checkout is not mounted in this execution environment.
- A direct local `git clone`/npm execution was blocked by the environment's inability to resolve `github.com`; therefore `npm ci`, `npm run typecheck`, `npm run build`, and `npm audit --omit=dev` are not claimed as locally executed.
- The repository's existing `.github/workflows/production-verify.yml` runs those checks on pull requests to `main`; the branch should be verified through that CI path after the PR is opened.
- Live Chromium side-by-side verification remains blocked by the same outbound-browser restriction documented above. Exact live feedback-tier copy and final waveform/audio constants remain capture-dependent rather than asserted as verified.


### UI polish pass — 2026-09-30

- Ready/set/go is localized to Persian copy: **آماده → تنظیم → برو** while retaining the existing deterministic 700/650/700ms transition sequence.
- The round-transition surface is visually quieter: the secondary round counter is removed from the transition screen so the word is the sole focal element.
- Frequency Memory tuning/result surfaces were enlarged toward the reference 630×786 portrait geometry, with stronger but still soft depth/shadow treatment.
- Result reveal now has dedicated score, target, and feedback entrance motion (blur/opacity/translate) while preserving the 1650ms score count-up.
- The phase status treatment was simplified from a bordered pill to a low-contrast micro-label so it does not compete with the waveform.
- Mobile keeps the compact 22.5rem surface cap and reduced-motion disables the new result/transition animations.
- Changes remain scoped to the Frequency Memory presentation layer; routing/auth/analytics/data flow were not changed.
