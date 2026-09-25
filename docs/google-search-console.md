# Google Search Console — ArtistYar production workflow

## Production target

ArtistYar has one canonical public origin:

`https://artistyaar.ir`

Keep `NEXT_PUBLIC_SITE_URL` aligned with that value in production. The application generates:

- canonical URLs from `NEXT_PUBLIC_SITE_URL`
- `https://artistyaar.ir/sitemap.xml`
- `https://artistyaar.ir/robots.txt`
- Open Graph/Twitter URLs
- Organization/WebSite structured-data URLs

The CI SEO smoke test hard-fails if sitemap/robots/canonical URLs drift from the production host.

## 1. Create the Search Console property

For full-domain coverage, create a **Domain property** for `artistyaar.ir` and verify it through DNS. Google documents Domain properties as covering the domain's protocols and subdomains.

As an additional URL-prefix property, use:

`https://artistyaar.ir/`

The URL-prefix property can use HTML-tag verification.

## 2. Configure HTML-tag verification (optional)

For URL-prefix verification, copy the exact token Google provides and add it to the production environment as:

`GOOGLE_SITE_VERIFICATION=<token>`

Do **not** put the token in source control and do not use `NEXT_PUBLIC_` for it. The server reads the environment variable and Next.js emits Google's required `google-site-verification` meta tag in the document head.

After deployment, verify the homepage source contains the tag, then click **Verify** in Search Console.

## 3. Submit the sitemap

The production sitemap is:

`https://artistyaar.ir/sitemap.xml`

Submit that URL once in Search Console under **Sitemaps**. The site also publishes the same sitemap URL in `robots.txt`, so crawlers can discover it without depending on a deployment-time API call.

After submission, monitor the sitemap's last download time, warnings, and errors in Search Console.

## 4. Optional API automation

Do not add a second deployment pipeline just to submit the sitemap. Search Console's API requires OAuth authorization and appropriate property permissions. If automated submission is later required, use a dedicated server-side credential stored in the deployment secret store and call Google's Sitemaps API after a successful production deploy—not before it.

Required API scope:

`https://www.googleapis.com/auth/webmasters`

Never expose Google OAuth tokens, service-account private keys, or client secrets to the browser.

## 5. CI protection

The existing `.github/workflows/production-verify.yml` now runs `npm run seo:verify` after the production build. It starts the same standalone Next.js server used by Render and verifies:

- production HTTPS host consistency
- HTTP 200 for `robots.txt`
- robots sitemap declaration
- private API/admin crawl blocks
- valid sitemap XML
- sitemap URLs use only `https://artistyaar.ir`
- no query/hash URLs in the sitemap
- HTTP 200 for key public routes
- canonical link presence and exact canonical URL
- absence of accidental `noindex` on key public routes

This is intentionally part of the existing verification workflow rather than a duplicate GitHub Actions pipeline.

## 6. Ongoing Search Console checks

After the property is verified:

1. Confirm the sitemap is processed without errors.
2. Use URL Inspection on the homepage and important public landing pages.
3. Review Page indexing for excluded pages and fix unintended exclusions.
4. Monitor Core Web Vitals, HTTPS, and structured-data enhancement reports.
5. When a public route is intentionally removed, update redirects/canonicals/sitemap together.

Search Console reports can lag behind deployments; an indexing report is not an immediate deployment-health signal.

## Environment checklist

Production:

- `NEXT_PUBLIC_SITE_URL=https://artistyaar.ir`
- `GOOGLE_SITE_VERIFICATION=<Search Console HTML-tag token>` (only if using URL-prefix HTML-tag verification)

No Google credential is required for the normal sitemap/robots workflow.
