# ArtistYar Website Audit Checklist v1

This document defines the acceptance criteria for the UI/UX audit phase.

## 1. Performance & Visual Fidelity
- [ ] **LCP (Largest Contentful Paint):** Must be under 2.5 seconds on mobile throttling.
- [ ] **Image Optimization:** All hero/gallery images must use `next/image` or equivalent lazy-loading strategy.
- [ ] **CLS (Cumulative Layout Shift):** Must be below 0.1. No unexpected layout shifts during loading.

## 2. Accessibility (WCAG AA Compliance)
- [ ] **Color Contrast:** Text-to-background contrast ratio must be at least 4.5:1 for normal text and 3:1 for large text.
- [ ] **Alt Attributes:** Every meaningful image must have descriptive `alt` text. Decorative images should have empty `alt=""`.
- [ ] **Keyboard Navigation:** All interactive elements (buttons, links, inputs) must be reachable and operable via keyboard (Tab, Enter, Space).
- [ ] **Focus Indicators:** Visible focus rings must exist for all interactive elements (`focus-visible`).

## 3. Responsiveness & Consistency
- [ ] **Mobile Breakpoints:** No horizontal scrolling on viewports >= 320px wide.
- [ ] **Touch Targets:** Interactive elements must have a minimum touch target size of 44x44 pixels.
- [ ] **Design Tokens:** Colors, spacing, and typography must reference centralized variables/tokens, not hardcoded values.