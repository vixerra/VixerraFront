"use client";

import { createContext, Suspense, useContext, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { Tier } from "@/lib/constants";
import {
  PromoBonusBadge,
  PromoCodeField,
  promoBonusFor,
  type AppliedPromo,
} from "@/components/settings/promo-code";

/**
 * The pricing page's promo code. The field checks it with the signed-out
 * preview (most visitors here have no account yet), the plan cards it covers
 * show the bonus, and their buttons carry it to billing as ?promo= — through
 * signup when needed — where it is checked again for this account and
 * applied to the Checkout. A link to /pricing?promo=CODE pre-fills it.
 */

type PricingPromo = { promo: AppliedPromo | null; setPromo: (promo: AppliedPromo | null) => void };

const PricingPromoContext = createContext<PricingPromo | null>(null);

export function PricingPromoProvider({ children }: { children: ReactNode }) {
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  return (
    <PricingPromoContext.Provider value={{ promo, setPromo }}>{children}</PricingPromoContext.Provider>
  );
}

/** The code a plan button should carry for `tier` — only when it covers that
 *  plan, so a plan it doesn't apply to still checks out cleanly. Null outside
 *  the pricing page (no provider). */
export function usePricingPromoCode(tier: Tier): string | null {
  const promo = useContext(PricingPromoContext)?.promo ?? null;
  return promoBonusFor(promo, tier) > 0 ? promo!.code : null;
}

export function PricingPromoBadge({ tier }: { tier: Tier }) {
  const promo = useContext(PricingPromoContext)?.promo ?? null;
  return <PromoBonusBadge credits={promoBonusFor(promo, tier)} />;
}

function FieldWithUrlCode({ className }: { className?: string }) {
  const context = useContext(PricingPromoContext);
  const fromUrl = useSearchParams().get("promo");
  if (!context) return null;
  return (
    <PromoCodeField
      applied={context.promo}
      onApply={context.setPromo}
      preview
      autoApply={fromUrl}
      className={className}
    />
  );
}

/** Suspense because ?promo= is read with useSearchParams, and the rest of the
 *  pricing page is static. */
export function PricingPromoField({ className }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <FieldWithUrlCode className={className} />
    </Suspense>
  );
}
