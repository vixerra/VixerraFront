"use client";

import Link from "next/link";
import { ArrowUpRight, CreditCard, Sparkles, TrendingUp, Video, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { TIER_INFO, type Tier } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import type { GalleryItem } from "@/components/gallery/generation-card";
import { formatCredits } from "@/lib/utils";

type DashboardSummary = {
  usage: { creditsUsed: number; generationsCount: number };
  limit: number;
  creditBalance: number;
  creditsExpiringSoon: number;
  tierInfo: (typeof TIER_INFO)[Tier];
  recentGenerations: GalleryItem[];
  dailyCounts: { date: string; count: number }[];
};

function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async (): Promise<DashboardSummary> => {
      const res = await apiFetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });
}

export function DashboardClient() {
  const { data: user } = useMe();
  const { data, isLoading } = useDashboardSummary();

  if (isLoading || !data || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const { usage, creditBalance, creditsExpiringSoon, tierInfo, recentGenerations, dailyCounts } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-heading font-bold tracking-tight text-ink">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-body-sm text-muted">
            Here&apos;s what&apos;s happening with your account.
          </p>
        </div>
        <Link
          href="/generate"
          className={buttonVariants({ variant: "accent", className: "w-full sm:w-auto" })}
        >
          <Sparkles className="size-4" /> New generation
        </Link>
      </div>

      {/* Bento layout: the credit balance is the one number people check
          most, so it gets a wide hero cell with a glow ring behind the
          number; generations count + plan sit stacked beside it. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          variant="standard"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
          }}
          className="group relative overflow-hidden p-6 sm:p-8 lg:col-span-2 hover:translate-y-0 hover:shadow-card"
        >
          {/* Ambient corner glow at rest — crossfades out for the cursor
              spotlight below once hovered. */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-0"
            aria-hidden="true"
          />
          {/* Cursor spotlight — same blurred-solid technique as the glow
              above (see globals.css: no gradient() anywhere in this system),
              just repositioned live from onMouseMove instead of pinned to a
              corner, so it reads as the same glow "picked up" and following
              the pointer rather than a second, different effect. */}
          <div
            className="pointer-events-none absolute size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-20"
            style={{ left: "var(--spot-x, 50%)", top: "var(--spot-y, 0%)" }}
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2 text-caption text-muted">
            <Zap className="size-3.5 text-accent-amber" aria-hidden="true" />
            Credits remaining
          </div>
          {/* The balance is the one number this card exists for, so it takes
              the amber outright rather than just an amber icon beside it. */}
          <p className="font-display relative mt-2 text-heading font-bold tracking-tight text-accent-amber sm:text-display">
            {formatCredits(creditBalance)}
          </p>
          {/* No monthly ceiling to draw a bar against: the balance is the
              only thing that limits a generation, so this month's spend is
              reported as a plain figure rather than a progress meter. */}
          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-2 text-caption text-muted">
            <span>{formatCredits(usage.creditsUsed)} used this month</span>
            {creditsExpiringSoon > 0 && (
              <span className="text-warning">
                {formatCredits(creditsExpiringSoon)} credits expire soon
              </span>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card variant="compact" className="flex-1">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent-hot/15">
              <TrendingUp className="size-4 text-accent-hot" aria-hidden="true" />
            </span>
            <p className="mt-3 text-caption text-muted">Generations this month</p>
            <p className="mt-1 text-subheading font-bold text-ink">{usage.generationsCount}</p>
            <p className="mt-1 text-caption text-muted">On the {tierInfo.label} plan</p>
          </Card>
          <Link
            href="/settings/billing"
            className="group flex flex-1 items-center gap-3 rounded-2xl border border-border-subtle bg-surface-2 p-6 transition-colors hover:border-border-strong hover:bg-surface-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-amber/15">
              <CreditCard className="size-4 text-accent-amber" aria-hidden="true" />
            </span>
            <span className="flex-1 text-label text-ink-soft">Manage plan &amp; billing</span>
            <ArrowUpRight
              className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink-soft"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>

      <Card variant="standard" className="hover:translate-y-0 hover:shadow-card">
        <h2 className="text-subheading font-semibold text-ink">Usage — last 30 days</h2>
        <div className="mt-6">
          <UsageChart data={dailyCounts} />
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-subheading font-semibold text-ink">Recent generations</h2>
          <Link href="/my-gallery" className="text-body-sm text-brand hover:text-brand-hover">
            View all
          </Link>
        </div>
        <div className="mt-6">
          {recentGenerations.length === 0 ? (
            <Card variant="standard" className="flex flex-col items-center gap-4 py-16 text-center">
              <Video className="size-8 text-muted" aria-hidden="true" />
              <div>
                <p className="text-body text-ink-soft">No generations yet</p>
                <p className="mt-1 text-body-sm text-muted">
                  Create your first video or image to see it here.
                </p>
              </div>
              <Link href="/generate" className={buttonVariants({ variant: "accent" })}>
                Generate your first video
              </Link>
            </Card>
          ) : (
            <GalleryGrid
              items={recentGenerations}
              author={{ name: user.name, avatarUrl: user.avatarUrl }}
              viewerIsOwner
            />
          )}
        </div>
      </div>
    </div>
  );
}
