"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  fetchAllRows,
  useAdminCredits,
  type AdminCreditsResponse,
  type AdminGrant,
} from "@/hooks/use-admin-data";
import { nextSort, useUrlFilters } from "@/hooks/use-url-filters";
import { useCsvExport } from "@/hooks/use-csv-export";
import { CREDIT_VALUE_USD } from "@/lib/constants";
import type { CsvColumn } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { ChartCard, BreakdownDonut } from "@/components/admin/charts";
import {
  ChipGroup,
  FilterBar,
  FilterSelect,
  FilterToken,
  ResultBar,
  SearchField,
} from "@/components/admin/filters";
import {
  PageHeader, Panel, Table, Th, SortTh, Td, Mono, Pagination,
  EmptyRow, LoadingBlock, ErrorBlock, When, formatDate,
} from "@/components/admin/ui";

// Fixed per source so a colour means the same thing in every chart on the
// page — monthly is the plan allowance, recharge is money in, refund and
// admin_grant are credits nobody paid for.
const SOURCE_COLORS: Record<string, string> = {
  monthly: "#bbdc12",
  recharge: "#ffd400",
  refund: "#56a8e8",
  admin_grant: "#ff8f00",
};

const DEFAULTS = {
  q: "",
  source: "",
  state: "",
  userId: "",
  sort: "createdAt",
  dir: "desc",
};
const FILTER_KEYS = ["q", "source", "state", "userId"] as const;

const EXPORT_COLUMNS: CsvColumn<AdminGrant>[] = [
  { header: "id", value: (g) => g.id },
  { header: "created_at", value: (g) => g.createdAt },
  { header: "user_email", value: (g) => g.userEmail },
  { header: "user_id", value: (g) => g.userId },
  { header: "source", value: (g) => g.source },
  { header: "tier", value: (g) => g.tier },
  { header: "month", value: (g) => g.monthYear },
  { header: "amount", value: (g) => g.amount },
  { header: "remaining", value: (g) => g.remaining },
  { header: "expires_at", value: (g) => g.expiresAt },
];

/** Whether a grant can still be spent, for the row's state marker. */
function grantState(g: AdminGrant) {
  if (g.expiresAt && new Date(g.expiresAt).getTime() <= Date.now()) return "expired";
  if (g.remaining === 0) return "spent";
  return "active";
}

export default function AdminCreditsPage() {
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, { limit: 50 });
  const csv = useCsvExport();

  const params = {
    q: filters.q || undefined,
    source: filters.source || undefined,
    state: filters.state || undefined,
    userId: filters.userId || undefined,
    sort: filters.sort,
    dir: filters.dir,
  };
  const { data, isLoading, isError, error, isFetching, refetch } = useAdminCredits({
    ...params,
    limit,
    offset,
  });

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message} />;

  const { totals, bySource, grants, total } = data;
  const balanced = totals.drift === 0;
  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);
  const userEmail = filters.userId
    ? grants.find((g) => g.userId === filters.userId)?.userEmail
    : undefined;

  function sortBy(field: string) {
    // Expiry reads best soonest-first; amounts and dates largest/newest.
    update(nextSort(filters, field, field === "expiresAt" ? "asc" : "desc"));
  }

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
            a deduction that didn&apos;t land —{" "}
            <button
              type="button"
              onClick={() => update({ source: "refund", sort: "createdAt", dir: "desc" })}
              className="underline"
            >
              check the refund-sourced grants
            </button>
            .
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

        <ChartCard title="Outstanding by source" hint="What is still unspent — click one to list its grants">
          <div className="space-y-1">
            {bySource.map((s) => {
              const pct = s.amount ? Math.round((s.remaining / s.amount) * 100) : 0;
              const active = filters.source === s.source;
              return (
                <button
                  key={s.source}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ source: active ? null : s.source })}
                  className={cn(
                    "block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03]",
                    active && "bg-brand/10",
                  )}
                >
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
                </button>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Holder's email"
          label="Search grants by email"
        />
        <FilterSelect
          label="State"
          value={filters.state}
          onChange={(state) => update({ state })}
          options={[
            { value: "", label: "Any" },
            { value: "active", label: "Spendable" },
            { value: "depleted", label: "Fully spent" },
            { value: "expired", label: "Expired" },
          ]}
        />
      </FilterBar>

      <FilterBar>
        <ChipGroup
          label="Source"
          value={filters.source}
          onChange={(source) => update({ source })}
          options={[
            { value: "", label: "All sources", count: bySource.reduce((n, s) => n + s.grants, 0) },
            ...bySource.map((s) => ({ value: s.source, label: s.source.replace("_", " "), count: s.grants })),
          ]}
        />
        {filters.userId && (
          <FilterToken
            label="Account"
            value={userEmail ?? filters.userId}
            onRemove={() => update({ userId: null })}
          />
        )}
      </FilterBar>

      <ResultBar
        total={total}
        noun={total === 1 ? "grant" : "grants"}
        fetching={isFetching}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => refetch()}
        exporting={csv.exporting}
        onExport={() =>
          csv.run(
            "credit-grants",
            () =>
              fetchAllRows<AdminCreditsResponse, AdminGrant>("/api/admin/credits", params, (r) => ({
                rows: r.grants,
                total: r.total,
              })),
            EXPORT_COLUMNS,
          )
        }
      />

      <Panel>
        <Table
          head={
            <>
              <Th>User</Th>
              <Th>Source</Th>
              <Th>Tier</Th>
              <SortTh field="amount" sort={filters.sort} dir={filters.dir} onSort={sortBy} className="text-right">
                Amount
              </SortTh>
              <SortTh field="remaining" sort={filters.sort} dir={filters.dir} onSort={sortBy} className="text-right">
                Remaining
              </SortTh>
              <SortTh field="expiresAt" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                Expires
              </SortTh>
              <SortTh field="createdAt" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                Created
              </SortTh>
            </>
          }
        >
          {grants.length === 0 ? (
            <EmptyRow colSpan={7}>
              {filtered ? "No grants match." : "No grants yet."}{" "}
              {filtered && (
                <button
                  type="button"
                  onClick={() => reset([...FILTER_KEYS])}
                  className="text-brand hover:underline"
                >
                  Clear filters
                </button>
              )}
            </EmptyRow>
          ) : (
            grants.map((g) => {
              const state = grantState(g);
              return (
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
                  <Td className="text-right tabular-nums">{g.amount.toLocaleString()}</Td>
                  <Td
                    className={cn(
                      "text-right tabular-nums",
                      state === "active" ? "text-accent-amber" : "text-muted",
                    )}
                  >
                    {g.remaining.toLocaleString()}
                    {state === "expired" && g.remaining > 0 && (
                      <Mono className="block">expired</Mono>
                    )}
                  </Td>
                  <Td>
                    <Mono className={cn(state === "expired" && "line-through opacity-60")}>
                      {g.expiresAt ? formatDate(g.expiresAt) : "never"}
                    </Mono>
                  </Td>
                  <Td>
                    <When value={g.createdAt} />
                  </Td>
                </tr>
              );
            })
          )}
        </Table>
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          onOffset={(next) => update({ offset: next })}
          onLimit={(next) => update({ limit: next })}
        />
      </Panel>
    </div>
  );
}
