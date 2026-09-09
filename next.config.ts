import type { NextConfig } from "next";

// Edge Function base URL (e.g. https://<ref>.supabase.co/functions/v1/api).
// Rewriting /edge-api/* to it server-side makes every Edge Function request
// same-origin from the browser's point of view, so its session cookie is set
// as first-party. That's required for iOS Safari/Chrome (WebKit blocks all
// third-party cookies by default, regardless of SameSite=None), which broke
// login on mobile when the frontend called the Edge Function's cross-site
// URL directly. See src/lib/api-client.ts for the matching client-side path.
const EDGE_API_URL = process.env.NEXT_PUBLIC_EDGE_API_URL ?? "";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "pdbhvyklkrasersozbqe.supabase.co" }, // R2-backed uploads, served via the Edge Function
    ],
  },
  async rewrites() {
    if (!EDGE_API_URL) return [];
    return [{ source: "/edge-api/:path*", destination: `${EDGE_API_URL}/:path*` }];
  },
};

export default nextConfig;
