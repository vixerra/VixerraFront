"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants, type ButtonVariant } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { TIER_INFO, type Tier } from "@/lib/constants";
import { appHref, subscribeHref } from "@/lib/hosts";
import { usePricingPromoCode } from "@/components/pricing/pricing-promo";

/**
 * A pricing card's button. A paid plan goes through subscribeHref: straight
 * to billing for a signed-in visitor — which opens Stripe Checkout on arrival
 * when there's no plan to switch from (see PlanSwitcher) — and through signup
 * otherwise, with the plan carried along. Free has nothing to buy, so it is
 * just the signup page.
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
  const href =
    TIER_INFO[tier].priceMonthly > 0
      ? subscribeHref(tier, Boolean(user), promoCode)
      : appHref("/signup");

  return (
    <Link href={href} prefetch={false} className={buttonVariants({ variant, className })}>
      {children}
    </Link>
  );
}
