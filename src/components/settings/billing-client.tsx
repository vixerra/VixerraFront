"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { TIER_INFO, type Tier } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { formatCredits } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { PlanSwitcher } from "@/components/settings/plan-switcher";
import { RechargePacks } from "@/components/settings/recharge-packs";
import { PlanPrice } from "@/components/pricing/plan-price";
import { useSpotlight } from "@/hooks/use-spotlight";
import { useInvalidateCredits } from "@/hooks/use-credits";

/** The live Stripe subscription, mirrored server-side. Null on Free, and on
 *  any deployment with no Stripe account behind it. */
export type SubscriptionState = {
  /** Stripe's own vocabulary, passed through rather than collapsed to a
   *  boolean — "past_due" needs different wording from "canceled". */
  status: string;
  tier: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
};

type SubscriptionResponse = {
  tier: string;
  info: (typeof TIER_INFO)[Tier];
  credits_used_this_month: number;
  credits_limit: number;
  credit_balance: number;
  credits_expiring_soon: number;
  subscription: SubscriptionState | null;
  /** False when the server has no Stripe keys: plan switches and top-ups
   *  are instant and free, and the UI has to say so instead of implying a
   *  card is involved. */
  payments_enabled: boolean;
  /** Names of Price ids the server is missing. Non-empty means the buy
   *  buttons would fail at the click, so they're disabled up front. */
  payments_misconfigured: string[];
};

type PaymentRecord = {
  id: string;
  kind: string;
  tier: string | null;
  pack_id: string | null;
  credits: number;
  amount_cents: number;
  currency: string;
  created_at: string;
};

function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<SubscriptionResponse> => {
      const res = await apiFetch("/api/subscription");
      if (!res.ok) throw new Error("Failed to load subscription");
      return res.json();
    },
  });
}

function usePayments(enabled: boolean) {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async (): Promise<{ payments: PaymentRecord[] }> => {
      const res = await apiFetch("/api/subscription/payments");
      if (!res.ok) throw new Error("Failed to load payments");
      return res.json();
    },
    enabled,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** What actually changed once a payment lands, as one comparable string.
 *  A plan purchase moves the tier or the subscription status; a credit pack
 *  moves only the balance — so all of them are in here. */
function accountSignature(data: SubscriptionResponse | undefined) {
  if (!data) return null;
  const sub = data.subscription;
  return [
    data.tier,
    data.credit_balance,
    sub?.status ?? "none",
    sub?.cancel_at_period_end ?? false,
    sub?.current_period_end ?? "",
  ].join("|");
}

/** How long the page keeps polling for the webhook before giving up on
 *  showing a live confirmation. Stripe is usually a second or two behind the
 *  redirect; past this the payment is still fine and the account still
 *  updates, it just isn't worth a spinner that never ends. */
const WEBHOOK_WAIT_MS = 12000;

/**
 * Handles the return trip from Stripe Checkout.
 *
 * The redirect lands here before the webhook necessarily has, so the page
 * would otherwise show the old plan and balance for a few seconds right
 * after a successful payment — which reads as "my payment didn't work" at
 * exactly the wrong moment. A success return therefore polls, and says it is
 * waiting while it does.
 *
 * It only *claims* the payment landed when it actually watched the account
 * change: the baseline is whatever the first poll returns, and a later poll
 * that differs is the confirmation. If the webhook happened to beat that
 * first poll there is nothing left to observe, so the wait simply ends
 * quietly with the correct data on screen — better than a "confirmed" toast
 * this code can't actually vouch for.
 *
 * Same query-param-plus-router.replace shape as the social OAuth callback in
 * social-accounts.tsx, which is why the page wraps this in a Suspense
 * boundary.
 */
function useCheckoutReturn(refetch: () => Promise<{ data?: SubscriptionResponse }>) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invalidateCredits = useInvalidateCredits();
  const [settled, setSettled] = useState(false);

  const outcome = searchParams.get("checkout");
  const awaiting = outcome === "success" && !settled;

  useEffect(() => {
    if (outcome !== "cancelled") return;
    toast({ title: "Checkout cancelled", description: "Nothing was charged.", variant: "default" });
    router.replace("/settings/billing");
  }, [outcome, toast, router]);

  useEffect(() => {
    if (!awaiting) return;

    // A plain closure variable, not a ref: it belongs to this one wait and
    // is gone with it.
    let baseline: string | null = null;
    let stopped = false;

    const tick = async () => {
      const result = await refetch();
      const signature = accountSignature(result.data);
      if (stopped || !signature) return;
      if (baseline === null) {
        baseline = signature;
        return;
      }
      if (signature !== baseline) {
        invalidateCredits();
        toast({
          title: "Payment confirmed",
          description: "Your account is up to date.",
          variant: "success",
        });
        setSettled(true);
      }
    };

    void tick();
    const poll = setInterval(() => void tick(), 2000);
    const timer = setTimeout(() => setSettled(true), WEBHOOK_WAIT_MS);
    return () => {
      stopped = true;
      clearInterval(poll);
      clearTimeout(timer);
    };
  }, [awaiting, refetch, invalidateCredits, toast]);

  // Strip the parameter once the wait is over, so a refresh doesn't replay
  // the whole thing. Deliberately not done on arrival: `?checkout=success`
  // *is* the "we are waiting" state, which is what keeps it out of a
  // setState-in-an-effect.
  useEffect(() => {
    if (outcome === "success" && settled) router.replace("/settings/billing");
  }, [outcome, settled, router]);

  return awaiting;
}

