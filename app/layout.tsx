import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Fotion",
  description: "A lightning-fast, local-first PWA for task management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // "black-translucent" lets the html/body background show through the
    // iOS status bar inset instead of forcing an opaque black/white band.
    // Combined with the themeColor below, the status bar now matches the
    // page (cream in light, near-black in dark) so the Sanctuary's mottled
    // glow is not cut off at the top edge.
    statusBarStyle: "black-translucent",
    title: "Fotion",
  },
};

// The themeColor here is what mobile browsers paint the status-bar area
// with (in tabs, and as the fallback when the installed PWA's manifest
// theme_color is ignored). We use the Sanctuary's palette because:
//   1. Inside the Sanctuary, it makes the glow blend seamlessly into the
//      status bar — no visible seam.
//   2. Inside the task UI, cream/near-black is close enough to the task
//      UI's white/near-black background that the seam is invisible.
//
// NOTE: themeColor is not reactive — you cannot change it per-section at
// runtime. That's a browser limitation. If you ever want a truly reactive
// status bar color, that would need a native wrapper (Capacitor/Tauri) or
// the CSS env() approach, which is not universally supported.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c12" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}