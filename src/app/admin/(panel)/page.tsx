"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Info,
  Mail,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useAdminStats } from "@/hooks/use-admin";
import { Card } from "@/components/ui/card";
import { useSpotlight } from "@/hooks/use-spotlight";
import { cn } from "@/lib/utils";
import { CREDIT_VALUE_USD } from "@/lib/constants";
import { LoadingBlock, ErrorBlock } from "@/components/admin/ui";
import { ChartCard, TrendChart, BreakdownDonut, RankedBars } from "@/components/admin/charts";

/** Compact metric tile — the same rounded-card, uppercase-caption, big-display
 *  -number rhythm the customer dashboard uses for its secondary stats. */
function Stat({
  label,
  value,
  sub,
  icon,
  tone = "default",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  tone?: "default" | "warn" | "alert" | "amber";
  href?: string;
}) {
  const body = (
    <Card
      variant="standard"
      className={cn(
        "h-full p-5 shadow-card hover:translate-y-0",
        tone === "alert" && "border-accent/40",
        tone === "warn" && "border-warning/40",
        href && "transition-colors hover:border-border-strong",
      )}
    >
      <div className="flex items-center gap-2 text-caption text-muted">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          "font-display mt-2 text-heading font-bold tracking-tight",
          tone === "alert" ? "text-accent" : tone === "amber" ? "text-accent-amber" : "text-ink",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-caption text-muted">{sub}</p>}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading, isError, error } = useAdminStats();
  const spotlight = useSpotlight<HTMLDivElement>();

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message} />;

  const paidPct = data.totalUsers ? Math.round((data.paidUsers / data.totalUsers) * 100) : 0;
  const failRate = data.generations24h
    ? Math.round((data.failed24h / data.generations24h) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-heading font-bold tracking-tight text-ink">Overview</h1>
        <p className="mt-2 text-body-sm text-muted">
          Live counts straight from the database — no sampling, no cache.
        </p>
      </div>

      {/* Hero row: the two numbers worth checking first — how much work is
          flowing through, and whether any of it is on fire. Same bento shape
          and spotlight treatment as the customer dashboard's credit card. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          {...spotlight}
          variant="standard"
          className="group relative overflow-hidden p-6 shadow-card hover:translate-y-0 lg:col-span-2 sm:p-8"
        >
          <div
            className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-0"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-20"
            style={{ left: "var(--spot-x, 50%)", top: "var(--spot-y, 0%)" }}
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2 text-caption text-muted">
            <Activity className="size-3.5 text-brand" aria-hidden="true" />
            Generations · last 30 days
          </div>
          <p className="font-display relative mt-2 text-heading font-bold tracking-tight text-ink sm:text-display">
            {data.generationSeries.reduce((n, d) => n + d.count, 0).toLocaleString()}
          </p>
          <p className="relative mt-1 text-body-sm text-muted">
            {data.generations24h} in the last 24h · {data.inFlight} in flight
          </p>
          <div className="relative mt-4">
            <TrendChart data={data.generationSeries} showFailed height={180} />
          </div>
          <p className="relative mt-1 flex items-center gap-3 text-caption text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand" aria-hidden="true" /> total
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-accent" aria-hidden="true" /> failed
            </span>
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Stat
            label="Failed · 24h"
            value={data.failed24h}
            sub={data.generations24h ? `${failRate}% of today's jobs` : "No jobs today"}
            icon={<AlertTriangle className="size-3.5" aria-hidden="true" />}
            tone={data.failed24h > 0 ? "alert" : "default"}
            href="/admin/generations"
          />
          <Stat
            label="In flight"
            value={data.inFlight}
            sub="pending, queued or processing"
            icon={<Activity className="size-3.5" aria-hidden="true" />}
            tone={data.inFlight > 20 ? "warn" : "default"}
            href="/admin/generations"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total users"
          value={data.totalUsers}
          sub={`${data.newUsers7d} joined this week`}
          icon={<Users className="size-3.5" aria-hidden="true" />}
          href="/admin/users"
        />
        <Stat
          label="Paid users"
          value={data.paidUsers}
          sub={`${paidPct}% of accounts`}
          icon={<TrendingUp className="size-3.5" aria-hidden="true" />}
          href="/admin/users"
        />
        <Stat
          label="Credits spent · 30d"
          value={data.creditsSpent30d.toLocaleString()}
          sub={`≈$${(data.creditsSpent30d * CREDIT_VALUE_USD).toFixed(2)} of value`}
          icon={<Zap className="size-3.5 text-accent-amber" aria-hidden="true" />}
          tone="amber"
          href="/admin/credits"
        />
        <Stat
          label="Unread messages"
          value={data.unreadMessages}
          sub="From the contact form"
          icon={<Mail className="size-3.5" aria-hidden="true" />}
          tone={data.unreadMessages > 0 ? "warn" : "default"}
          href="/admin/support"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Signups" hint="New accounts per day, last 30 days">
          <TrendChart data={data.signupSeries} color="#56a8e8" height={200} />
        </ChartCard>

        <ChartCard title="Credit burn" hint="Credits spent per day on successful generations">
          <TrendChart data={data.creditSeries} color="#ffd400" height={200} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Job outcomes" hint="Every generation ever recorded, by status">
          <BreakdownDonut
            data={data.byStatus.map((s) => ({ name: s.status, value: s.count }))}
            total={data.totalGenerations}
            totalLabel="generations"
          />
        </ChartCard>

        <ChartCard title="Accounts by plan" hint="Where the user base actually sits">
          <RankedBars
            data={[...data.tierSplit]
              .sort((a, b) => b.count - a.count)
              .map((t) => ({ label: t.tier, value: t.count }))}
            color="#bbdc12"
            height={200}
          />
        </ChartCard>
      </div>

      {/* Stated rather than quietly omitted: an operator looking for revenue
          needs to know why it isn't here, otherwise the absence reads as a
          bug in the dashboard. */}
      <Card variant="standard" className="space-y-3 p-5 shadow-card hover:translate-y-0">
        <p className="flex items-center gap-2 text-label font-medium text-ink-soft">
          <Info className="size-4 text-muted" aria-hidden="true" />
          Not charted yet, on purpose
        </p>
        <ul className="space-y-2 text-body-sm text-muted">
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-1 size-3.5 shrink-0 text-warning" aria-hidden="true" />
            <span>
              <strong className="text-ink-soft">Revenue.</strong> Payments are simulated in this
              build, so any figure would be invented rather than measured.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-1 size-3.5 shrink-0 text-warning" aria-hidden="true" />
            <span>
              <strong className="text-ink-soft">Margin.</strong> <code>Generation</code> has no
              provider-cost column, so cost can only be re-derived from the same estimate that set
              the price — which can never reveal that the estimate is wrong.
            </span>
          </li>
        </ul>
        <Link
          href="/admin/generations"
          className="inline-flex items-center gap-1.5 text-body-sm text-brand hover:underline"
        >
          Review the queue instead
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </Card>
    </div>
  );
}
