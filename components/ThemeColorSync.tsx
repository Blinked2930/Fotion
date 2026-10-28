"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Reactively updates <meta name="theme-color"> to match the active theme.
 *
 * Why this exists:
 *   The status bar / address bar color on mobile is controlled by the
 *   `theme-color` meta tag. Next's `viewport.themeColor` API writes a static
 *   value at render time, which means it cannot react to a runtime dark-mode
 *   toggle. This component keeps the meta tag in sync with `next-themes` so
 *   the bar flips cream -> near-black (and back) as soon as the user toggles
 *   the theme.
 *
 * Known limitations (browser-level, not fixable from our side):
 *   - iOS 26 Safari tabs: the OS stopped honoring `theme-color` at all in
 *     tabs. Installed PWAs still respect it, so this works there.
 *   - Recent Chrome PWA releases: a regression causes installed PWAs to
 *     ignore dynamic `theme-color` updates. Chrome tabs work fine.
 *   - Everywhere else (Android Chrome tabs, desktop Chrome/Edge, Samsung
 *     Internet, Firefox), this update is instant and reliable.
 */

const LIGHT = "#f6f2ea"; // Sanctuary cream
const DARK = "#0c0c12";  // Sanctuary near-black

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Find or create the theme-color meta tag.
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }

    const apply = () => {
      const isDark = document.documentElement.classList.contains("dark");
      meta!.setAttribute("content", isDark ? DARK : LIGHT);
    };

    // 1. Apply immediately using the current <html class> — this covers both
    //    the initial mount and any resolvedTheme change that has already
    //    been committed to the DOM.
    apply();

    // 2. Also observe <html class> mutations. This catches the edge case
    //    where a non-next-themes code path flips the class (e.g. a manual
    //    `document.documentElement.classList.toggle("dark")`) without going
    //    through resolvedTheme. Cheap — mutations only fire on theme change.
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      // On unmount, restore the manifest's default so a stale dark value
      // doesn't persist through a full page reload (e.g. HMR, back/forward
      // cache) before this effect remounts.
      meta!.setAttribute("content", LIGHT);
    };
  }, [resolvedTheme]);

  return null;
}