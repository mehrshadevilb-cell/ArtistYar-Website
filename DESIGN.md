# ArtistYar DESIGN.md

Design contract for ArtistYar (artistyaar.ir) — Persian-first RTL music academy.
Inspired by Linear density and single-accent discipline; adapted to ArtistYar’s gold brand and educational conversion goals.

## Atmosphere
- Density: Daily App Balanced (5–6) with gallery air on marketing surfaces
- Variance: Offset asymmetric hero (title + art), not centered brochure layout
- Motion: Fluid CSS + restrained spring; respect prefers-reduced-motion
- Mood: Premium studio dark / warm light, trustworthy, conversion-clear

## Color
Single chromatic accent: **gold** (`#c9a227` / `#d4af37`).
- Canvas dark: near-black ink (`#0b0b0a`–`#121210`)
- Canvas light: warm sand (`#f8f4ec`)
- Surfaces: charcoal panels with hairline borders — not heavy cards stacked on cards
- Muted ink for secondary text; never pure `#000`
- Success emerald only for live/status dots
- **Banned:** purple/neon glows, multi-accent rainbow chrome, solid-gold secondary buttons

## Typography
- Display: tight tracking (`letter-spacing: -0.04em` to `-0.05em`), weight 600–700
- Body: relaxed leading, readable Persian line length
- Hierarchy through weight + color, not size inflation alone
- Primary CTA label: medium-semibold, never thin

## CTA hierarchy (critical)
1. **Primary** — one gold filled button per view (`btn-primary`). Owns the accent glow.
2. **Secondary** — text link or ghost only (`hero-secondary-link`, `btn-ghost`). No gold fill.
3. **Header / FAB** — utility chrome. Must not compete with Hero primary.
   - Header “مشاوره رایگان” = quiet text
   - Floating RahYar = neutral glass, not solid gold

DOM order on homepage Hero:
`H1 → primary CTA → secondary text → trust line → feature cards / art`

## Components
- Buttons: pill radius, clear focus-visible gold ring, active scale ≤ 0.97
- Cards: hairline border, soft elevation; hover lifts border toward gold without neon
- Nav: muted by default; active = ink/gold text, not filled pills everywhere
- Mobile menu: body scroll lock, Escape closes, primary courses CTA as real `btn-primary` near bottom of panel
- FAB: dismissible, secondary presence, hidden on /assistant /admin /panel

## Layout
- Max content ~72rem; container-ay horizontal rhythm
- Hero grid: desktop title | disk, cards full width under; mobile title → cards → disk
- No overlapping text/art; every element owns its spatial zone
- RTL-first: logical properties preferred; test Persian wrapping

## Accessibility
- Focus-visible rings on all interactive controls
- aria-expanded / aria-controls on menus
- Decorative images alt="" ; meaningful controls labeled in Persian
- Touch targets ≥ 44px on primary actions

## Anti-patterns
- Competing gold CTAs in header + hero
- Solid-gold FAB hover
- Feature cards placed above primary CTA in DOM
- Generic purple AI gradients
- Inter-as-default for display (prefer existing project stack)
- Removing Plugin Lab, AI, courses, or consultation flows

## Source references
Adapted from Linear (single accent, dense craft) and Supabase (one chromatic CTA event) via awesome-design-md, without copying trademarks.
