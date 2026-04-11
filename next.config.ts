import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Removed skipWaiting as it's now the default and throws a type error
});

const nextConfig: NextConfig = {
  // Your existing Next.js config options here (if any)
};

export default withPWA(nextConfig);