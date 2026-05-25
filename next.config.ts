import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
    exclude: [
      // Exclude Clerk endpoints and API routes from Service Worker caching
      /^\/__clerk\/.*$/i,
      /^\/api\/.*$/i,
    ],
  },
});

const nextConfig: NextConfig = {
  // This explicitly tells Next.js 16 to silence the Webpack/Turbopack clash error
  turbopack: {},
};

export default withPWA(nextConfig);