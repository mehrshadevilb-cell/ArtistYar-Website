# Tailwind CSS Latest/v4 System

Use Tailwind CSS latest/v4 conventions by default.

## Setup

Prefer:

```css
@import "tailwindcss";
```

Use CSS-first configuration with `@theme` for design tokens. Avoid creating or modifying `tailwind.config.js` unless the project already uses it or a specific integration requires it.

## Token rules

Define semantic tokens first:

```css
@theme {
  --color-background: oklch(0.99 0.003 250);
  --color-foreground: oklch(0.19 0.018 260);
  --color-surface: oklch(1 0 0);
  --color-muted: oklch(0.96 0.006 250);
  --color-muted-foreground: oklch(0.48 0.025 260);
  --color-border: oklch(0.90 0.010 250);
  --color-primary: oklch(0.48 0.15 255);
  --color-primary-foreground: oklch(0.99 0.003 250);
  --color-ring: oklch(0.60 0.14 255);
}
```

Then consume tokens:

```tsx
<div className="bg-background text-foreground">
  <div className="rounded-xl border border-border bg-surface shadow-sm" />
</div>
```

## Utility priority

1. Semantic tokens: `bg-surface`, `text-muted-foreground`
2. Theme utilities: `bg-primary`, `border-border`
3. Raw Tailwind palette classes: only for quick prototypes
4. Arbitrary values: only for true one-offs

If a value appears twice, promote it to a token.

## Tailwind v4 features to prefer

- `@theme`
- CSS variables
- OKLCH colors
- Dynamic utility values
- Container queries when component layout depends on parent width
- `@starting-style` for enter transitions when useful
- Modern variants like `not-*`, `has-*`, `data-*`, and `aria-*` when semantic

## Avoid

- Large custom CSS files full of one-off classes
- Random arbitrary values for every component
- Tailwind v3-style config-first thinking in a v4 project
- Rebuilding shadcn-like primitives repeatedly instead of maintaining one component system
