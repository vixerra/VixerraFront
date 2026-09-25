"use client";

import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { useInView } from "@/hooks/use-in-view";
import { useMe } from "@/hooks/use-me";
import { useCountUp } from "@/hooks/use-count-up";
import { CREDIT_VALUE_USD, TIER_INFO } from "@/lib/constants";
import { formatMoney } from "@/lib/currency";
import {
  COMPETITORS,
  ENTRY_PRICE_MONTHLY,
  ENTRY_TIER,
  PRICES_CHECKED_ON,
  ROLLOVER_TIER,
  formatListPrice,
  yearlySavings,
  type Competitor,
} from "@/lib/competitor-pricing";
import { subscribeHref } from "@/lib/hosts";
import { cn } from "@/lib/utils";

const ENTRY_LABEL = TIER_INFO[ENTRY_TIER].label;

type Cell = { text: string; ok?: boolean; sub?: string };
type Row = { label: string; ours: Cell; theirs: (c: Competitor) => Cell };

// Only rows every cell of which was checked (see competitor-pricing.ts). The
// first one is a tie on purpose: the point of the page is "the same models",
// and a table that only ever shows wins reads as a sales sheet, not a check.
const ROWS: Row[] = [
  {
    label: "Seedance & Kling video models",
    ours: { text: "Included", ok: true },
    theirs: () => ({ text: "Included", ok: true }),
  },
  {
    label: "Cheapest paid plan",
    ours: { text: `${formatListPrice(ENTRY_PRICE_MONTHLY)}/mo`, sub: ENTRY_LABEL },
    theirs: (c) => ({ text: `${formatListPrice(c.entryPriceMonthly)}/mo`, sub: c.entryPlan }),
  },
  {
    label: "That plan over 12 months",
    ours: { text: formatListPrice(ENTRY_PRICE_MONTHLY * 12) },
    theirs: (c) => ({ text: formatListPrice(c.entryPriceMonthly * 12) }),
  },
  {
    label: "Unused plan credits roll over",
    ours: ROLLOVER_TIER
      ? {
          text: "Yes",
          ok: true,
          sub: `From ${TIER_INFO[ROLLOVER_TIER].label}, ${formatListPrice(TIER_INFO[ROLLOVER_TIER].priceMonthly)}/mo`,
        }
      : { text: "No", ok: false },
    theirs: (c) => (c.rollover ? { text: c.rollover } : { text: "No", ok: false }),
  },
];

const PERKS = [
  `1 credit = ${formatMoney(CREDIT_VALUE_USD)} on every plan`,
  "Exact cost shown before you generate",
  "No watermark on any plan",
];

function SavingsCard({ competitor, index }: { competitor: Competitor; index: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const savings = yearlySavings(competitor);
  const value = useCountUp(savings, inView, 1400);

  return (
    <Reveal delayMs={index * 120} className="h-full">
      <div
        ref={ref}
        className="group relative h-full overflow-hidden rounded-2xl border border-line bg-surface-2 p-3.5 shadow-card transition-[border-color,box-shadow] duration-500 hover:border-accent-amber/40 sm:p-7"
      >
        <div
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-accent-amber/15 opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
          aria-hidden="true"
        />
        <p className="truncate text-[11px] text-muted uppercase sm:text-caption sm:tracking-wide">
          <span className="hidden sm:inline">vs </span>
          {competitor.name}
        </p>
        <p className="font-display mt-2 text-3xl leading-none font-bold tracking-tight text-accent-amber tabular-nums sm:mt-3 sm:text-5xl lg:text-6xl">
          ${value}
        </p>
        <p className="mt-2 text-caption text-ink sm:mt-3 sm:text-body-sm">
          less per year<span className="hidden sm:inline"> to get started</span>
        </p>
        <div className="mt-5 hidden flex-wrap items-center gap-x-2 border-t border-line pt-4 text-caption text-muted sm:flex">
          <span className="font-semibold text-brand">
            {ENTRY_LABEL} {formatListPrice(ENTRY_PRICE_MONTHLY)}
          </span>
          <span aria-hidden="true">vs</span>
          <span>
            {competitor.entryPlan} {formatListPrice(competitor.entryPriceMonthly)}
          </span>
        </div>
      </div>
    </Reveal>
  );
}

function CellView({ cell, ours }: { cell: Cell; ours?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-display text-body-sm font-semibold",
          ours ? "text-ink" : "text-muted",
          cell.ok === false && "font-normal text-text-tertiary",
        )}
      >
        {cell.ok === true && (
          <Check
            className={cn("size-4 shrink-0", ours ? "text-brand" : "text-muted")}
            aria-hidden="true"
          />
        )}
        {cell.ok === false && <Minus className="size-4 shrink-0" aria-hidden="true" />}
        {cell.text}
      </span>
      {cell.sub && (
        <span className={cn("text-caption", ours ? "text-brand" : "text-text-tertiary")}>
          {cell.sub}
        </span>
      )}
    </div>
  );
}

