# Typography

## Hierarchy

Use a clear scale:

- Page title: `text-2xl font-semibold tracking-tight sm:text-3xl`
- Hero title: `text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl`
- Section title: `text-2xl font-semibold tracking-tight sm:text-3xl`
- Card title: `text-base font-semibold`
- Body: `text-sm leading-6`
- Supporting text: `text-sm text-muted-foreground`
- Tiny metadata: `text-xs text-muted-foreground`

## Arabic text

Arabic often needs more line-height:

```tsx
<p className="text-sm leading-7 text-muted-foreground">
```

Use Arabic-capable fonts:

- IBM Plex Sans Arabic
- Noto Kufi Arabic
- Noto Sans Arabic
- Tajawal
- Cairo

Do not force `text-right`; use `text-start`.

## Formal copy layout

- Keep headings concise.
- Use descriptions under headings, not long paragraphs inside buttons/cards.
- Avoid all-caps for formal UI.
- Numbers and badges should align consistently.
