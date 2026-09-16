# RTL/LTR Multilingual UI

Tailwind logical utilities adapt layout direction. SVG icon shapes do not.

## Root direction

For multilingual apps, direction comes from locale:

```tsx
const dir = locale === "ar" ? "rtl" : "ltr"

<html lang={locale} dir={dir}>
```

## Logical utility rules

Use:

- `ms-*` / `me-*` for inline margins
- `ps-*` / `pe-*` for inline padding
- `start-*` / `end-*` for positioning
- `text-start` / `text-end` for text alignment
- `border-s` / `border-e` for side borders
- `rounded-s-*` / `rounded-e-*` for side radius
- `gap-*` instead of `space-x-*` when possible

Avoid:

- `ml-*`, `mr-*`
- `pl-*`, `pr-*`
- `left-*`, `right-*`
- `text-left`, `text-right`
- `border-l`, `border-r`
- `rounded-l-*`, `rounded-r-*`
- `space-x-*` without `rtl:space-x-reverse`

## Directional icons

Raw directional icons are banned for navigation:

- `ChevronRight`
- `ChevronLeft`
- `ArrowRight`
- `ArrowLeft`
- `MoveRight`
- `MoveLeft`

Use semantic wrappers:

- `ForwardChevron` for next/details/open/continue/go-to/breadcrumb/submenu
- `BackChevron` for previous/back/return
- `ChevronDown` for dropdown/select/collapse-down

Example:

```tsx
<Button>
  <span>Details</span>
  <ForwardChevron className="ms-2" />
</Button>
```

## Arabic UI quality

Arabic interfaces need:

- `dir="rtl"`
- Arabic-capable font
- `text-start` rather than forced right alignment
- Proper icon mirroring
- Correct number and date formatting
- Avoid cramped line-height; use `leading-7` or `leading-8` for Arabic paragraphs

## Final RTL grep

Before final code, search mentally for:

```txt
ChevronRight ChevronLeft ArrowRight ArrowLeft MoveRight MoveLeft
ml- mr- pl- pr- left- right- text-left text-right border-l border-r rounded-l rounded-r
```

Fix them unless there is a clear physical-direction reason.
