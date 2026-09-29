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
