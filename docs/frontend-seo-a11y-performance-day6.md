# ArtistYar Day 6 — SEO, Accessibility, Frontend Quality & Performance

## Baseline (STATICALLY VERIFIED)

- Day 5 gate: `telegram-plugin-sync.ts` ≈ 40 528 bytes on main.
- Public routes inventoried from `src/app/**/page.tsx`.
- SEO tooling: `src/app/robots.ts`, `src/app/sitemap.ts`, `scripts/verify-seo.mjs` (live-server).
- Header navigation already uses landmarks, `aria-expanded`, focus-visible styles.
- Contact/login/register forms use labels; contact has `role="alert"` on errors.
- `prefers-reduced-motion` handled in `globals.css` and route ambient CSS.

## Route inventory (selected)

| Route | Public | Indexable | Notes |
|-------|--------|-----------|-------|
| `/` | Yes | Yes | Home metadata + Organization/WebSite JSON-LD |
| `/courses` | Yes | Yes | Catalog; **no `?q=` search** |
| `/courses/[slug]` | Yes | Yes | Dynamic via sitemap |
| `/ai`, `/ai-music`, `/assistant` | Yes | Yes | Tools |
| `/login`, `/register`, `/my-artistyar` | Yes | **No** | robots + metadata noindex |
| `/practice`, `/panel`, `/admin/*` | Auth | **No** | Disallow + noindex |
| `/api/*` | API | **No** | Disallow |

## SearchAction (STATICALLY VERIFIED → FIXED)

- **Before:** WebSite `potentialAction` SearchAction targeted `/courses?q={search_term_string}`.
- **Actual:** `CoursesPage` does not read `searchParams` / `q`.
- **Fix:** Removed SearchAction from `src/app/layout.tsx`. Did not invent search UI.

## Robots / Sitemap (STATICALLY VERIFIED)

- Robots disallows admin/api/login/register/practice/my-artistyar/panel.
- Sitemap lists public marketing routes + dynamic courses/plugins.
- Default host: `NEXT_PUBLIC_SITE_URL` or `https://artistyaar.ir`.

## Accessibility (STATICALLY VERIFIED)

- SiteHeader: `nav` landmarks, aria-current, menu aria-expanded, mobile aria-controls.
- Buttons/links use focus-visible rings in design tokens.
- Reduced motion respected for ambient/card animations.
- **NOT VERIFIED:** full keyboard audit in browser, screen-reader, WCAG conformance.
- **NOT VERIFIED:** contrast ratios via tooling.

## Performance (STATIC / ENVIRONMENT BLOCKED)

- Many marketing pages are server components; header is client (auth/menu).
- `next/image` used on course covers with sizes.
- **NOT VERIFIED / ENVIRONMENT BLOCKED:** Lighthouse LCP/CLS/INP, bundle analysis, live image transfer sizes.

## Tests

- `npm run test:seo` → static SEO contracts.
- Existing `seo:verify` still requires a live base URL.

## Limitations

- No browser/Lighthouse in this environment.
- Live production crawl not re-run.
- Pre-existing Telegram caption test failure unchanged.
