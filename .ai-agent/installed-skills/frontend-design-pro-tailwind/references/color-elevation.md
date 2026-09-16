# Color, Elevation, Borders, and Shadows

## Color rules

Use semantic colors:

- `background`
- `foreground`
- `surface`
- `muted`
- `muted-foreground`
- `border`
- `primary`
- `primary-foreground`
- `success`
- `warning`
- `destructive`
- `ring`

## Official palette behavior

- Primary color should be calm and stable.
- Use primary for actions and selected states.
- Use muted backgrounds for grouping.
- Use destructive color only for destructive actions.
- Avoid using five saturated colors on one screen.

## Elevation

Prefer borders over large shadows.

Good:

```tsx
<div className="rounded-xl border border-border bg-surface shadow-sm">
```

For dropdowns/modals:

```tsx
<div className="rounded-xl border border-border bg-surface shadow-lg">
```

Avoid:

```tsx
shadow-2xl shadow-black/40
```

unless it is a modal overlay or special effect.

## Status badges

Use subtle backgrounds and strong labels:

```tsx
<span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
```
