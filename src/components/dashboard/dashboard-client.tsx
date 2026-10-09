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
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-3 text-heading font-light text-ink">
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
          most, so it gets the wide cell as a solid yellow block — the same
          "this one matters" treatment as comfy.org's highlighted card. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-brand p-6 text-on-brand sm:p-8 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] uppercase">
              <Zap className="size-3.5" aria-hidden="true" />
              Credits remaining
            </span>
            <Link
              href="/settings/billing"
              className="rounded-lg bg-on-brand px-3 py-2 text-[11px] font-bold tracking-[0.06em] text-brand uppercase transition-opacity hover:opacity-85"
            >
              Top up
            </Link>
          </div>
          <p className="font-narrow text-[3.5rem] leading-[0.9] font-semibold tracking-[-0.02em] tabular-nums sm:text-[5.5rem]">
            {formatCredits(creditBalance)}
          </p>
          {/* No monthly ceiling to draw a bar against: the balance is the
              only thing that limits a generation, so this month's spend is
              reported as a plain figure rather than a progress meter. */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-on-brand/15 pt-4 text-caption font-medium">
            <span>{formatCredits(usage.creditsUsed)} used this month</span>
            {creditsExpiringSoon > 0 && (
              <span className="rounded-md bg-on-brand/10 px-2 py-0.5">
                {formatCredits(creditsExpiringSoon)} credits expire soon
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card variant="compact" className="flex-1">
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
              <TrendingUp className="size-3.5 text-accent-hot-ink" aria-hidden="true" />
              Generations this month
            </span>
            <p className="mt-4 text-5xl leading-none font-light tracking-tight text-ink tabular-nums">
              {usage.generationsCount}
            </p>
            <p className="mt-3 text-caption text-muted">On the {tierInfo.label} plan</p>
          </Card>
          <Link
            href="/settings/billing"
            className="group flex flex-1 items-center gap-3 rounded-2xl border border-line bg-surface-2 p-6 transition-colors hover:border-brand/50 hover:bg-surface-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-amber/15">
              <CreditCard className="size-4 text-accent-amber-ink" aria-hidden="true" />
            </span>
            <span className="flex-1 text-label text-ink-soft">Manage plan &amp; billing</span>
            <ArrowUpRight
              className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>

      <Card variant="standard" className="hover:translate-y-0 hover:shadow-card">
        <h2 className="text-subheading font-light text-ink">Usage — last 30 days</h2>
        <div className="mt-6">
          <UsageChart data={dailyCounts} />
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-subheading font-light text-ink">Recent generations</h2>
          <Link href="/my-gallery" className={buttonVariants({ variant: "outline", size: "sm" })}>
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
