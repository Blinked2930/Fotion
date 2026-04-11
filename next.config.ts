import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  // This explicitly tells Next.js 16 to silence the Webpack/Turbopack clash error
  turbopack: {},
};

export default withPWA(nextConfig);