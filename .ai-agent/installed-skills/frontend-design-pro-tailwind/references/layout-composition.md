# Layout and Composition

## Spacing rhythm

Use predictable spacing:

- Tight component internals: `gap-2`, `gap-3`, `p-3`, `p-4`
- Cards and panels: `gap-4`, `gap-6`, `p-5`, `p-6`
- Page sections: `py-10`, `py-12`, `py-16`, `py-20`
- Dashboard grid gaps: `gap-4`, `gap-6`

## Containers

```tsx
<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
```

Use narrower containers for forms and articles:

```tsx
<div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
```

## Grid patterns

Dashboard cards:

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
```

Main + aside:

```tsx
<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
```

Feature grid:

```tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
```

## Alignment

Everything should align to a visible grid. Avoid random widths and one-off margins.

Good:

```tsx
<div className="flex items-center justify-between gap-4">
```

Better for responsive:

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
```

## Density

Official apps usually need medium density:

- Do not make everything huge.
- Do not make tables too cramped.
- Give touch targets at least `h-10`.
- Use `h-9` only for compact secondary controls.
