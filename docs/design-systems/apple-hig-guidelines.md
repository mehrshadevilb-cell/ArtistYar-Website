# Apple Human Interface Guidelines (HIG) Adaptation for ArtistYar

This document summarizes key design principles from the `emilkowalski/skills` repository's `apple-design` module, adapted for the ArtistYar web project.

## Core Principles

1. **Clarity**: Text and icons are crisp, legible, and distinguishable. The interface is transparent but not cluttered.
2. **Deference**: UI elements defer to content. Animations and effects should enhance understanding of what’s happening without distracting from it.
3. **Depth**: Distinct visual layers and realistic motion convey hierarchy and facilitate understanding of navigation.

## Implementation Notes for Next.js/Tailwind

### Typography
- Use system fonts where possible (`font-sans`) but ensure fallbacks match Apple's SF Pro characteristics if custom fonts are used.
- Maintain strict vertical rhythm and line heights (e.g., `leading-relaxed` for body text).

### Motion & Interaction
- Prefer subtle, ease-in-out transitions.
- Avoid excessive parallax or heavy GSAP animations on core UI components unless necessary for artistic effect.
- Ensure all interactive states (hover, focus, active) have clear visual feedback consistent with iOS/macOS standards.

### Color & Contrast
- Adhere to WCAG AA/AAA contrast ratios.
- Use neutral grays for backgrounds and borders to let content colors pop.
- Dark mode support must mirror light mode fidelity, using true blacks (#000000) only if OLED optimization is prioritized, otherwise dark grays (#1C1C1E) for better depth perception.

### Components
- Buttons: Rounded corners (default `rounded-lg` or `rounded-xl`), distinct primary/secondary styles.
- Cards: Subtle shadows (`shadow-sm`, `shadow-md`) rather than harsh borders.
- Inputs: Clear labels, minimal border thickness, focus rings that respect brand color.

## Source Reference
- Original Repository: https://github.com/emilkowalski/skills/tree/main/skills/apple-design
- Type: Knowledge Base / Design System Documentation