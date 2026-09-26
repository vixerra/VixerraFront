"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Flame, Lock, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { useCountUp } from "@/hooks/use-count-up";
import { useInView } from "@/hooks/use-in-view";
import { useLaunchOffer } from "@/hooks/use-launch-offer";
import { useMe } from "@/hooks/use-me";
import { LAUNCH_OFFER, TIER_INFO } from "@/lib/constants";
import { formatListPrice } from "@/lib/competitor-pricing";
import { subscribeHref } from "@/lib/hosts";
import { cn, formatCredits } from "@/lib/utils";

/**
 * Starter's launch offer, as the landing page sells it: a pill in the hero, a
 * banner right under it, a meter on the plan card and a bar that follows the
 * visitor down the page.
 *
 * Every number comes from useLaunchOffer, i.e. from paid invoices, and every
 * piece returns null once the offer reads sold out. The scarcity is real — the
 * locked-in price is only promised to the first LAUNCH_OFFER.places payers —
 * so the page may shout about it, but it must never outlive it or guess at it:
 * until the API answers, the copy states the size of the offer, not how much
 * of it is left.
 *
 * Accent-hot is this offer's colour, the way it is the Seedance banner's: the
 * one tinted panel on a colourless page reads as an event on its own.
 */

const OFFER = TIER_INFO[LAUNCH_OFFER.tier];
const OFFER_PRICE = formatListPrice(OFFER.priceMonthly);

/** The banner's id, which the hero pill jumps to. */
export const LAUNCH_OFFER_ANCHOR = "launch-offer";

/** Pulsing "live" dot — what makes a count read as running. */
function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2 shrink-0", className)} aria-hidden="true">
      <span className="absolute inline-flex size-full rounded-full bg-accent-hot opacity-75 motion-safe:animate-ping" />
      <span className="relative inline-flex size-2 rounded-full bg-accent-hot" />
    </span>
  );
}

/** A glint sweeping across a CTA. The button must be relative + overflow-hidden.
 *  Hidden outright under reduced motion: without the animation the band would
 *  sit still at the left edge as a stripe. */
export function LaunchOfferShine() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/4 bg-white/35 motion-safe:block motion-safe:animate-shine"
    />
  );
}

/**
 * Spots left, drained down from the full count the first time it scrolls into
 * view. Keyed on `taken` by the caller: useCountUp only ever runs once, so a
 * refetch that moves the number has to replay it rather than leave the old
 * figure on screen.
 */
function SpotsLeft({ places, taken }: { places: number; taken: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const drained = useCountUp(taken, inView);
  return (
    <span ref={ref} className="tabular-nums">
      {places - drained}
    </span>
  );
}

/** One square per spot: taken in hot, open in lime, the next one to go
 *  pulsing. All neutral while the count is unknown. */
function SeatGrid({
  places,
  taken,
  className,
}: {
  places: number;
  taken: number | null;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div
      role="img"
      aria-label={
        taken === null ? `${places} spots in total` : `${places - taken} of ${places} spots left`
      }
      className={cn("grid grid-cols-10 gap-1.5", className)}
    >
      {Array.from({ length: places }, (_, i) => {
        const state =
          taken === null ? "unknown" : i < taken ? "taken" : i === taken ? "next" : "open";
        return (
          <motion.span
            key={i}
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "aspect-square rounded-md border",
              state === "taken" && "border-accent-hot/60 bg-accent-hot/70",
              state === "next" && "border-brand bg-brand/25 shadow-glow-sm motion-safe:animate-pulse",
              state === "open" && "border-brand/40 bg-brand/10",
              state === "unknown" && "border-line bg-white/5",
            )}
          />
        );
      })}
    </div>
  );
}

function spotsLabel(places: number, remaining: number | null) {
  return remaining === null ? `${places} spots` : `${remaining} left`;
}

