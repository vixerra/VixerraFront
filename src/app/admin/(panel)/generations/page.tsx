"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, XCircle } from "lucide-react";
import {
  useAdminGenerations,
  useRetryGeneration,
  useForceFailGeneration,
} from "@/hooks/use-admin-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChartCard, RankedBars } from "@/components/admin/charts";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  Td,
  Mono,
  StatusPill,
  Pagination,
  EmptyRow,
  LoadingBlock,
  ErrorBlock,
  ActionDialog,
  formatDate,
} from "@/components/admin/ui";

const LIMIT = 25;
const FILTERS = [
  { key: "problems", label: "Needs attention" },
  { key: "failed", label: "Failed" },
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "", label: "All" },
] as const;

export default function AdminGenerationsPage() {
  const [filter, setFilter] = useState<string>("problems");
  const [offset, setOffset] = useState(0);
  const retry = useRetryGeneration();
  const forceFail = useForceFailGeneration();

  const { data, isLoading, isError, error } = useAdminGenerations({
    problems: filter === "problems" ? "true" : undefined,
    status: filter && filter !== "problems" ? filter : undefined,
    limit: LIMIT,
    offset,
  });

  return (
    <div>
      <PageHeader
        title="Generations"
        subtitle="The job queue. Retry re-queues for the next tick; fail refunds the user."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count = data?.byStatus.find((s) => s.status === f.key)?.count;
          return (
            <button
              key={f.key || "all"}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setOffset(0);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption font-medium transition-colors",
                f.key === filter
                  ? "border-brand/40 bg-brand/15 text-brand"
                  : "border-line bg-surface-2 text-muted hover:border-border-strong hover:text-ink-soft",
              )}
            >
              {f.label}
              {count !== undefined && <span className="ml-1.5 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {data && data.failuresByModel.length > 0 && (
        <ChartCard
          title="Failures by model"
          hint="Last 7 days. Separates “we are broken” from “one provider is broken”."
          className="mb-4"
        >
          <RankedBars
            data={data.failuresByModel.map((m) => ({
              label: m.model.replace(/^[^/]+\//, ""),
              value: m.failed,
            }))}
            height={Math.max(140, data.failuresByModel.length * 34)}
          />
        </ChartCard>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message} />
      ) : (
        <Panel>
          <Table
            head={
              <>
                <Th>Model</Th>
                <Th>User</Th>
                <Th>Status</Th>
                <Th className="text-right">Cost</Th>
                <Th>Error</Th>
                <Th>Created</Th>
                <Th />
              </>
            }
          >
            {data!.generations.length === 0 ? (
              <EmptyRow colSpan={7}>Nothing here — that&apos;s the good outcome.</EmptyRow>
            ) : (
              data!.generations.map((g) => (
                <tr key={g.id} className="transition-colors hover:bg-white/[0.03]">
                  <Td>
                    <Mono className="text-ink-soft">{g.model}</Mono>
                    <Mono className="block opacity-60">{g.type}</Mono>
                  </Td>
                  <Td>
                    <Link href={`/admin/users/${g.userId}`} className="hover:underline">
                      <Mono>{g.userEmail}</Mono>
                    </Link>
                  </Td>
                  <Td>
                    <StatusPill status={g.status} />
                    {g.retryCount > 0 && (
                      <Mono className="mt-1 block">retried ×{g.retryCount}</Mono>
                    )}
                  </Td>
                  <Td className="text-right">{g.costCredits}</Td>
                  <Td className="max-w-56">
                    {g.errorCode ? (
                      <>
                        <Mono className="text-accent">{g.errorCode}</Mono>
                        <span className="mt-0.5 block truncate text-caption text-muted" title={g.errorMessage ?? ""}>
                          {g.errorMessage}
                        </span>
                      </>
                    ) : (
                      <Mono>—</Mono>
                    )}
                  </Td>
                  <Td>
                    <Mono>{formatDate(g.createdAt)}</Mono>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      {g.status !== "completed" && (
                        <ActionDialog
                          trigger={
                            <Button variant="secondary" size="sm" aria-label="Retry">
                              <RotateCcw className="size-3.5" aria-hidden="true" />
                            </Button>
                          }
                          title="Re-queue this generation"
                          description="Sets it back to pending so the next tick claims it. The user isn't charged again."
                          confirmLabel="Retry"
                          pending={retry.isPending}
                          onConfirm={(reason) => retry.mutateAsync({ id: g.id, reason })}
                        />
                      )}
                      {g.status !== "completed" && g.status !== "failed" && (
                        <ActionDialog
                          trigger={
                            <Button variant="secondary" size="sm" aria-label="Force fail">
                              <XCircle className="size-3.5 text-accent" aria-hidden="true" />
                            </Button>
                          }
                          title="Mark failed and refund"
                          description={`Ends the job and refunds ${g.costCredits} credits, using the same path the automatic sweeper uses.`}
                          confirmLabel="Fail and refund"
                          destructive
                          pending={forceFail.isPending}
                          onConfirm={(reason) => forceFail.mutateAsync({ id: g.id, reason })}
                        />
                      )}
                    </div>
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
