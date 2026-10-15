"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants, type ButtonVariant } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import type { Tier } from "@/lib/constants";
import { subscribeHref } from "@/lib/hosts";
import { usePricingPromoCode } from "@/components/pricing/pricing-promo";
import { intervalFor, useBillingInterval } from "@/components/pricing/billing-interval";

/**
 * A pricing card's button. It goes through subscribeHref: straight to
 * billing for a signed-in visitor — which opens Stripe Checkout on arrival
 * when there's no plan to switch from (see PlanSwitcher) — and through signup
 * otherwise, with the plan and the grid's billing period carried along.
 */
export function PlanCta({
  tier,
  variant,
  className,
  children,
}: {
  tier: Tier;
  variant: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  const { data: user } = useMe();
  // The pricing page's promo code, when it covers this plan.
  const promoCode = usePricingPromoCode(tier);
  const interval = intervalFor(tier, useBillingInterval());
  const href = subscribeHref(tier, Boolean(user), promoCode, interval);

  return (
    <Link href={href} prefetch={false} className={buttonVariants({ variant, className })}>
      {children}
    </Link>
  );
}
