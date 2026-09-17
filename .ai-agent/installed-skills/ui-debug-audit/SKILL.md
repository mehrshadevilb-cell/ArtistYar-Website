# UI Debug + Visual QA Skill

## Purpose
Systematically find and fix visual, interaction, responsive, accessibility, and motion regressions.

## Audit order
1. TypeScript/build errors.
2. Runtime errors and hydration mismatches.
3. Console warnings.
4. Broken routes, links, forms, loading/error states.
5. Responsive layouts at mobile/tablet/desktop.
6. RTL alignment and overflow.
7. Light/dark theme contrast.
8. Reduced-motion behavior.
9. Keyboard focus and semantic accessibility.
10. Scroll performance and unnecessary re-renders.

## Motion-specific checks
- No animation continues after unmount.
- ScrollTrigger instances are reverted.
- requestAnimationFrame loops are cancelled.
- Reduced-motion users receive an equivalent static presentation.
- Sticky/fixed elements do not jitter under smooth scrolling.
- 3D transforms do not create horizontal overflow.

## Performance checks
- Prefer compositor-friendly transforms.
- Avoid scroll handlers that force synchronous layout.
- Batch DOM reads/writes.
- Lazy-load WebGL-heavy components.
- Keep hero and above-the-fold JS small.

## Release gate
A UI change is not complete until the affected route is build-safe and the motion path has explicit mobile, reduced-motion, and RTL behavior.
