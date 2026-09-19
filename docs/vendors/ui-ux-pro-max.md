# Vendor Integration: ui-ux-pro-max

## Overview
This document outlines the integration strategy for the `ui-ux-pro-max-skill` repository (`https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`) into the `ArtistYar-Website` project.

## Decision: Vendor Import & Adaptation
Direct installation via `npm install` or adding as a git submodule was rejected due to:
- Unknown tech stack alignment (potential Architecture Breakage).
- Security risks (Supply Chain Attack via unverified `postinstall` scripts).
- Lack of standard npm registry publishing.

Instead, we use a **Vendor Import & Adaptation** approach.

## Implementation Phases

### Phase 1: Reconnaissance & Security
- [ ] Clone `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` locally outside the project workspace.
- [ ] Review `README.md`, `LICENSE`, and `package.json` (if exists).
- [ ] Identify if it contains usable JS/TS/CSS code or just AI prompts/templates.
- [ ] Scan dependencies for vulnerabilities.

### Phase 2: Extraction & Adaptation
- [ ] Create branch: `feature/integrate-ui-ux-pro-max`.
- [ ] Copy required components/utils to a temporary folder.
- [ ] Convert JavaScript to TypeScript (`.tsx`/`.ts`).
- [ ] Replace any SASS/Less/Raw CSS with Tailwind CSS utility classes.
- [ ] Ensure compatibility with Next.js 15 App Router and React 19.
- [ ] Resolve naming conflicts with existing `src/components/ui/`.

### Phase 3: Integration
- [ ] Move adapted files to `src/components/vendor/ui-ux-pro-max/`.
- [ ] Update `src/components/vendor/ui-ux-pro-max/index.ts` to export public APIs.
- [ ] Document usage examples.

### Phase 4: Testing & Review
- [ ] Run `npm run typecheck` (`tsc --noEmit`).
- [ ] Run `npm run lint` (`next lint`).
- [ ] Perform visual regression testing.
- [ ] Submit PR for Lead Agent / Owner review.

## Tech Stack Context (ArtistYar-Website)
- Framework: Next.js 15.5.25
- UI Library: React 19.1.1
- Styling: Tailwind CSS 3.4.17
- Language: TypeScript 5.9.2
- Icons: lucide-react
- Animation: gsap, lenis

## Security Warning
⚠️ Never execute `npm install` directly from the unverified external repository URL. Never run unreviewed build scripts from the vendor source.
