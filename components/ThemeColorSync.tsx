"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Reactively updates <meta name="theme-color"> to match the active theme.
 *
 * Note: this meta tag is honored by Chrome (tabs and most PWAs), Edge,
 * Firefox, and iOS PWAs. It is NOT honored by:
 *   - iOS 26 Safari tabs (Apple removed theme-color support there).
 *   - Recent Chrome Android PWA builds (regression — ignores dynamic
 *     updates and can even render black icons on a black bar).
 *
 * In those two environments, the OS samples the page's top-of-screen
 * background-color instead. That's why globals.css paints a solid base
 * color on `html body::before` — it's the fallback paint the OS samples
 * when it ignores the meta tag.
 *
 * This component updates the meta tag itself; the CSS gradient strip is a
 * separate mechanism that keeps the fallback paint the right color.
 */

const LIGHT = "#f6f2ea"; // Sanctuary cream
const DARK = "#0c0c12";  // Sanctuary near-black

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof document === "undefined") return;

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
      for (let i = 1; i < existing.length; i++) {
        existing[i].remove();
      }
    }

    const apply = () => {
      const isDark = document.documentElement.classList.contains("dark");
      meta.setAttribute("content", isDark ? DARK : LIGHT);
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [resolvedTheme]);

  return null;
}