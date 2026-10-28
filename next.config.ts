import type { NextConfig } from "next";

// Edge Function base URL (e.g. https://<ref>.supabase.co/functions/v1/api).
// Rewriting /edge-api/* to it server-side makes every Edge Function request
// same-origin from the browser's point of view, so its session cookie is set
// as first-party. That's required for iOS Safari/Chrome (WebKit blocks all
// third-party cookies by default, regardless of SameSite=None), which broke
// login on mobile when the frontend called the Edge Function's cross-site
// URL directly. See src/lib/api-client.ts for the matching client-side path.
const EDGE_API_URL = process.env.NEXT_PUBLIC_EDGE_API_URL ?? "";

// Uploads are R2-backed but served through the Edge Function
// (<SUPABASE_URL>/functions/v1/api/upload/<key>), so next/image has to be
// told that host is allowed. Derived from EDGE_API_URL rather than written
// out, because a hardcoded ref silently outlived a project migration once:
// the config still named the old project, and every generated image would
// have failed optimization with "hostname is not configured".
const edgeApiHost = EDGE_API_URL ? new URL(EDGE_API_URL).hostname : "";

// The public MCP endpoint: https://api.vixlens.com/mcp is the Edge Function's
// /mcp route (routes/mcp.ts in the API), so agents get a stable URL that
// doesn't name the Supabase project. The gateway's publishable key rides in
// the destination's query string (the gateway takes it there as well as in
// the `apikey` header), so MCP clients only send their own API key. Every
// other path on this host is a 404 — see API_HOST in src/proxy.ts.
const MCP_HOST = "api.vixlens.com";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const gatewayKey = SUPABASE_ANON_KEY ? `?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}` : "";
const onMcpHost = [{ type: "host" as const, value: MCP_HOST }];

// The MCP endpoint plus the OAuth server that lets claude.ai add it as a
// connector (routes/oauth.ts in the API). The .well-known documents are
// asked for at the host root, and some clients append the resource path
// (/mcp) to them, so both spellings go to the same document.
const MCP_HOST_REWRITES = [
  { source: "/mcp", has: onMcpHost, destination: `${EDGE_API_URL}/mcp${gatewayKey}` },
  ...["", "/mcp"].flatMap((suffix) => [
    {
      source: `/.well-known/oauth-protected-resource${suffix}`,
      has: onMcpHost,
      destination: `${EDGE_API_URL}/oauth/protected-resource${gatewayKey}`,
    },
    {
      source: `/.well-known/oauth-authorization-server${suffix}`,
      has: onMcpHost,
      destination: `${EDGE_API_URL}/oauth/authorization-server${gatewayKey}`,
    },
  ]),
  ...["register", "token", "revoke"].map((endpoint) => ({
    source: `/oauth/${endpoint}`,
    has: onMcpHost,
    destination: `${EDGE_API_URL}/oauth/${endpoint}${gatewayKey}`,
  })),
];

// Sent on every route. No script-src CSP: GTM, the Meta and TikTok pixels and
// whatever GTM injects would all need allow-listing, and a miss silently
// breaks ad attribution — frame-ancestors is the part that costs nothing.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  // allow-popups rather than same-origin: a third-party sign-in or checkout
  // window opened from here keeps working.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Tailwind's CSS is small; inlining it removes the render-blocking
    // stylesheet round trip from first paint on mobile.
    inlineCss: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      ...(edgeApiHost ? [{ protocol: "https" as const, hostname: edgeApiHost }] : []),
    ],
  },
  async rewrites() {
    if (!EDGE_API_URL) return [];
    return {
      // Before files, so no page can ever shadow the MCP endpoints.
      beforeFiles: MCP_HOST_REWRITES,
      afterFiles: [{ source: "/edge-api/:path*", destination: `${EDGE_API_URL}/:path*` }],
      fallback: [],
    };
  },
};

export default nextConfig;
