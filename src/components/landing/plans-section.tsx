"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { PlanFeatureList } from "@/components/pricing/plan-feature-list";
import { PlanPrice } from "@/components/pricing/plan-price";
import { useMe } from "@/hooks/use-me";
import { TIERS, TIER_INFO, type Tier } from "@/lib/constants";
import { COMPETITORS, ENTRY_TIER, formatListPrice } from "@/lib/competitor-pricing";
import { appHref, subscribeHref } from "@/lib/hosts";
import { cn, formatCredits } from "@/lib/utils";

const PAID_TIERS = TIERS.filter((tier) => TIER_INFO[tier].priceMonthly > 0);
const POPULAR_TIER: Tier = "creator";
// The entry plan is the one the hero and the price check sell, so its card
// gets its own flag too. Outlined rather than filled, so it doesn't compete
// with the popular badge for the same glance.
const ENTRY_BADGE = "Best way to start";
// The card shows its monthly grant as its own amber line, so the matching
// bullet is dropped from the list; the rest is capped so three cards of
// different lengths still line up, with the remainder on /pricing.
const FEATURES_SHOWN = 7;
const isGrantBullet = (feature: string) => /credits \/ month$/.test(feature);

const TAGLINES: Record<Tier, string> = {
  free: "",
  starter: "Every model, for your first projects.",
  creator: "The full creator suite, from idea to post.",
  studio: "4K, API access and seats for a team.",
};

const RIVAL_ENTRY_PRICES = COMPETITORS.map(
  (c) => `${c.name} ${formatListPrice(c.entryPriceMonthly)}`,
).join(" · ");

export function PlansSection() {
  const { data: user } = useMe();
  const signedIn = Boolean(user);

  return (
    <section id="plans" className="relative scroll-mt-16 border-t border-line py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-brand/40 shadow-glow-md"
        aria-hidden="true"
      />
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-caption font-semibold tracking-wide text-brand uppercase">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
            Subscribe
          </span>
          <h2 className="mt-5 text-heading text-ink sm:text-5xl">Pick a plan, create today</h2>
          <p className="mt-4 text-body text-muted">
            Every plan opens every model, and a credit costs the same cent on each of them. Pay
            monthly, switch or cancel whenever you like.
          </p>
        </Reveal>

        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
          {PAID_TIERS.map((tier, index) => {
            const info = TIER_INFO[tier];
            const isPopular = tier === POPULAR_TIER;
            const isEntry = tier === ENTRY_TIER;
            const bullets = info.features.filter((f) => !isGrantBullet(f));
            const shown = bullets.slice(0, FEATURES_SHOWN);
            const hidden = bullets.length - shown.length;
            return (
              <Reveal key={tier} delayMs={index * 100} className="h-full">
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border bg-surface-2 p-8 transition-[border-color,box-shadow,transform] duration-500 ease-out",
                    isPopular
                      ? "border-brand/50 shadow-glow-md lg:-translate-y-4"
                      : isEntry
                        ? "border-brand/30 shadow-card hover:border-brand/50"
                        : "border-line shadow-card hover:border-border-strong",
                  )}
                >
                  {isPopular && (
                    <span className="font-display absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3.5 py-1 text-caption font-bold tracking-wide whitespace-nowrap text-on-brand uppercase shadow-glow-sm">
                      Most popular
                    </span>
                  )}
                  {isEntry && !isPopular && (
                    <span className="font-display absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-brand/50 bg-surface-2 px-3.5 py-1 text-caption font-bold tracking-wide whitespace-nowrap text-brand uppercase">
                      {ENTRY_BADGE}
                    </span>
                  )}

                  <h3 className="text-feature-title text-ink">{info.label}</h3>
                  <p className="mt-1 text-body-sm text-muted">{TAGLINES[tier]}</p>

                  <p className="mt-6 flex items-baseline gap-1">
                    <PlanPrice
                      priceMonthly={info.priceMonthly}
                      className="font-display text-5xl font-bold tracking-tight text-ink"
                      suffixClassName="text-body-sm text-muted"
                    />
                  </p>
                  {isEntry && (
                    <p className="mt-2 text-caption text-text-tertiary">
                      Entry plans elsewhere: {RIVAL_ENTRY_PRICES}
                    </p>
                  )}

                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-accent-amber/20 bg-accent-amber/5 px-3.5 py-2.5">
                    <Zap className="size-4 shrink-0 text-accent-amber" aria-hidden="true" />
                    <span className="font-display text-label font-semibold text-accent-amber">
                      {formatCredits(info.monthlyCredits)} credits
                    </span>
                    <span className="text-caption text-muted">every month</span>
                  </div>

                  <Link
                    href={subscribeHref(tier, signedIn)}
                    prefetch={false}
                    className={buttonVariants({
                      variant: isPopular || isEntry ? "accent" : "primary",
                      className: "mt-6 w-full",
                    })}
                  >
                    Subscribe to {info.label}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>

                  <PlanFeatureList
                    features={shown}
                    note={info.featuresNote}
                    className="mt-7 flex-1"
                  />
                  {hidden > 0 && (
                    <Link
                      href="/pricing"
                      className="mt-4 w-fit text-caption text-muted transition-colors hover:text-ink"
                    >
                      + {hidden} more on the pricing page
                    </Link>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-10">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-line px-6 py-5 text-center sm:flex-row sm:text-left">
            <p className="text-body-sm text-muted">
              <span className="font-medium text-ink">Not ready to subscribe?</span> Try it with{" "}
              {TIER_INFO.free.monthlyCredits} free credits. No card, no watermark.
            </p>
            <Link
              href={appHref("/signup")}
              prefetch={false}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Start free
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
