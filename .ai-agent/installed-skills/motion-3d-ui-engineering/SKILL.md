# Motion + 3D UI Engineering Skill

## Purpose
Use this skill for premium UI motion, scroll-linked effects, CSS 3D depth, WebGL/Three.js scenes, and interaction polish in ArtistYar.

## Stack
- Motion for React: component/layout/gesture animation.
- GSAP + ScrollTrigger: deterministic scroll timelines and complex sequencing.
- Lenis: smooth native-scroll interpolation and scroll synchronization.
- Three.js + @react-three/fiber + @react-three/drei: WebGL 3D only where it adds real product value.

## Rules
1. Preserve the existing ArtistYar visual language: dark/light modes, gold accents, restrained luxury.
2. Prefer transform/opacity/filter animations; avoid layout-thrashing properties.
3. Every scroll animation must respect prefers-reduced-motion.
4. Do not make the page depend on WebGL for core content or navigation.
5. Keep 3D scenes lazy/isolated and avoid loading Three.js on pages that do not use it.
6. Use GSAP context cleanup or React effect cleanup for every animation/ScrollTrigger.
7. Keep interactive targets keyboard accessible and preserve semantic DOM.
8. Validate mobile, touch, RTL, and light mode after motion changes.
9. Avoid excessive parallax: motion should clarify hierarchy, not compete with content.
10. Never introduce a new animation dependency when an existing stack component can solve it cleanly.

## Preferred patterns
- Reveal: Motion/IntersectionObserver.
- Scroll depth: GSAP ScrollTrigger + CSS perspective.
- Smooth scrolling: Lenis.
- WebGL: R3F + Drei, isolated behind a client component.
- Micro-interactions: Motion.
