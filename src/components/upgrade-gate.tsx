"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock, Megaphone, Scissors, Send, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TIERS, TIER_INFO, type Tier } from "@/lib/constants";
import { hasCreatorSuite, minTierWithCreatorSuite } from "@/lib/tier-limits";
import { useMe } from "@/hooks/use-me";

/**
 * The plan gate for the three tools TIER_INFO.creatorSuite covers — the
 * marketing studio, the editing studio, and publishing to linked accounts.
 *
 * All three used to be advertised on Creator and Studio while being open to
 * every plan: the routes rendered their tool with no tier check at all, and
 * routes/social.ts had no reference to `tier` in any endpoint. This is the
 * frontend half of closing that. The API refuses the social endpoints on its
 * own (a UI gate protects nothing a fetch can skip); the two studios have no
 * endpoint of their own to refuse — the marketing studio submits through the
 * ordinary generation routes and the editing studio never leaves the browser
 * — so for those two the route IS the product, and gating it here is the
 * whole enforcement.
 */

/**
 * Each locked tool named once, so the three surfaces that sell it can't
 * describe it three different ways.
 *
 * Callers pass the key rather than the copy — and rather than the icon,
 * which matters: /studio and /editor are Server Components, and a Lucide
 * icon is a forwardRef object React can't serialize across that boundary
 * (the build fails on it, which is how this shape was arrived at).
 */
export type CreatorFeature = "marketing-studio" | "editing-studio" | "social-publishing";

const FEATURES: Record<CreatorFeature, { title: string; blurb: string; icon: LucideIcon }> = {
  "marketing-studio": {
    title: "The marketing studio is a Creator feature",
    blurb:
      "Turn your own product and talent shots into ad-ready campaigns: pick a style, attach your assets, write a one-line brief.",
    icon: Megaphone,
  },
  "editing-studio": {
    title: "The editing studio is a Creator feature",
    blurb:
      "Cut, trim and combine your clips into one finished video — transitions, captions, music, your own watermark, and an MP4 at the end.",
    icon: Scissors,
  },
  "social-publishing": {
    title: "Publishing to social is a Creator feature",
    blurb:
      "Send a finished generation straight to TikTok, Instagram, YouTube or Facebook with a caption, tags and a scheduled time. Downloading and posting by hand works on every plan.",
    icon: Send,
  },
};

/** Fails closed while `useMe()` is still resolving: callers render the
 *  spinner rather than a flash of the tool, and an errored or unrecognised
 *  tier never counts as entitled. */
export function useCreatorSuite() {
  const { data: me, isLoading } = useMe();
  // effectiveTier, not tier — see the note on Me.effectiveTier. A free
  // member of a Studio team is billed as Studio server-side, so locking the
  // tool here would refuse something they can actually afford.
  return { allowed: hasCreatorSuite(me?.effectiveTier), isLoading };
}

/** The plan being sold, read from the data so the copy can never name a plan
 *  that doesn't actually include the feature. */
function unlockingPlanLabel(): string {
  const tier: Tier | undefined = minTierWithCreatorSuite();
  return tier ? TIER_INFO[tier].label : "a paid plan";
}

/** Every plan that includes the suite, listed from the data — so adding or
 *  removing a plan never leaves this sentence naming the old set. */
function includedPlansLabel(): string {
  const names = TIERS.filter((t) => TIER_INFO[t].creatorSuite).map((t) => TIER_INFO[t].label);
  if (names.length === 0) return "paid plans";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function CreatorSuiteUpsell({
  feature,
  className,
}: {
  feature: CreatorFeature;
  className?: string;
}) {
  const { title, blurb, icon: Icon } = FEATURES[feature];
  const plan = unlockingPlanLabel();
  return (
    <Card
      variant="standard"
      className={cn("flex flex-col items-center gap-3 py-12 text-center", className)}
    >
      <span className="relative flex size-12 items-center justify-center rounded-2xl bg-brand/10">
        <Icon className="size-5 text-brand" aria-hidden="true" />
        {/* The lock rides the tool's own icon rather than replacing it — the
            point is which tool this is, with "locked" as the modifier. */}
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border border-line bg-surface-2">
          <Lock className="size-2.5 text-muted" aria-hidden="true" />
        </span>
      </span>
      <h2 className="text-subheading font-semibold text-ink">{title}</h2>
      <p className="max-w-sm text-body-sm text-muted">
        {blurb} Included on {includedPlansLabel()}.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Link href="/settings/billing" className={buttonVariants({})}>
          Upgrade to {plan}
        </Link>
        <Link href="/pricing" className={buttonVariants({ variant: "secondary" })}>
          Compare plans
        </Link>
      </div>
    </Card>
  );
}

export function CreatorSuiteGate({
  feature,
  children,
}: {
  feature: CreatorFeature;
  children: ReactNode;
}) {
  const { allowed, isLoading } = useCreatorSuite();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <CreatorSuiteUpsell feature={feature} />
      </div>
    );
  }

  return <>{children}</>;
}
