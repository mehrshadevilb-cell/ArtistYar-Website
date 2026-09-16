# Final UI Audit

Run this before final code.

## Visual quality

- Layout aligns to a consistent grid.
- Spacing is intentional and consistent.
- Typography hierarchy is clear.
- Primary action is obvious.
- Secondary actions are lower emphasis.
- Cards and sections use consistent borders/radius/shadows.
- No random visual effects.

## Tailwind quality

- Uses semantic tokens.
- Avoids repeated arbitrary values.
- Uses Tailwind latest/v4 CSS-first assumptions.
- No unnecessary custom CSS.

## RTL/LTR

- Uses logical utilities.
- No raw directional chevrons for navigation.
- `dir` is dynamic for multilingual projects.
- Icon spacing uses `ms`/`me`.
- Dropdowns and sidebars use `start`/`end`.

## Accessibility

- Focus states exist.
- Icon buttons have labels.
- Decorative icons use `aria-hidden`.
- Form fields have labels and error states.
- Text contrast is adequate.

## Responsive

- Works on mobile.
- Touch targets are large enough.
- Desktop layout does not break small screens.
- No excessive breakpoint stacking.

## State coverage

- Loading state exists.
- Empty state exists.
- Error state exists.
- Disabled state exists for unavailable actions.
