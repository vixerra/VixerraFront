"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { TIERS, TIER_INFO, type Tier } from "@/lib/constants";
import { PlanFeatureList } from "@/components/pricing/plan-feature-list";
import { PlanPrice } from "@/components/pricing/plan-price";
import { apiFetch } from "@/lib/api-client";
import { formatCredits } from "@/lib/utils";
import { useInvalidateCredits } from "@/hooks/use-credits";
import type { SubscriptionState } from "@/components/settings/billing-client";

/**
 * What POST /api/subscription/upgrade reports back — the *simulated* path,
 * still used on a deployment with no Stripe keys.
 *
 * `outcome` is the part worth showing. A switch does not always credit
 * anything: the API grants a plan's credits only when it outranks the
 * highest plan already credited this month, so re-picking a plan you held
 * earlier in the month, or moving down, changes the tier and pays out
 * nothing. The balance alone can't tell those apart from a successful
 * grant — see the high-water-mark rule on /upgrade in the Edge Function.
 */
type SwitchResult = {
  tier: Tier;
  credit_balance: number;
  outcome: "granted" | "no_grant" | "unchanged";
  credits_granted: number;
  /** Set only on "no_grant": the plan that already took this month's
   *  grant, which is the reason nothing was credited. */
  already_granted_tier: Tier | null;
  /** What the next renewal adds. Zero on a plan that doesn't renew. */
  next_renewal_credits: number;
  /** False on a plan with no recurring allowance (Free's credits are a
   *  one-time grant), where "arrives at your next renewal" would be a lie. */
  plan_renews: boolean;
};

/**
 * What POST /api/subscription/checkout reports back — the Stripe path.
 *
 * Only "checkout" leaves the app. The other three are changes Stripe made
 * to an existing subscription in place, and each one needs different
 * wording: a switch has been billed, a cancellation has not taken effect
 * yet, and a resume undoes a pending one.
 */
type CheckoutResult = {
  outcome: "checkout" | "switched" | "resumed" | "scheduled_cancel" | "unchanged";
  url?: string;
  tier?: Tier;
  direction?: "upgrade" | "downgrade";
  /** True on an upgrade: Stripe billed the difference, and the new credits
   *  land as soon as that invoice is reported paid — a webhook away, so the
   *  number isn't known here yet. */
  credits_pending?: boolean;
  current_period_end?: string | null;
};

