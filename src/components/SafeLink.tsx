"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

type SafeLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  /** Prefer full page load (more reliable in Telegram WebView). */
  hard?: boolean;
} & Omit<ComponentProps<"a">, "href" | "className" | "children">;

function isTelegramWebView(): boolean {
  if (typeof window === "undefined") return false;
  if (window.Telegram?.WebApp) return true;
  return /Telegram/i.test(navigator.userAgent || "");
}

/**
 * Navigation that works in normal browsers AND Telegram Mini App WebViews.
 * Soft client routing often fails silently in TG WebView; we force location.assign there.
 */
export function SafeLink({
  href,
  className,
  children,
  ariaLabel,
  hard = false,
  onClick,
  ...rest
}: SafeLinkProps) {
  const isHash = href.startsWith("#");
  const isExternal = /^https?:\/\//i.test(href) || href.startsWith("mailto:");

  function navigateHard(target: string) {
    try {
      window.location.assign(target);
    } catch {
      window.location.href = target;
    }
  }

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (isExternal || isHash) return;

    const forceHard = hard || isTelegramWebView();
    if (forceHard) {
      e.preventDefault();
      navigateHard(href);
    }
  }

  if (isHash || isExternal) {
    return (
      <a href={href} className={className} aria-label={ariaLabel} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  if (hard) {
    return (
      <a href={href} className={className} aria-label={ariaLabel} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
