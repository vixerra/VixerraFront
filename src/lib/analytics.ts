// Funnel events for Google Tag Manager: visitor → sign_up → first_generation
// → begin_checkout → purchase. One name per step, the same everywhere, pushed
// to GTM's dataLayer (tracking-tags.tsx loads GTM on first interaction; the
// queue is read when it does, so an early push isn't lost).
//
// Only the dataLayer, never fbq() directly: Meta's CompleteRegistration and
// Purchase already go server-side through the Conversions API (meta-capi.ts
// in the API), and a browser event without the matching event_id would be
// counted twice. Route these to GA4 / Meta / TikTok from GTM, where the
// dedup rules live.

type FunnelEvent =
  | { event: "sign_up"; method: "email" | "google" }
  | { event: "first_generation"; model?: string }
  | {
      event: "begin_checkout";
      plan: string;
      interval: "monthly" | "annual" | "one_time";
      value: number;
      currency: "USD";
    }
  | {
      event: "purchase";
      plan: string;
      interval: "monthly" | "annual" | "one_time";
      value: number;
      currency: "USD";
    };

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(payload: FunnelEvent): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

const FIRST_GENERATION_KEY = "vixlens:first_generation_tracked";

/**
 * first_generation, once. The API says whether a completed job is the
 * account's first (firstForAccount on the stream's "completed" event); this
 * only stops a reload of that same result page from sending it again.
 */
export function trackFirstGeneration(jobId: string, model?: string): void {
  try {
    // Keyed by job: only an account's first job ever carries the server
    // flag, so this just stops a reload of that job from sending it twice.
    const key = `${FIRST_GENERATION_KEY}:${jobId}`;
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage blocked: the server flag alone still keeps this to the first
    // generation, at worst sent again on a reload.
  }
  track({ event: "first_generation", model });
}

type CheckoutIntent = Omit<Extract<FunnelEvent, { event: "begin_checkout" }>, "event">;
const CHECKOUT_KEY = "vixlens:checkout_intent";

/** begin_checkout, remembered for the trip to Stripe so the purchase event
 *  on the way back can say what was bought. */
export function trackBeginCheckout(intent: CheckoutIntent): void {
  track({ event: "begin_checkout", ...intent });
  try {
    window.sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(intent));
  } catch {
    // Storage blocked: purchase just won't fire for this checkout.
  }
}

/** purchase, for the checkout begun in this tab. Sent once: the intent is
 *  cleared as it's read. */
export function trackPurchaseFromCheckout(): void {
  let intent: CheckoutIntent | null = null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_KEY);
    window.sessionStorage.removeItem(CHECKOUT_KEY);
    intent = raw ? (JSON.parse(raw) as CheckoutIntent) : null;
  } catch {
    intent = null;
  }
  if (intent) track({ event: "purchase", ...intent });
}