export function PriceComparison() {
  const { data: user } = useMe();

  return (
    <section id="compare" className="relative isolate scroll-mt-16 overflow-hidden py-20 sm:py-28">
      {/* Dot texture fading out from the centre, same technique as the
          Seedance banner's halftone — decorative, no colour of its own. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
        aria-hidden="true"
      />

      <div className="container-page">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-amber/25 bg-accent-amber/10 px-3 py-1 text-caption font-semibold tracking-wide text-accent-amber uppercase">
            <span className="size-1.5 rounded-full bg-accent-amber" aria-hidden="true" />
            Price check · {PRICES_CHECKED_ON}
          </span>
          <h2 className="mt-5 text-heading leading-[1.02] text-ink sm:text-display">
            Same top models.
            <span className="block text-brand">Less to get in.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-body-lg text-muted">
            We read the public pricing pages of the AI studios we get compared with most. Here is
            what it costs to start, and what happens to the credits you don&apos;t use.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-3 gap-3 sm:gap-5">
          {COMPETITORS.map((competitor, index) => (
            <SavingsCard key={competitor.name} competitor={competitor} index={index} />
          ))}
        </div>

        <Reveal className="mt-10">
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface-2 shadow-card">
            <table className="w-full min-w-[600px] border-collapse">
              <caption className="sr-only">
                Vixlens compared with {COMPETITORS.map((c) => c.name).join(", ")}, public prices
                checked {PRICES_CHECKED_ON}
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 w-36 bg-surface-2 px-4 py-5 text-left sm:w-[30%] sm:px-5"
                  >
                    <span className="sr-only">Compared on</span>
                  </th>
                  <th
                    scope="col"
                    className="relative bg-brand/[0.07] px-4 py-5 text-center shadow-[inset_0_2px_0_var(--color-brand)]"
                  >
                    <span className="font-display text-label font-bold tracking-wide text-brand uppercase">
                      Vixlens
                    </span>
                  </th>
                  {COMPETITORS.map((c) => (
                    <th key={c.name} scope="col" className="px-4 py-5 text-center">
                      <span className="font-display text-label font-semibold tracking-wide text-muted uppercase">
                        {c.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-surface-2 px-4 py-5 text-left text-body-sm font-medium text-ink sm:px-5"
                    >
                      {row.label}
                    </th>
                    <td className="bg-brand/[0.07] px-4 py-5">
                      <CellView cell={row.ours} ours />
                    </td>
                    {COMPETITORS.map((c) => (
                      <td key={c.name} className="px-4 py-5">
                        <CellView cell={row.theirs(c)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mx-auto mt-5 max-w-3xl text-center text-caption text-text-tertiary">
            List prices with monthly billing, from each provider&apos;s public pricing page (
            {COMPETITORS.map((c, i) => (
              <span key={c.name}>
                {i > 0 && ", "}
                <a
                  href={c.pricingUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline decoration-white/20 underline-offset-2 transition-colors hover:text-ink"
                >
                  {c.name}
                </a>
              </span>
            ))}
            ), checked {PRICES_CHECKED_ON}. Annual billing lowers every price, ours included. Plans
            include different credit amounts and every platform prices each model its own way, so
            compare the per-generation cost of the models you use most.
          </p>
        </Reveal>

        <Reveal className="mt-12 flex flex-col items-center gap-6">
          <ul className="flex flex-wrap justify-center gap-2">
            {PERKS.map((perk) => (
              <li
                key={perk}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3.5 py-1.5 text-caption text-muted"
              >
                <Check className="size-3.5 text-brand" aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
          <Link
            href={subscribeHref(ENTRY_TIER, Boolean(user))}
            prefetch={false}
            className={buttonVariants({ variant: "accent", className: "px-8" })}
          >
            Get {ENTRY_LABEL} for {formatListPrice(ENTRY_PRICE_MONTHLY)}/mo
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