/** Status line for a live subscription — renewal date, a pending
 *  cancellation, or a failed payment. Each needs its own wording; a single
 *  "active/inactive" would hide the only two states the user must act on. */
function SubscriptionStatus({ subscription }: { subscription: SubscriptionState }) {
  const endsOn = formatDate(subscription.current_period_end);

  if (subscription.cancel_at_period_end) {
    return (
      <p className="relative mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
        {endsOn
          ? `Your plan ends on ${endsOn} and won't renew. Everything keeps working until then.`
          : "Your plan won't renew. Everything keeps working until the end of the period you've paid for."}
      </p>
    );
  }

  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    return (
      <p className="relative mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
        We couldn&apos;t take your last payment. Update your card below — your plan stays active
        while we retry.
      </p>
    );
  }

  if (!endsOn) return null;
  return <p className="relative mt-4 text-caption text-muted">Renews on {endsOn}.</p>;
}

function PaymentHistory({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) return null;

  return (
    <div>
      <h3 className="text-label font-semibold text-ink">Recent payments</h3>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
        {payments.map((payment) => {
          const label =
            payment.kind === "subscription"
              ? `${TIER_INFO[payment.tier as Tier]?.label ?? payment.tier} plan`
              : `${formatCredits(payment.credits)} credits`;
          // Charges are made in USD, but a historical record can still carry
          // another currency — show that one as taken rather than passing it
          // through the dollar formatter and mislabelling it.
          const amount =
            payment.currency.toLowerCase() === "usd"
              ? formatMoney(payment.amount_cents / 100)
              : `${(payment.amount_cents / 100).toFixed(2)} ${payment.currency.toUpperCase()}`;
          return (
            <li key={payment.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-body-sm text-ink">{label}</p>
                <p className="text-caption text-muted">{formatDate(payment.created_at)}</p>
              </div>
              <p className="text-body-sm font-medium text-ink">{amount}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BillingClient() {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useSubscription();
  const awaiting = useCheckoutReturn(refetch);
  const [portalLoading, setPortalLoading] = useState(false);
  const spotlight = useSpotlight<HTMLDivElement>();

  const paymentsEnabled = data?.payments_enabled ?? false;
  const { data: paymentsData } = usePayments(paymentsEnabled);

  const openPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await apiFetch("/api/subscription/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't open the billing portal");
      window.location.assign(json.url);
    } catch (err) {
      toast({
        title: "Couldn't open billing",
        description: (err as Error).message,
        variant: "error",
      });
      setPortalLoading(false);
    }
  }, [toast]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const {
    tier,
    info,
    credits_used_this_month,
    credit_balance,
    credits_expiring_soon,
    subscription,
    payments_misconfigured,
  } = data;
  const misconfigured = payments_misconfigured.length > 0;

  return (
    <div className="max-w-2xl space-y-6">
      {awaiting && (
        <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-caption text-ink">
          <Spinner size={16} />
          Payment received — updating your account…
        </div>
      )}

      <Card
        variant="standard"
        {...spotlight}
        className="group relative overflow-hidden hover:translate-y-0 hover:shadow-card"
      >
        {/* Ambient corner glow at rest — crossfades out for the cursor
            spotlight below once hovered. */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-brand opacity-[0.18] blur-3xl transition-opacity duration-300 group-hover:opacity-0"
          aria-hidden="true"
        />
        {/* Cursor spotlight — see use-spotlight.ts. */}
        <div
          className="pointer-events-none absolute size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-[0.18]"
          style={{ left: "var(--spot-x, 100%)", top: "var(--spot-y, 0%)" }}
          aria-hidden="true"
        />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-caption text-muted">Current plan</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-subheading font-semibold text-ink">{info.label}</h2>
              {subscription?.status === "trialing" && <Badge variant="brand">Trial</Badge>}
            </div>
          </div>
          <p className="text-heading font-bold text-ink">
            <PlanPrice priceMonthly={info.priceMonthly} suffixClassName="text-body-sm text-muted" />
          </p>
        </div>

        <div className="relative mt-6 flex items-baseline justify-between">
          <p className="text-caption text-muted">Credit balance</p>
          <p className="text-subheading font-bold text-accent-amber">
            {formatCredits(credit_balance)}
          </p>
        </div>
        {credits_expiring_soon > 0 && (
          <p className="relative mt-1 text-right text-caption text-warning">
            {formatCredits(credits_expiring_soon)} credits expire soon
          </p>
        )}

        <div className="relative mt-4">
          {/* No monthly ceiling to draw a bar against: the balance is the
              only thing that limits a generation, so this month's spend is
              reported as a plain figure rather than a progress meter. */}
          <p className="text-caption text-muted">
            {formatCredits(credits_used_this_month)} credits used this month
          </p>
          {/* A plan with no monthly allowance has nothing arriving on the
              1st, and a "this month" figure invites exactly the wrong
              assumption. Say so once, underneath it. */}
          {!info.renewsMonthly && (
            <p className="mt-1 text-caption text-muted">
              {info.label} credits are a one-time grant — they never expire, and they don&apos;t
              refill each month.
            </p>
          )}
        </div>

        {subscription && <SubscriptionStatus subscription={subscription} />}

        {paymentsEnabled && subscription && (
          <div className="relative mt-5">
            <Button variant="secondary" size="sm" loading={portalLoading} onClick={openPortal}>
              <CreditCard className="size-4" aria-hidden="true" />
              Manage billing
              <ExternalLink className="size-3.5 opacity-60" aria-hidden="true" />
            </Button>
            <p className="mt-2 text-caption text-muted">
              Update your card, download invoices, or cancel — handled by Stripe.
            </p>
          </div>
        )}
      </Card>

      {!paymentsEnabled && (
        <div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-caption text-muted">
          Payments are simulated in this preview — switching plans and buying credit packs below is
          instant and free, no card required.
        </div>
      )}

      {paymentsEnabled && misconfigured && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
          Billing is only half configured on this server — {payments_misconfigured.join(", ")}{" "}
          {payments_misconfigured.length === 1 ? "is" : "are"} unset or not a valid Stripe price id,
          so those items can&apos;t be bought yet.
        </div>
      )}

      <PlanSwitcher
        currentTier={tier}
        paymentsEnabled={paymentsEnabled}
        subscription={subscription}
        unavailable={misconfigured}
      />

      <RechargePacks paymentsEnabled={paymentsEnabled} unavailable={misconfigured} />

      {paymentsEnabled && paymentsData && <PaymentHistory payments={paymentsData.payments} />}
    </div>
  );
}
