# Accessibility

Accessibility is required for professional UI.

## Focus states

Every interactive element:

```tsx
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

## Semantic elements

Use real elements:

- Button action: `<button>`
- Navigation: `<a>` or framework Link
- Input label: `<label htmlFor>`
- Lists: `<ul>` / `<ol>` when list semantics matter

## Icon buttons

Icon-only buttons need a label:

```tsx
<button aria-label="Open menu">
  <Menu aria-hidden="true" />
</button>
```

## Forms

- Labels must be visible.
- Errors must be linked with `aria-describedby` when possible.
- Required fields should be communicated visibly and semantically.
- Placeholder is not a replacement for label.

## Contrast

- Body text should pass 4.5:1.
- Muted text must still be readable.
- Disabled text can be lower contrast, but not confused with normal text.
