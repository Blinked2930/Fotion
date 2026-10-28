"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Reactively updates <meta name="theme-color"> to match the active theme.
 *
 * This component is now the SINGLE owner of the theme-color meta tag.
 * `viewport.themeColor` in layout.tsx was removed on purpose: it wrote
 * static tags at build time, and mobile browsers honor the FIRST matching
 * tag in <head>. That meant the static cream value always won, and the
 * status bar appeared "permanently white" in dark mode.
 *
 * By owning the tag exclusively here, we can guarantee that:
 *   - Exactly one theme-color tag exists.
 *   - Its content reflects the current resolved theme at all times.
 *   - The tag is updated instantly (same tick) whenever the theme changes.
 *
 * Known platform limitations (not fixable from our side):
 *   - iOS 26 Safari tabs: ignores theme-color entirely.
 *   - Recent Chrome PWA builds: regressed, ignore dynamic updates.
 *   - Everywhere else: instant.
 */

const LIGHT = "#f6f2ea"; // Sanctuary cream
const DARK = "#0c0c12";  // Sanctuary near-black

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Find every existing theme-color meta tag. If more than one exists
    // (which can happen if the browser cached an old build, or if a
    // previous layout.tsx static tag is still in the DOM after HMR), we
    // collapse them down to one.
    const existing = Array.from(
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    );

    let meta: HTMLMetaElement;
    if (existing.length === 0) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    } else {
      meta = existing[0];
      // Remove any duplicates so the browser has only one tag to read.
      for (let i = 1; i < existing.length; i++) {
        existing[i].remove();
      }
    }

    const apply = () => {
      const isDark = document.documentElement.classList.contains("dark");
      meta.setAttribute("content", isDark ? DARK : LIGHT);
    };

    apply();

    // Observe <html class="dark"> toggles. This is the single source of
    // truth for our theme, since next-themes uses class="dark" on <html>
    // (attribute="class" in ThemeProvider). We don't rely solely on
    // `resolvedTheme` because that can lag behind the DOM on first paint.
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [resolvedTheme]);

  return null;
}