/** Hero pill, above the model chips — the offer above the fold. */
export function LaunchOfferPill() {
  const { places, remaining, soldOut } = useLaunchOffer();
  if (soldOut) return null;

  return (
    <a
      href={`#${LAUNCH_OFFER_ANCHOR}`}
      className="group inline-flex items-center gap-2.5 rounded-full border border-accent-hot/40 bg-accent-hot/10 py-1.5 pr-2.5 pl-3 text-caption text-white/85 shadow-glow-hot-sm backdrop-blur transition-colors hover:border-accent-hot/70 hover:text-white"
    >
      <LiveDot />
      <span className="font-bold tracking-wide text-accent-hot uppercase">Launch offer</span>
      <span className="hidden sm:inline">
        {OFFER_PRICE}/mo locked in for the first {places}
      </span>
      <span className="rounded-full bg-accent-hot px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
        {spotsLabel(places, remaining)}
      </span>
      <ArrowRight
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}

/** The offer's own section, between the hero and the plans. */
export function LaunchOfferBanner() {
  const { places, taken, soldOut } = useLaunchOffer();
  const { data: user } = useMe();
  if (soldOut) return null;

  return (
    <section id={LAUNCH_OFFER_ANCHOR} className="container-page scroll-mt-20 py-10 sm:py-14">
      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] border border-accent-hot/30 bg-surface-2 p-7 shadow-glow-hot-md sm:p-12">
          {/* Halftone dots and a hot glow from the counter's side — the
              Seedance banner's texture, mirrored. Decorative only. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: "radial-gradient(rgb(255 0 82 / 0.5) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
              maskImage: "radial-gradient(ellipse 60% 100% at 100% 50%, black, transparent)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 80% at 95% 40%, rgb(255 0 82 / 0.18), transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-hot px-2.5 py-1 text-caption font-black tracking-wide text-white uppercase">
                  <Flame className="size-3.5" aria-hidden="true" />
                  Limited offer
                </span>
                <span className="rounded-md border border-accent-hot/40 bg-accent-hot/15 px-2.5 py-1 text-caption font-black tracking-wide text-accent-hot uppercase">
                  {places} spots only
                </span>
              </div>

              <h2 className="mt-4 text-heading leading-[1.05] font-black tracking-tight uppercase sm:text-5xl">
                <span className="block text-ink">Lock in {OFFER_PRICE}/mo</span>
                <span className="block text-accent-hot">Only {places} spots</span>
              </h2>

              <p className="mt-4 max-w-lg text-body text-muted">
                The first {places} {OFFER.label} subscribers keep {OFFER_PRICE} a month for as long
                as they stay subscribed, whatever {OFFER.label} costs later.{" "}
                {formatCredits(OFFER.monthlyCredits)} credits every month, every model, no
                watermark, commercial license.
              </p>

              <Link
                href={subscribeHref(LAUNCH_OFFER.tier, Boolean(user))}
                prefetch={false}
                className={buttonVariants({
                  variant: "accent",
                  className: "relative mt-7 w-full overflow-hidden px-8 py-4 text-body sm:w-auto",
                })}
              >
                <LaunchOfferShine />
                Claim my spot for {OFFER_PRICE}/mo
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-2xl border border-line bg-black/40 p-6 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-caption font-semibold tracking-wide text-muted uppercase">
                  <LiveDot />
                  Live count
                </p>
                <p className="flex items-center gap-1.5 text-caption text-text-tertiary">
                  <Lock className="size-3.5" aria-hidden="true" />
                  Price locked in
                </p>
              </div>

              <p className="font-display mt-4 flex flex-wrap items-baseline gap-x-2">
                <span
                  className={cn(
                    "text-6xl font-black",
                    taken === null ? "text-ink" : "text-accent-hot",
                  )}
                >
                  {taken === null ? (
                    places
                  ) : (
                    <SpotsLeft key={taken} places={places} taken={taken} />
                  )}
                </span>
                <span className="text-body text-muted">
                  {taken === null ? `spots at ${OFFER_PRICE}/mo` : `of ${places} spots left`}
                </span>
              </p>

              <SeatGrid places={places} taken={taken} className="mt-5" />

              <p className="mt-5 text-caption text-text-tertiary">
                A spot is yours once your first payment goes through. Cancel anytime; a spot
                isn&apos;t reopened once taken.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** The plan card's version: how much of the offer is gone, as a bar. */
export function LaunchOfferMeter({ className }: { className?: string }) {
  const { places, taken, remaining } = useLaunchOffer();
  const claimed = taken === null ? 0 : (taken / places) * 100;

  return (
    <div className={cn("rounded-xl border border-accent-hot/25 bg-accent-hot/5 px-3.5 py-3", className)}>
      <div className="flex items-center justify-between gap-2 text-caption">
        <span className="flex items-center gap-1.5 font-semibold text-accent-hot">
          <Lock className="size-3.5" aria-hidden="true" />
          Locked in for the first {places}
        </span>
        <span className="text-muted tabular-nums">{spotsLabel(places, remaining)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-accent-hot"
          initial={{ width: 0 }}
          whileInView={{ width: `${claimed}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

const DISMISS_KEY = "vixlens:launch-offer-bar-dismissed";

/**
 * A bar that follows the visitor once they're past the hero. Out of the way
 * while the banner or the plans are on screen (they carry the same CTA), and
 * gone for the session once dismissed. Leaves the bottom-right corner to
 * BackToTop on phones.
 */
export function LaunchOfferStickyBar() {
  const { places, remaining, soldOut } = useLaunchOffer();
  const { data: user } = useMe();
  const [pastHero, setPastHero] = useState(false);
  const [covered, setCovered] = useState(false);
  // Read once on the client; the bar renders nothing before the first scroll
  // event either way, so the server's `false` can't cause a mismatch.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = [LAUNCH_OFFER_ANCHOR, "plans"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const onScreen = new Set<Element>();
    // Threshold 0, not a fraction: the plans section is several screens tall
    // on a phone, and would never reach 20% visible.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target);
          else onScreen.delete(entry.target);
        }
        setCovered(onScreen.size > 0);
      },
      { threshold: 0, rootMargin: "0px 0px -30% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  if (soldOut || dismissed || !pastHero || covered) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode or blocked storage: dismissed for this page view only.
    }
  }

  return (
    <div className="animate-fade-up fixed right-20 bottom-5 left-4 z-40 sm:right-auto sm:left-1/2 sm:w-max sm:-translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-accent-hot/40 bg-surface-2/90 py-2 pr-2 pl-4 shadow-floating backdrop-blur-md">
        <LiveDot />
        <p className="min-w-0 truncate text-caption text-muted sm:text-body-sm">
          {/* Phone: "14 left · $5.99/mo". Wider: "14 spots left at $5.99/mo, locked in". */}
          <span className="font-semibold text-ink">
            {remaining === null ? (
              `${places} spots`
            ) : (
              <>
                {remaining}
                <span className="hidden sm:inline"> spots</span> left
              </>
            )}
          </span>{" "}
          <span className="sm:hidden">· </span>
          <span className="hidden sm:inline">at </span>
          {OFFER_PRICE}/mo<span className="hidden sm:inline">, locked in</span>
        </p>
        <Link
          href={subscribeHref(LAUNCH_OFFER.tier, Boolean(user))}
          prefetch={false}
          className={buttonVariants({
            variant: "accent",
            size: "sm",
            className: "relative shrink-0 overflow-hidden",
          })}
        >
          <LaunchOfferShine />
          Claim
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the launch offer"
          className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
