# Dialed "Sound" clone: spec and gap table

Status legend: **[brief]** taken from the written brief (frames of IMG_5214.MP4 as described by the requester), **[repo]** read from this repo, **[UNVERIFIED]** could not be confirmed against https://dialed.gg/sound (no live-browser recon was possible in the authoring session). Every UNVERIFIED item must be checked with `scripts/dialed-recon.md` steps before the PR is called pixel-accurate.

## 1. Reference behaviour

| Area | Reference (dialed.gg/sound) | Source |
|---|---|---|
| Card | ~630x786 (4:5), radius ~16px, `#000`, large soft shadow on light page | [brief] |
| Top-left | round counter `1 / 5`, ~11px, bold, slight tracking | [brief] |
| Top-right | wordmark, ~#888 | [brief] |
| Waveform | full-height vertical, two interfering sines (teal ~#2ee6b8, purple ~#7a3cff), thin lines, glow, faint stacked echo copies, beating envelope, lobes scale with Hz, slow phase drift, fades toward bottom | [brief] exact colors/glow/lobe math UNVERIFIED |
| Tuning | vertical drag / scroll anywhere; white up-down arrow cursor at pointer; log-like mapping; live tone follows pitch | [brief] oscillator type, smoothing, gain UNVERIFIED |
| Readout | bottom-left Hz, 2 decimals, ~56px white grotesk, small muted "Hz" ~14px | [brief] font UNVERIFIED |
| Submit | bottom-right 32px white circle, thin black right arrow | [brief] |
| Result | score counts 0.00 → final (ease-out ~0.6-0.8s), right-aligned top-right ~56px; TARGET label + target Hz gray, blur/fade in; user Hz white below; gray one-line feedback under score; wave keeps animating | [brief] |
| Scoring | hypothesis `10 * (1 - cents/200)` clamped at 0 | [brief] hypothesis; 202.57 vs 209.36 = 57.08 cents = 7.146, displayed 7.14 so display is **floor**, not round. UNVERIFIED with more samples |
| Next round | black screen, counter `n / 5`, top-right words `ready` → `set` → `go` | [brief] timing UNVERIFIED |
| After "go" | reference behaviour UNVERIFIED; we keep our listen → remember → recreate flow |

## 2. Gap table

| Element | dialed.gg | Ours before this PR | Change |
|---|---|---|---|
| Card shell | black 4:5 card | `fm-glass-card` translucent, wide, dark glass, radius 28px | new `FrequencyMemoryCard` + `fm-card.css` |
| Counter | top-left `1 / 5` | mono meta row with `استریک` | counter only, LTR |
| Wordmark | top-right gray | none | "ArtistYar" (own wordmark) |
| Waveform | canvas-like vertical two-wave with echoes and fade | 5 SVG polylines, single gradient, ~200px tall | canvas 2D, two layers x 10 echoes, DPR aware, reduced-motion static |
| Tuning gesture | vertical drag/wheel, relative, cursor icon | horizontal-position mapping + circular boost | relative vertical drag + wheel + arrow keys, custom cursor |
| Frequency mapping | log | log (position based) | log (delta based) |
| Live tone | sine, live pitch | `startLiveTone` sine peak 0.28, tau 12ms | unchanged pending recon [UNVERIFIED] |
| Readout | 56px bottom-left, 2 decimals | `Math.round` Hz, kHz formatting, centered | 2 decimals, `Hz` unit, bottom-left |
| Submit | white circle arrow | "قفل پاسخ" text button | circular arrow button |
| Score | `10*(1-cents/200)`, floor 2dp | blend of Hz tolerance and cents, `Math.round(acc/10, 2)` | `dialedScore()`; stored `accuracy = score*10` |
| Result layout | score top-right, TARGET/user stacked bottom-left | centered score, comparison dial, GUESS/TARGET rows | per reference |
| Feedback copy | witty tiered line | 5 Persian tiers (`freqResultLine`) | kept Persian tiers, restyled; tier text to be replaced after scrape |
| Ready/set/go | auto sequence | "آماده" + manual "برو" button | auto `ready → set → go`, then next round |
| Summary | unknown | glass card | unchanged (remaining difference) |
| State machine | unknown after go | intro → play(listen/remember/recreate) → result → ready → summary | unchanged |
| Routing/auth/analytics/data | n/a | `persistPracticeRound`, skills API | untouched |

## 3. Remaining recon (must be done in a real browser)

1. `@font-face` / network tab for the readout font; swap the font stack in `fm-card.css`.
2. Waveform source (canvas/SVG/WebGL): exact colors, line width, glow blur, echo count, lobe formula.
3. WebAudio graph: oscillator type, gain, portamento, start/stop envelopes.
4. Scoring with 5+ inputs, and all feedback tiers from the JS bundle.
5. What happens after `go`, results-screen continue affordance, end screen.
6. Breakpoints, touch behaviour, reduced-motion handling.
