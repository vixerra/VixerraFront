"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAdminCredits } from "@/hooks/use-admin-data";
import { CREDIT_VALUE_USD } from "@/lib/constants";
import { ChartCard, BreakdownDonut } from "@/components/admin/charts";
import {
  PageHeader, Panel, Table, Th, Td, Mono, Pagination,
  EmptyRow, LoadingBlock, ErrorBlock, formatDate,
} from "@/components/admin/ui";

const LIMIT = 50;

// Fixed per source so a colour means the same thing in every chart on the
// page — monthly is the plan allowance, recharge is money in, refund and
// admin_grant are credits nobody paid for.
const SOURCE_COLORS: Record<string, string> = {
  monthly: "#bbdc12",
  recharge: "#ffd400",
  refund: "#56a8e8",
  admin_grant: "#ff8f00",
};

export default function AdminCreditsPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useAdminCredits({ limit: LIMIT, offset });

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message} />;

  const { totals, bySource, grants, total } = data;
  const balanced = totals.drift === 0;

  return (
    <div>
      <PageHeader
        title="Credits"
        subtitle="Every grant ever issued, and whether the ledger still adds up."
      />

      {/* The reconciliation check. granted and spent come from two independent
          tables, so a non-zero drift means one of them lost track — this is
          the only place in the product that would notice. */}
      <div
        className={`mb-6 rounded-2xl border p-5 ${
          balanced ? "border-line bg-surface-2" : "border-accent/40 bg-accent/10"
        }`}
      >
        <p className="flex items-center gap-2 text-label font-medium text-ink-soft">
          {balanced ? (
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-4 text-accent" aria-hidden="true" />
          )}
          Reconciliation
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Granted", value: totals.granted, note: "All CreditGrant.amount" },
            { label: "Remaining", value: totals.remaining, note: "Unspent balance" },
            { label: "Spent", value: totals.spent, note: "Non-failed generations" },
            {
              label: "Drift",
              value: totals.drift,
              note: balanced ? "Ledger balances" : "granted − remaining − spent",
            },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-caption tracking-wide text-muted uppercase">{s.label}</p>
              <p
                className={`font-display mt-1 text-subheading font-bold ${
                  s.label === "Drift" && !balanced ? "text-accent" : "text-ink"
                }`}
              >
                {s.value.toLocaleString()}
              </p>
              <p className="text-caption text-muted">{s.note}</p>
            </div>
          ))}
        </div>
        {!balanced && (
          <p className="mt-4 text-body-sm text-accent">
            The two records disagree by {Math.abs(totals.drift).toLocaleString()} credits
            (≈${(Math.abs(totals.drift) * CREDIT_VALUE_USD).toFixed(2)}). Likely a double refund or
            a deduction that didn&apos;t land — check the refund-sourced grants below.
          </p>
        )}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Where credits come from" hint="Total granted, split by source">
          <BreakdownDonut
            data={bySource.map((s) => ({ name: s.source, value: s.amount }))}
            total={totals.granted}
            totalLabel="granted"
            colors={SOURCE_COLORS}
          />
        </ChartCard>

        <ChartCard title="Outstanding by source" hint="What is still unspent">
          <div className="space-y-3">
            {bySource.map((s) => {
              const pct = s.amount ? Math.round((s.remaining / s.amount) * 100) : 0;
              return (
                <div key={s.source}>
                  <div className="mb-1 flex items-center justify-between text-caption">
                    <span className="font-mono text-brand">{s.source}</span>
                    <span className="text-muted">
                      {s.remaining.toLocaleString()} / {s.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${pct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <Panel>
        <Table
          head={
            <>
              <Th>User</Th>
              <Th>Source</Th>
              <Th>Tier</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Remaining</Th>
              <Th>Expires</Th>
              <Th>Created</Th>
            </>
          }
        >
          {grants.length === 0 ? (
            <EmptyRow colSpan={7}>No grants yet.</EmptyRow>
          ) : (
            grants.map((g) => (
              <tr key={g.id} className="transition-colors hover:bg-white/[0.03]">
                <Td>
                  <Link href={`/admin/users/${g.userId}`} className="hover:underline">
                    <Mono>{g.userEmail}</Mono>
                  </Link>
                </Td>
                <Td>
                  <span className="rounded-full border border-line bg-white/5 px-2 py-0.5 font-mono text-caption">
                    {g.source}
                  </span>
                </Td>
                <Td className="capitalize">{g.tier}</Td>
                <Td className="text-right">{g.amount.toLocaleString()}</Td>
                <Td className="text-right text-accent-amber">{g.remaining.toLocaleString()}</Td>
                <Td><Mono>{g.expiresAt ? formatDate(g.expiresAt) : "never"}</Mono></Td>
                <Td><Mono>{formatDate(g.createdAt)}</Mono></Td>
              </tr>
            ))
          )}
        </Table>
        <Pagination total={total} limit={LIMIT} offset={offset} onOffset={setOffset} />
      </Panel>
    </div>
  );
}
