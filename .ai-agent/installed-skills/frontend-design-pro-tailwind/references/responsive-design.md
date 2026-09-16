# Responsive Design

## Mobile-first

Start with single-column mobile layout. Add larger layouts at `md`/`lg`.

Good:

```tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
```

## Touch targets

Use at least:

- `h-10` for buttons and inputs
- `size-10` for icon buttons
- Adequate gaps between controls

## Navigation

Desktop navigation should not be forced onto mobile. Use:

- Mobile sheet/drawer
- Collapsible nav
- Bottom nav only when product pattern needs it

## Avoid breakpoint chaos

Avoid:

```tsx
className="p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 2xl:p-8"
```

Prefer fewer intentional changes:

```tsx
className="p-4 sm:p-6 lg:p-8"
```
