// Every route is served by the Supabase Edge Function — generation
// submission, the SSE progress stream, and upload all moved there (backed
// by a DB-polled job queue instead of the old in-process Next.js runner).
//
// Requests go through the "/edge-api" same-origin proxy (see next.config.ts
// rewrites) rather than the Edge Function's absolute cross-site URL. This
// makes its session cookie first-party, which iOS Safari/Chrome (WebKit)
// requires — it blocks all third-party cookies by default, so calling the
// cross-site URL directly silently dropped the session cookie on iOS and
// immediately bounced users back to /login.
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function apiUrl(path: string) {
  // "/edge-api" is rewritten (see next.config.ts) to the Edge Function's
  // "/api" segment, so strip the leading "/api" from Next.js-style paths to
  // avoid doubling it.
  const edgePath = path.startsWith("/api/") ? path.slice(4) : path;
  return `/edge-api${edgePath}`;
}

export function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (SUPABASE_ANON_KEY) {
    headers.set("apikey", SUPABASE_ANON_KEY);
  }
  return fetch(apiUrl(path), { ...init, headers, credentials: "include" });
}
