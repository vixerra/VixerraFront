"use client";

import Link from "next/link";
import { EyeOff, Heart, Eye, ExternalLink } from "lucide-react";
import { useAdminContent, useUnpublish } from "@/hooks/use-admin-data";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { Button } from "@/components/ui/button";
import {
  ChipGroup,
  FilterBar,
  FilterSelect,
  RANGE_OPTIONS,
  ResultBar,
  SearchField,
} from "@/components/admin/filters";
import {
  PageHeader, Panel, Pagination, LoadingBlock, ErrorBlock, Mono, ActionDialog, CopyButton, When,
} from "@/components/admin/ui";

const DEFAULTS = { q: "", kind: "", range: "", sort: "newest" };
const FILTER_KEYS = ["q", "kind", "range"] as const;

export default function AdminContentPage() {
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, { limit: 24, maxLimit: 60 });
  const { data, isLoading, isError, error, isFetching, refetch } = useAdminContent({
    q: filters.q || undefined,
    kind: filters.kind || undefined,
    range: filters.range || undefined,
    sort: filters.sort,
    limit,
    offset,
  });
  const unpublish = useUnpublish();
  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Public gallery only — private generations are the user's own business and aren't listed."
      />

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Prompt, model, author email or pen name"
          label="Search public content"
        />
        <FilterSelect
          label="Shared"
          value={filters.range}
          onChange={(range) => update({ range })}
          options={RANGE_OPTIONS}
        />
        <FilterSelect
          label="Sort"
          value={filters.sort}
          defaultValue="newest"
          onChange={(sort) => update({ sort })}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "views", label: "Most viewed" },
            { value: "likes", label: "Most liked" },
          ]}
        />
      </FilterBar>

      <FilterBar>
        <ChipGroup
          label="Kind"
          value={filters.kind}
          onChange={(kind) => update({ kind })}
          options={[
            { value: "", label: "Everything" },
            { value: "video", label: "Videos" },
            { value: "image", label: "Images" },
          ]}
        />
      </FilterBar>

      <ResultBar
        total={data?.total}
        noun={data?.total === 1 ? "public item" : "public items"}
        fetching={isFetching && !isLoading}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => refetch()}
      />

      {isLoading ? (
        <LoadingBlock />
      ) : isError || !data ? (
        <ErrorBlock message={(error as Error)?.message} />
      ) : data.items.length === 0 ? (
        <Panel className="p-12 text-center">
          <p className="text-body-sm text-muted">
            {filtered ? "Nothing public matches these filters." : "Nothing is shared publicly right now."}
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-2"
              >
                <div className="relative aspect-video bg-surface-3">
                  {item.resultUrl ? (
                    item.type === "text-to-image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.resultUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video
                        src={item.resultUrl}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        controls
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-caption text-muted">
                      No preview
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2.5 p-4">
                  <div className="flex items-start gap-1">
                    <p className="line-clamp-2 flex-1 text-caption text-ink-soft" title={item.prompt}>
                      {item.prompt}
                    </p>
                    <CopyButton value={item.prompt} label="Copy prompt" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-caption text-muted">
                    <span className="inline-flex items-center gap-1" title="Views">
                      <Eye className="size-3" aria-hidden="true" /> {item.viewCount.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1" title="Likes">
                      <Heart className="size-3" aria-hidden="true" /> {item.likeCount.toLocaleString()}
                    </span>
                    <When value={item.createdAt} />
                  </div>

                  <Mono className="truncate" title={item.model}>
                    {item.model}
                  </Mono>

                  {/* Who actually posted it. shareAsNickname means the gallery
                      shows a pen name — an operator still needs the real
                      account to act on repeat offenders. */}
                  <Link
                    href={`/admin/users/${item.userId}`}
                    className="text-caption text-muted hover:text-ink-soft hover:underline"
                  >
                    <Mono>{item.userEmail}</Mono>
                    {item.shareAsNickname && item.nickname && (
                      <span className="ml-1.5 opacity-70">(shown as “{item.nickname}”)</span>
                    )}
                  </Link>

                  <div className="mt-auto flex gap-2 pt-1">
                    <ActionDialog
                      trigger={
                        <Button variant="secondary" size="sm" className="flex-1">
                          <EyeOff className="size-3.5" aria-hidden="true" />
                          Remove from gallery
                        </Button>
                      }
                      title="Remove from public gallery"
                      description="Sets isPublic to false. The generation itself is kept — the user made it and paid for it, so this hides it rather than destroying it."
                      confirmLabel="Unpublish"
                      destructive
                      pending={unpublish.isPending}
                      onConfirm={(reason) => unpublish.mutateAsync({ id: item.id, reason })}
                    />
                    <Link
                      href={`/admin/generations?status=all&open=${item.id}`}
                      aria-label="Open the generation's details"
                      title="Generation details"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-border-strong hover:text-ink-soft"
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                    </Link>
                    <a
                      href={`/gallery/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open on the public gallery"
                      title="Public page"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-border-strong hover:text-ink-soft"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Panel className="mt-4">
            <Pagination
              total={data.total}
              limit={limit}
              offset={offset}
              onOffset={(next) => update({ offset: next })}
              onLimit={(next) => update({ limit: next })}
              pageSizes={[12, 24, 48, 60]}
            />
          </Panel>
        </>
      )}
    </div>
  );
}
