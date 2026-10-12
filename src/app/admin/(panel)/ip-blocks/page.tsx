"use client";

import Link from "next/link";
import { Plus, ShieldOff, Trash2 } from "lucide-react";
import { useAdminIpBlocks } from "@/hooks/use-admin-data";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BlockIpDialog, UnblockIpDialog } from "@/components/admin/ip-block-dialogs";
import { ChipGroup, FilterBar, ResultBar, SearchField } from "@/components/admin/filters";
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
  CopyButton,
  When,
  formatDate,
} from "@/components/admin/ui";

/**
 * IP blocks: addresses and ranges shut out of the app. A blocked visitor gets
 * a 403 on every API call, signed in or not; this panel is the one thing
 * that stays reachable, so a block can always be lifted. Blocks are also
 * made from a user's page, which lists every address the account was seen at.
 */

const DEFAULTS = { q: "", status: "active" };
const FILTER_KEYS = ["q", "status"] as const;

export default function AdminIpBlocksPage() {
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, { limit: 50 });
  const { data, isLoading, isError, error, isFetching, refetch } = useAdminIpBlocks({
    q: filters.q || undefined,
    status: filters.status || undefined,
    limit,
    offset,
  });

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message} />;

  const { blocks, total, yourIp } = data;
  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);

  return (
    <div>
      <PageHeader
        title="IP blocks"
        subtitle="Addresses and ranges refused by the app. This panel stays reachable from them."
        actions={
          <BlockIpDialog
            yourIp={yourIp}
            trigger={
              <Button size="sm">
                <Plus className="size-4" aria-hidden="true" />
                Block an address
              </Button>
            }
          />
        }
      />

      {yourIp && (
        <p className="-mt-3 mb-5 flex items-center gap-1 text-caption text-muted">
          Your address: <Mono className="text-ink-soft">{yourIp}</Mono>
          <CopyButton value={yourIp} label="Copy your address" />
        </p>
      )}

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Address, range, reason or email"
          label="Search IP blocks"
        />
        <ChipGroup
          label="Status"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={[
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
            { value: "", label: "All" },
          ]}
        />
      </FilterBar>

      <ResultBar
        total={total}
        noun={total === 1 ? "block" : "blocks"}
        fetching={isFetching}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => refetch()}
      />

      <Panel>
        <Table
          head={
            <>
              <Th>Address</Th>
              <Th>Reason</Th>
              <Th className="text-right">Accounts</Th>
              <Th>Blocked from</Th>
              <Th>Expires</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </>
          }
        >
          {blocks.length === 0 ? (
            <EmptyRow colSpan={7}>
              {filtered || filters.status !== "active"
                ? "No blocks match."
                : "Nothing is blocked. Block an address here, or from a user's page."}
            </EmptyRow>
          ) : (
            blocks.map((b) => (
              <tr key={b.id} className={cn(!b.active && "opacity-60")}>
                <Td>
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-body-sm font-semibold text-ink">{b.address}</span>
                    <CopyButton value={b.address} label="Copy address" />
                  </span>
                  {b.address === yourIp && <Mono className="block text-warning">your address</Mono>}
                </Td>
                <Td>
                  <span className="line-clamp-2 max-w-72" title={b.reason}>
                    {b.reason}
                  </span>
                </Td>
                <Td className="text-right tabular-nums">
                  {b.accounts > 0 ? (
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(b.address)}`}
                      className="text-brand-ink hover:underline"
                      title="Accounts seen at this address"
                    >
                      {b.accounts.toLocaleString()}
                    </Link>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </Td>
                <Td>
                  {b.userId ? (
                    <Link href={`/admin/users/${b.userId}`} className="hover:underline">
                      <Mono>{b.userEmail ?? b.userId}</Mono>
                    </Link>
                  ) : (
                    <Mono>—</Mono>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {!b.active ? (
                    <Mono title={formatDate(b.expiresAt)}>expired</Mono>
                  ) : (
                    <Mono>{b.expiresAt ? formatDate(b.expiresAt) : "never"}</Mono>
                  )}
                </Td>
                <Td>
                  <When value={b.createdAt} />
                  <Mono className="block">{b.blockedByEmail}</Mono>
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <UnblockIpDialog
                    blockId={b.id}
                    address={b.address}
                    expired={!b.active}
                    trigger={
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`${b.active ? "Unblock" : "Remove"} ${b.address}`}
                        title={b.active ? "Unblock" : "Remove"}
                      >
                        {b.active ? (
                          <ShieldOff className="size-3.5" aria-hidden="true" />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        )}
                      </Button>
                    }
                  />
                </Td>
              </tr>
            ))
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
