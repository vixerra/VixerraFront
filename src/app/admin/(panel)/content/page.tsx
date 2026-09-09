"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Heart, Eye } from "lucide-react";
import { useAdminContent, useUnpublish } from "@/hooks/use-admin-data";
import { Button } from "@/components/ui/button";
import {
  PageHeader, Panel, Pagination, LoadingBlock, ErrorBlock, Mono, ActionDialog, formatDate,
} from "@/components/admin/ui";

const LIMIT = 24;

export default function AdminContentPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useAdminContent({ limit: LIMIT, offset });
  const unpublish = useUnpublish();

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message} />;

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Public gallery only — private generations are the user's own business and aren't listed."
      />

      {data.items.length === 0 ? (
        <Panel className="p-12 text-center">
          <p className="text-body-sm text-muted">Nothing is shared publicly right now.</p>
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
                  <p className="line-clamp-2 text-caption text-ink-soft" title={item.prompt}>
                    {item.prompt}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-caption text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" aria-hidden="true" /> {item.viewCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="size-3" aria-hidden="true" /> {item.likeCount}
                    </span>
                    <Mono>{formatDate(item.createdAt)}</Mono>
                  </div>

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

                  <div className="mt-auto pt-1">
                    <ActionDialog
                      trigger={
                        <Button variant="secondary" size="sm" className="w-full">
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Panel className="mt-4">
            <Pagination total={data.total} limit={LIMIT} offset={offset} onOffset={setOffset} />
          </Panel>
        </>
      )}
    </div>
  );
}
