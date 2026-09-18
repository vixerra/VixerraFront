"use client";

import Link from "next/link";
import { Mail, MailOpen, Reply, UserRound } from "lucide-react";
import { useAdminSupport, useMarkMessageRead } from "@/hooks/use-admin-data";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ChipGroup,
  FilterBar,
  FilterSelect,
  ResultBar,
  SearchField,
} from "@/components/admin/filters";
import {
  PageHeader, Panel, Pagination, LoadingBlock, ErrorBlock, Mono, CopyButton, TierPill, When,
} from "@/components/admin/ui";

const DEFAULTS = { q: "", status: "", sort: "queue" };
const FILTER_KEYS = ["q", "status"] as const;

export default function AdminSupportPage() {
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, { limit: 25, maxLimit: 60 });
  const { data, isLoading, isError, error, isFetching, refetch } = useAdminSupport({
    q: filters.q || undefined,
    status: filters.status || undefined,
    sort: filters.sort,
    limit,
    offset,
  });
  const markRead = useMarkMessageRead();
  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle={
          !data
            ? "Messages from the contact form land here."
            : data.unread > 0
              ? `${data.unread.toLocaleString()} unread.`
              : "Inbox zero — every message has been read."
        }
      />

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Sender name, email or message text"
          label="Search messages"
        />
        <FilterSelect
          label="Order"
          value={filters.sort}
          defaultValue="queue"
          onChange={(sort) => update({ sort })}
          options={[
            { value: "queue", label: "Unread first" },
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
          ]}
        />
      </FilterBar>

      <FilterBar>
        <ChipGroup
          label="Status"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={[
            { value: "", label: "All", count: data?.counts?.all },
            { value: "unread", label: "Unread", count: data?.counts?.unread, alert: true },
            { value: "read", label: "Read", count: data?.counts?.read },
          ]}
        />
      </FilterBar>

      <ResultBar
        total={data?.total}
        noun={data?.total === 1 ? "message" : "messages"}
        fetching={isFetching && !isLoading}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => refetch()}
      />

      {isLoading ? (
        <LoadingBlock />
      ) : isError || !data ? (
        <ErrorBlock message={(error as Error)?.message} />
      ) : data.messages.length === 0 ? (
        <Panel className="p-12 text-center">
          <p className="text-body-sm text-muted">
            {filtered
              ? "No messages match these filters."
              : "No messages yet. The contact form writes here — before this page existed, nothing read the table at all."}
          </p>
        </Panel>
      ) : (
        <Panel>
          {/* The left border is the scan cue for unread, so an operator can
              see the queue depth without reading. */}
          <ul className="divide-y divide-line">
            {data.messages.map((m) => (
              <li
                key={m.id}
                className={`border-l-2 p-4 ${m.readAt ? "border-l-transparent" : "border-l-brand bg-brand/[0.03]"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm font-medium text-ink">
                      {m.name}
                      <span className="inline-flex items-center">
                        <Mono>{m.email}</Mono>
                        <CopyButton value={m.email} label="Copy email" className="size-5" />
                      </span>
                      {/* The sender's account, when their address has one —
                          whether it's a paying customer changes the reply. */}
                      {m.userId && (
                        <Link
                          href={`/admin/users/${m.userId}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line py-0.5 pr-1 pl-2 text-caption font-normal text-muted transition-colors hover:border-border-strong hover:text-ink-soft"
                        >
                          <UserRound className="size-3" aria-hidden="true" />
                          Customer
                          {m.userTier && <TierPill tier={m.userTier} />}
                        </Link>
                      )}
                    </p>
                    <When value={m.createdAt} />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`mailto:${m.email}`}
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      <Reply className="size-3.5" aria-hidden="true" />
                      Reply by email
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={markRead.isPending && markRead.variables?.id === m.id}
                      onClick={() => markRead.mutate({ id: m.id, read: !m.readAt })}
                    >
                      {m.readAt ? (
                        <><Mail className="size-3.5" aria-hidden="true" /> Mark unread</>
                      ) : (
                        <><MailOpen className="size-3.5" aria-hidden="true" /> Mark read</>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-body-sm whitespace-pre-wrap text-ink-soft">{m.message}</p>
              </li>
            ))}
          </ul>
          <Pagination
            total={data.total}
            limit={limit}
            offset={offset}
            onOffset={(next) => update({ offset: next })}
            onLimit={(next) => update({ limit: next })}
            pageSizes={[10, 25, 50]}
          />
        </Panel>
      )}
    </div>
  );
}
