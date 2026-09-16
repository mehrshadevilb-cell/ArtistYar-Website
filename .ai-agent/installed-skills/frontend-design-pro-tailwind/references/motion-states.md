# Motion and UI States

## Motion principles

Use motion to clarify, not decorate.

Default transitions:

```tsx
transition-colors
transition-opacity
transition-transform
```

Durations:

- Small hover: `duration-150`
- Popover/dialog: `duration-200`
- Page-level transitions: usually avoid unless necessary

## Loading states

Prefer skeletons when layout is known:

```tsx
<div className="h-4 w-32 animate-pulse rounded bg-muted" />
```

Use spinners only for short unknown actions.

## Empty states

Empty states need:

- Icon or simple visual
- Clear title
- Helpful description
- Primary action if appropriate

## Error states

Errors need:

- Human message
- Retry action if recoverable
- Do not expose raw stack traces
