# Component Patterns

## Buttons

Buttons need consistent height, radius, focus, disabled state, and variants.

Variants:

- Primary: main action
- Secondary: neutral action
- Outline: secondary visible action
- Ghost: low-emphasis action
- Destructive: destructive action

Never create a new button style inline unless the component system is being extended.

## Inputs

Every input needs:

- Visible label
- Helpful description if needed
- Error message area
- Focus state
- Disabled state
- `text-start`

Input with icon:

```tsx
<div className="relative">
  <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
  <input className="h-10 w-full rounded-lg border border-border bg-surface ps-10 pe-3 text-start text-sm" />
</div>
```

## Cards

Card structure:

```tsx
<Card>
  <CardHeader>
    <CardTitle />
    <CardDescription />
  </CardHeader>
  <CardContent />
</Card>
```

## Tables

Tables need:

- Sticky or clear header for large datasets
- `text-start`
- Row hover state
- Empty state
- Loading skeleton
- Pagination or virtualization for large data

## Navigation

Active state should use more than color:

```tsx
className="bg-muted text-foreground font-medium"
```

Use logical spacing and icon wrappers.
