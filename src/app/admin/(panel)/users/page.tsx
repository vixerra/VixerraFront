"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, CircleAlert } from "lucide-react";
import {
  fetchAllRows,
  useAdminUsers,
  type AdminUserRow,
  type AdminUsersResponse,
} from "@/hooks/use-admin-data";
import { nextSort, useUrlFilters } from "@/hooks/use-url-filters";
import { useCsvExport } from "@/hooks/use-csv-export";
import { TIERS } from "@/lib/constants";
import type { CsvColumn } from "@/lib/csv";
import {
  ChipGroup,
  FilterBar,
  FilterSelect,
  RANGE_OPTIONS,
  ResultBar,
  SearchField,
} from "@/components/admin/filters";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  SortTh,
  Td,
  Mono,
  Pagination,
  EmptyRow,
  LoadingBlock,
  ErrorBlock,
  ClickableRow,
  CopyButton,
  TierPill,
  When,
} from "@/components/admin/ui";

const DEFAULTS = {
  q: "",
  tier: "",
  verified: "",
  joined: "",
  active: "",
  sort: "createdAt",
  dir: "desc",
};
const FILTER_KEYS = ["q", "tier", "verified", "joined", "active"] as const;

/** Where each column starts when first clicked: names A→Z, numbers and
 *  dates biggest/newest first. */
const FIRST_DIR: Record<string, "asc" | "desc"> = { name: "asc" };

const EXPORT_COLUMNS: CsvColumn<AdminUserRow>[] = [
  { header: "id", value: (u) => u.id },
  { header: "email", value: (u) => u.email },
  { header: "name", value: (u) => u.name },
  { header: "nickname", value: (u) => u.nickname },
  { header: "tier", value: (u) => u.tier },
  { header: "credit_balance", value: (u) => u.creditBalance },
  { header: "generations", value: (u) => u.generationCount },
  { header: "email_verified_at", value: (u) => u.emailVerifiedAt },
  { header: "created_at", value: (u) => u.createdAt },
  { header: "last_login_at", value: (u) => u.lastLoginAt },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, { limit: 25 });
  const csv = useCsvExport();

  const params = {
    q: filters.q || undefined,
    tier: filters.tier || undefined,
    verified: filters.verified || undefined,
    joined: filters.joined || undefined,
    active: filters.active || undefined,
    sort: filters.sort,
    dir: filters.dir,
  };
  const { data, isLoading, isError, error, isFetching, refetch } = useAdminUsers({
    ...params,
    limit,
    offset,
  });

  const counts = new Map((data?.tierCounts ?? []).map((t) => [t.tier, t.count]));
  const allCount = data?.tierCounts ? [...counts.values()].reduce((a, b) => a + b, 0) : undefined;
  const paidCount = data?.tierCounts
    ? [...counts.entries()].filter(([t]) => t !== "free").reduce((a, [, n]) => a + n, 0)
    : undefined;
  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);

  function sortBy(field: string) {
    update(nextSort(filters, field, FIRST_DIR[field] ?? "desc"));
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="Search, inspect, and adjust customer accounts." />

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Email, name, pen name or account id"
          label="Search users"
        />
        <FilterSelect
          label="Email"
          value={filters.verified}
          onChange={(verified) => update({ verified })}
          options={[
            { value: "", label: "Any" },
            { value: "true", label: "Verified" },
            { value: "false", label: "Unverified" },
          ]}
        />
        <FilterSelect
          label="Joined"
          value={filters.joined}
          onChange={(joined) => update({ joined })}
          options={RANGE_OPTIONS}
        />
        <FilterSelect
          label="Last sign-in"
          value={filters.active}
          onChange={(active) => update({ active })}
          options={[...RANGE_OPTIONS, { value: "never", label: "Never signed in" }]}
        />
      </FilterBar>

      <FilterBar>
        <ChipGroup
          label="Plan"
          value={filters.tier}
          onChange={(tier) => update({ tier })}
          options={[
            { value: "", label: "All plans", count: allCount },
            { value: "paid", label: "Paid", count: paidCount },
            ...TIERS.map((t) => ({ value: t, label: t, count: data?.tierCounts ? (counts.get(t) ?? 0) : undefined })),
          ]}
        />
      </FilterBar>

      <ResultBar
        total={data?.total}
        noun={data?.total === 1 ? "account" : "accounts"}
        fetching={isFetching && !isLoading}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => refetch()}
        exporting={csv.exporting}
        onExport={() =>
          csv.run(
            "users",
            () =>
              fetchAllRows<AdminUsersResponse, AdminUserRow>("/api/admin/users", params, (r) => ({
                rows: r.users,
                total: r.total,
              })),
            EXPORT_COLUMNS,
          )
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : isError || !data ? (
        <ErrorBlock message={(error as Error)?.message} />
      ) : (
        <Panel>
          <Table
            head={
              <>
                <SortTh field="name" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                  User
                </SortTh>
                <Th>Plan</Th>
                <SortTh
                  field="credits"
                  sort={filters.sort}
                  dir={filters.dir}
                  onSort={sortBy}
                  className="text-right"
                >
                  Credits
                </SortTh>
                <SortTh
                  field="generations"
                  sort={filters.sort}
                  dir={filters.dir}
                  onSort={sortBy}
                  className="text-right"
                >
                  Generations
                </SortTh>
                <SortTh field="createdAt" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                  Joined
                </SortTh>
                <SortTh field="lastLoginAt" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                  Last sign-in
                </SortTh>
              </>
            }
          >
            {data.users.length === 0 ? (
              <EmptyRow colSpan={6}>
                No users match.{" "}
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
              data.users.map((u) => {
                const href = `/admin/users/${u.id}`;
                return (
                  <ClickableRow
                    key={u.id}
                    onActivate={(e) =>
                      e.metaKey || e.ctrlKey ? window.open(href, "_blank") : router.push(href)
                    }
                  >
                    <Td>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <Link href={href} className="flex items-center gap-1.5 text-ink hover:underline">
                            <span className="truncate">{u.name}</span>
                            {u.emailVerifiedAt === null && (
                              <CircleAlert
                                className="size-3.5 shrink-0 text-warning"
                                aria-label="Email not verified"
                              />
                            )}
                            {u.emailVerifiedAt && (
                              <BadgeCheck
                                className="size-3.5 shrink-0 text-success/70"
                                aria-label="Email verified"
                              />
                            )}
                          </Link>
                          <span className="flex items-center gap-1">
                            <Mono className="truncate">{u.email}</Mono>
                            <CopyButton value={u.email} label="Copy email" className="size-5" />
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <TierPill tier={u.tier} />
                    </Td>
                    <Td className="text-right font-medium text-accent-amber tabular-nums">
                      {u.creditBalance.toLocaleString()}
                    </Td>
                    <Td className="text-right tabular-nums">{u.generationCount.toLocaleString()}</Td>
                    <Td>
                      <When value={u.createdAt} />
                    </Td>
                    <Td>
                      <When value={u.lastLoginAt} fallback="never" />
                    </Td>
                  </ClickableRow>
                );
              })
            )}
          </Table>
          <Pagination
            total={data.total}
            limit={limit}
            offset={offset}
            onOffset={(next) => update({ offset: next })}
            onLimit={(next) => update({ limit: next })}
          />
        </Panel>
      )}
    </div>
  );
}
