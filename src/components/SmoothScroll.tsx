"use client";

/**
 * Keep browser-native scrolling.
 *
 * Deliberately no Lenis interception here: native wheel/touch scrolling is
 * the most responsive baseline for desktop browsers and Telegram WebViews.
 * GSAP ScrollTrigger can observe the native scroll position without taking
 * control of the user's wheel.
 */
export function SmoothScroll() {
  return null;
}
