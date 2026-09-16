# Official and Professional UI Style

Professional UI is structured, calm, legible, and consistent. It should communicate trust and clarity.

## Visual tone

Default to:

- Clean and restrained
- Official and trustworthy
- Minimal but not empty
- High-contrast and readable
- Structured by spacing, borders, and hierarchy

Avoid:

- Overuse of gradients
- Neon colors
- Excessive glass effects
- Heavy shadows
- Overly playful illustrations
- Decorative noise

## Professional composition

Use a clear visual hierarchy:

1. Page title and concise description
2. Primary action
3. Key metrics or main content
4. Secondary content
5. Support links or metadata

Use consistent widths:

- Marketing pages: `max-w-7xl`
- Reading pages: `max-w-3xl` to `max-w-4xl`
- Forms: `max-w-xl` to `max-w-2xl`
- Dashboards: `max-w-7xl` or full width with padding

## Formal surfaces

Cards:

```tsx
<div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
```

Sections:

```tsx
<section className="py-12 sm:py-16 lg:py-20">
```

Buttons:

```tsx
<button className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
```

## Hierarchy rules

- One primary CTA per major area
- Secondary actions use outline or ghost styles
- Destructive actions must not look like primary actions
- Muted text is for supporting text, never essential labels
- Do not rely on color alone to show status
