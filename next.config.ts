import type { NextConfig } from "next";

/**
 * The browser only ever talks to this Next.js origin. `/api/*` is proxied to the
 * FastAPI backend, so the httpOnly session cookie is first-party (SameSite=Lax works,
 * no third-party-cookie or CORS issues).
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  // Optional separate build folder (lets a production build run beside `next dev` locally).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
