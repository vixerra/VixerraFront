// Carries the `?next=` errand across the email round trip.
//
// Signup used to send people to `next` (a preset studio, most often) the
// moment the account was created. Now the account is only usable after the
// emailed link is clicked, and that link's destination is fixed by the
// backend (/verify-email — the redirect must match Supabase's allow-list
// exactly, so it can't carry a per-signup query string). The only thing
// that survives from the signup tab to the click is this browser, so the
// errand is parked in storage and picked up by /verify-email.
//
// The Google handoff has the same problem (Supabase's redirectTo must match
// the allow-list too), so GoogleAuthButton parks the errand here as well and
// /auth/callback takes it.
//
// localStorage with an expiry, not sessionStorage. sessionStorage is per
// tab, and a link clicked in a mail client opens a new one — so it lost the
// errand on exactly the path it exists for, and someone who had just
// clicked "Subscribe to Creator" landed on the dashboard instead of
// checkout. The expiry keeps the old guarantee: a stale errand can't ambush
// a different signup days later on the same machine. A click from another
// device simply lands on the dashboard — an acceptable miss.
const KEY = "vixlens:post-verify-next";
const TTL_MS = 24 * 60 * 60 * 1000;

export function stashPostVerifyNext(next: string | null) {
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify({ next, at: Date.now() }));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data) — the
    // errand is a nicety, never a requirement.
  }
}

export function takePostVerifyNext(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const { next, at } = JSON.parse(raw) as { next?: unknown; at?: unknown };
    if (typeof next !== "string" || typeof at !== "number" || Date.now() - at > TTL_MS) {
      return null;
    }
    // Only same-origin paths: a stored value is still user-influenced input
    // (it came from a URL), so never let it become an open redirect.
    // Browsers read "/\" like "//", so it's refused too.
    return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
  } catch {
    return null;
  }
}
