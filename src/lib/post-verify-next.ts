// Carries the `?next=` errand across the email round trip.
//
// Signup used to send people to `next` (a preset studio, most often) the
// moment the account was created. Now the account is only usable after the
// emailed link is clicked, and that link's destination is fixed by the
// backend (/verify-email — the redirect must match Supabase's allow-list
// exactly, so it can't carry a per-signup query string). The only thing
// that survives from the signup tab to the click is this browser, so the
// errand is parked in sessionStorage and picked up by /verify-email.
//
// sessionStorage, not localStorage: it dies with the tab, so a stale errand
// can't ambush a different signup weeks later on the same machine. A click
// from another device simply lands on the dashboard — an acceptable miss.
const KEY = "vixlens:post-verify-next";

export function stashPostVerifyNext(next: string | null) {
  try {
    if (next) sessionStorage.setItem(KEY, next);
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data) — the
    // errand is a nicety, never a requirement.
  }
}

export function takePostVerifyNext(): string | null {
  try {
    const next = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    // Only same-origin paths: a stored value is still user-influenced input
    // (it came from a URL), so never let it become an open redirect.
    return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  } catch {
    return null;
  }
}
