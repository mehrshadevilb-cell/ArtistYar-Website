# Render performance (ArtistYar)

## Shipped on main

- `next.config.ts`: `output: "standalone"`, long-lived cache for static + hero/covers, image `minimumCacheTTL` 30d, `optimizePackageImports` for lucide/gsap/lenis
- `render.yaml`: standalone start (`node .next/standalone/server.js`), copies `public` + `.next/static` into standalone, `healthCheckPath: /`, Node 22, `NODE_OPTIONS=--max-old-space-size=1536`
- Removed **3.8MB** `public/artistyar-studio-hero.png` from the repo (huge LCP cost)
- Homepage `Image` points to `/artistyar-studio-hero.webp`

## One manual step (required for hero photo)

Binary WebP could not be committed via the API agent. Optimized file is in the project artifacts:

```bash
# from machine with the artifacts folder / or download the WebP
cp path/to/artifacts/artistyar-studio-hero.webp public/artistyar-studio-hero.webp
# preferred full quality ~80KB:
# cp path/to/artifacts/artistyar-studio-hero-full.webp public/artistyar-studio-hero.webp
git add public/artistyar-studio-hero.webp
git commit -m "perf: add optimized 80KB hero WebP"
git push origin main
```

After push, Render redeploy will serve the small hero (was 3.8MB PNG).

## Optional local check

```bash
npm run build
node .next/standalone/server.js
```