function tierLabel(tier: string) {
  return TIER_INFO[tier as Tier]?.label ?? tier;
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Reports what the switch actually did.
 *
 * A toast was not enough here: "Switched to Creator" is true and still
 * misleading on the simulated no-grant path, where the user is left looking
 * for credits that were never coming — and on the Stripe path a downgrade
 * that only takes effect next month reads as if it already had. This states
 * the outcome, and has to be dismissed.
 */
function ResultDialog({
  title,
  body,
  footer,
  onClose,
}: {
  title: string;
  body: string;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title={title}>
      <p className="text-body-sm text-muted">{body}</p>
      {footer}
      <div className="mt-6 flex justify-end">
        <Button variant="primary" size="sm" onClick={onClose}>
          Got it
        </Button>
      </div>
    </Modal>
  );
}

function SimulatedResultDialog({ result, onClose }: { result: SwitchResult; onClose: () => void }) {
  const label = tierLabel(result.tier);
  // Three outcomes, and the no-grant one splits again on whether the plan
  // renews at all: landing on a plan that issues nothing further is a
  // different fact from "this cycle was already paid out", and promising a
  // renewal that never comes is the exact confusion this dialog exists to
  // prevent.
  const body =
    result.outcome === "granted"
      ? `${label}'s ${formatCredits(result.credits_granted)} credits are on your account now.`
      : result.outcome === "no_grant"
        ? result.plan_renews
          ? `No credits were added this time — this month's allowance was already issued at ${tierLabel(
              result.already_granted_tier ?? result.tier,
            )}, so your balance is unchanged. ${label}'s ${formatCredits(
              result.next_renewal_credits,
            )} credits arrive at your next renewal.`
          : `Your balance is unchanged, and it stays that way: ${label} has no monthly allowance. Credits you already hold keep working — top up with a credit pack, or move to a paid plan for a monthly refill.`
        : `You were already on ${label}, so nothing changed.`;

  return (
    <ResultDialog
      title={result.outcome === "unchanged" ? `Still on ${label}` : `Now on ${label}`}
      body={body}
      footer={
        <div className="mt-4 flex items-baseline justify-between rounded-lg border border-line px-4 py-3">
          <span className="text-body-sm text-muted">Credit balance</span>
          <span className="text-subheading font-semibold text-ink">
            {formatCredits(result.credit_balance)}
          </span>
        </div>
      }
      onClose={onClose}
    />
  );
}

function StripeResultDialog({ result, onClose }: { result: CheckoutResult; onClose: () => void }) {
  const label = tierLabel(result.tier ?? "free");
  const endsOn = formatDate(result.current_period_end);

  if (result.outcome === "scheduled_cancel") {
    return (
      <ResultDialog
        title="Plan set to end"
        // Not "you're on Free now": they paid for this period and keep the
        // plan, its limits and its credits until it runs out. Saying
        // otherwise would have people wondering why the features still work.
        body={
          endsOn
            ? `Your plan stays active until ${endsOn}, and you won't be charged again. Everything keeps working until then — including the credits already on your account.`
            : "Your plan will end when the current period does, and you won't be charged again. Everything keeps working until then."
        }
        onClose={onClose}
      />
    );
  }

  if (result.outcome === "resumed") {
    return (
      <ResultDialog
        title={`${label} will keep renewing`}
        body="The scheduled cancellation is off. Nothing else changed, and you weren't charged for this."
        onClose={onClose}
      />
    );
  }

  if (result.outcome === "switched" && result.direction === "downgrade") {
    return (
      <ResultDialog
        title={`Now on ${label}`}
        // A downgrade's proration is a credit against the next invoice, not
        // a refund — and it grants nothing now, so promising new credits
        // here would be wrong.
        body={`Your plan changed right away and the unused part of what you'd already paid is credited against your next invoice. Credits already on your account are untouched — ${label}'s allowance starts at your next renewal.`}
        onClose={onClose}
      />
    );
  }

  if (result.outcome === "switched") {
    return (
      <ResultDialog
        title={`Now on ${label}`}
        body={`You've been charged the difference for the rest of this period. ${label}'s credits land on your account as soon as that payment clears — usually a few seconds.`}
        onClose={onClose}
      />
    );
  }

  return (
    <ResultDialog title={`Still on ${label}`} body="Nothing changed." onClose={onClose} />
  );
}

export function PlanSwitcher({
  currentTier,
  paymentsEnabled,
  subscription,
  unavailable = false,
}: {
  currentTier: string;
  /** False on a deployment with no Stripe keys — the old instant, free
   *  switcher is still the whole billing flow there. */
  paymentsEnabled: boolean;
  subscription: SubscriptionState | null;
  /** Stripe is on but the Price ids were never configured, so every buy
   *  button would fail at the click. Disable them and say so instead. */
  unavailable?: boolean;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const invalidateCredits = useInvalidateCredits();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [simulatedResult, setSimulatedResult] = useState<SwitchResult | null>(null);
  const [stripeResult, setStripeResult] = useState<CheckoutResult | null>(null);

  const pendingCancel = subscription?.cancel_at_period_end === true;
  const periodEnd = formatDate(subscription?.current_period_end);

  /** The confirm copy has to match what is actually about to happen —
   *  leaving for Stripe, being billed a proration immediately, or scheduling
   *  a cancellation for later are three different commitments. */
  async function confirmFor(tier: Tier): Promise<boolean> {
    const target = TIER_INFO[tier];

    if (!paymentsEnabled) {
      return confirm({
        title: `Switch to ${target.label}?`,
        // Deliberately not "your allowance is reset to the new plan's",
        // which this used to say and which is wrong in both directions:
        // moving down doesn't take credits away, and moving back up to a
        // plan you already held this month doesn't add any.
        description:
          "Your plan changes right away. If it ranks above any plan you've already been credited for this month, you get its full credits now — otherwise your balance stays as it is and the new allowance starts at your next renewal.",
        confirmLabel: `Switch to ${target.label}`,
      });
    }

    if (tier === "free") {
      return confirm({
        title: "Cancel your plan?",
        description: periodEnd
          ? `You'll keep ${tierLabel(currentTier)} and everything on your account until ${periodEnd}, and you won't be charged again. You can restart any time.`
          : `You'll keep ${tierLabel(currentTier)} until the end of the period you've already paid for, and you won't be charged again.`,
        confirmLabel: "Cancel plan",
      });
    }

    if (subscription && pendingCancel && subscription.tier === tier) {
      return confirm({
        title: `Keep ${target.label}?`,
        description: "Your plan will carry on renewing as normal. You won't be charged for this now.",
        confirmLabel: "Keep plan",
      });
    }

    if (subscription) {
      const isUpgrade = TIERS.indexOf(tier) > TIERS.indexOf(subscription.tier as Tier);
      return confirm({
        title: `Switch to ${target.label}?`,
        description: isUpgrade
          ? `Your card is charged the difference for the rest of this period, and ${target.label}'s credits are added once it clears.`
          : `The change applies right away, and what you've already paid for the rest of this period is credited against your next invoice. Nothing is taken off your balance.`,
        confirmLabel: `Switch to ${target.label}`,
      });
    }

    // No subscription yet — the next step is Stripe's payment page, so say
    // so rather than implying the plan starts on this click.
    return confirm({
      title: `Continue to payment?`,
      description: `You'll be taken to Stripe to start ${target.label}. Your plan and credits are added as soon as the payment goes through.`,
      confirmLabel: "Continue",
    });
  }

  async function switchTo(tier: Tier) {
    if (!(await confirmFor(tier))) return;

    setLoadingTier(tier);
    try {
      const endpoint = paymentsEnabled ? "/api/subscription/checkout" : "/api/subscription/upgrade";
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to switch plan");

      if (!paymentsEnabled) {
        invalidateCredits();
        setSimulatedResult(json as SwitchResult);
        return;
      }

      const result = json as CheckoutResult;
      if (result.outcome === "checkout" && result.url) {
        // Leaves the app entirely — no state to clean up, and deliberately
        // no `finally` reset of the spinner, so the button stays busy for
        // the moment the redirect takes.
        window.location.assign(result.url);
        return;
      }
      invalidateCredits();
      setStripeResult(result);
    } catch (err) {
      toast({
        title: "Couldn't switch plan",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setLoadingTier(null);
    }
  }

  /** What the button on each card says, which is the only place the four
   *  possible relationships to a plan are visible at a glance. */
  function actionFor(tier: Tier) {
    const isCurrent = tier === currentTier;
    if (!paymentsEnabled) {
      return { label: isCurrent ? "Current plan" : "Switch", disabled: isCurrent, primary: !isCurrent };
    }
    if (isCurrent && pendingCancel && tier !== "free") {
      return { label: "Keep plan", disabled: false, primary: true };
    }
    if (isCurrent) {
      return { label: "Current plan", disabled: true, primary: false };
    }
    if (tier === "free") {
      // Reachable only while a paid plan is live — this is the cancel path.
      return { label: "Cancel plan", disabled: false, primary: false };
    }
    return { label: subscription ? "Switch" : "Choose plan", disabled: unavailable, primary: true };
  }

  return (
    <>
      {unavailable && (
        <p className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
          Plans can&apos;t be purchased right now — billing isn&apos;t fully set up on this server.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {TIERS.map((tier) => {
          const info = TIER_INFO[tier];
          const isCurrent = tier === currentTier;
          const action = actionFor(tier);
          return (
            <Card key={tier} variant="compact" className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-mono text-label font-semibold text-ink">{info.label}</h3>
                {isCurrent && pendingCancel && (
                  <Badge variant="outline">{periodEnd ? `Ends ${periodEnd}` : "Ending"}</Badge>
                )}
              </div>
              <p className="mt-1 text-heading font-bold text-ink">
                <PlanPrice priceMonthly={info.priceMonthly} showSuffix={false} />
              </p>
              <PlanFeatureList
                features={info.features.slice(0, 3)}
                note={info.featuresNote}
                size="sm"
                className="mt-3 flex-1"
              />
              <Button
                variant={action.primary ? "primary" : "secondary"}
                disabled={action.disabled}
                loading={loadingTier === tier}
                onClick={() => switchTo(tier)}
                className="mt-4 w-full"
              >
                {action.label}
              </Button>
            </Card>
          );
        })}
      </div>
      {simulatedResult && (
        <SimulatedResultDialog result={simulatedResult} onClose={() => setSimulatedResult(null)} />
      )}
      {stripeResult && (
        <StripeResultDialog result={stripeResult} onClose={() => setStripeResult(null)} />
      )}
    </>
  );
}
