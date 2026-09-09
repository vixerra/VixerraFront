"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAdminUsers } from "@/hooks/use-admin-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { TIERS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  Td,
  Mono,
  Pagination,
  EmptyRow,
  LoadingBlock,
  ErrorBlock,
  formatDate,
} from "@/components/admin/ui";

const LIMIT = 25;

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<string>("");
  const [offset, setOffset] = useState(0);
  // Typing shouldn't fire a query per keystroke against a LIKE scan.
  const debouncedQ = useDebouncedValue(q, 300);

  const { data, isLoading, isError, error } = useAdminUsers({
    q: debouncedQ || undefined,
    tier: tier || undefined,
    limit: LIMIT,
    offset,
  });

  return (
    <div>
      <PageHeader title="Users" subtitle="Search, inspect, and adjust customer accounts." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOffset(0);
            }}
            placeholder="Search email or name"
            aria-label="Search users"
            className="w-full rounded-xl border border-line bg-surface-dark py-2 pr-3 pl-9 text-body-sm text-ink-soft placeholder:text-muted focus:border-border-strong focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["", ...TIERS].map((t) => (
            <button
              key={t || "all"}
              type="button"
              onClick={() => {
                setTier(t);
                setOffset(0);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption font-medium transition-colors",
                t === tier
                  ? "border-brand/40 bg-brand/15 text-brand"
                  : "border-line bg-surface-2 text-muted hover:border-border-strong hover:text-ink-soft",
              )}
            >
              {t || "All"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message} />
      ) : (
        <Panel>
          <Table
            head={
              <>
                <Th>User</Th>
                <Th>Tier</Th>
                <Th className="text-right">Credits</Th>
                <Th className="text-right">Generations</Th>
                <Th>Joined</Th>
                <Th>Last login</Th>
              </>
            }
          >
            {data!.users.length === 0 ? (
              <EmptyRow colSpan={6}>No users match that filter.</EmptyRow>
            ) : (
              data!.users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-white/[0.03]">
                  <Td>
                    <Link href={`/admin/users/${u.id}`} className="block">
                      <span className="text-ink hover:underline">{u.name}</span>
                      <Mono className="block">{u.email}</Mono>
                    </Link>
                  </Td>
                  <Td>
                    <span className="rounded-full border border-line bg-white/5 px-2 py-0.5 text-caption capitalize">
                      {u.tier}
                    </span>
                  </Td>
                  <Td className="text-right font-medium text-accent-amber">
                    {u.creditBalance.toLocaleString()}
                  </Td>
                  <Td className="text-right">{u.generationCount}</Td>
                  <Td>
                    <Mono>{formatDate(u.createdAt)}</Mono>
                  </Td>
                  <Td>
                    <Mono>{formatDate(u.lastLoginAt)}</Mono>
                  </Td>
                </tr>
              ))
            )}
          </Table>
          <Pagination total={data!.total} limit={LIMIT} offset={offset} onOffset={setOffset} />
        </Panel>
      )}
    </div>
  );
}
