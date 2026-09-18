"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, XCircle } from "lucide-react";
import {
  fetchAllRows,
  useAdminGenerations,
  useBulkGenerationAction,
  useRetryGeneration,
  useForceFailGeneration,
  type AdminGenerationRow,
  type AdminGenerationsResponse,
} from "@/hooks/use-admin-data";
import { nextSort, useUrlFilters } from "@/hooks/use-url-filters";
import { useCsvExport } from "@/hooks/use-csv-export";
import { useToast } from "@/components/ui/toast";
import { GENERATION_TYPES } from "@/lib/constants";
import type { CsvColumn } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChartCard, RankedBars } from "@/components/admin/charts";
import { GenerationDrawer } from "@/components/admin/generation-drawer";
import {
  ChipGroup,
  FilterBar,
  FilterSelect,
  FilterToken,
  RANGE_OPTIONS,
  ResultBar,
  SearchField,
  ToolbarButton,
} from "@/components/admin/filters";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  SortTh,
  Td,
  Mono,
  StatusPill,
  Pagination,
  EmptyRow,
  LoadingBlock,
  ErrorBlock,
  ActionDialog,
  Checkbox,
  ClickableRow,
  When,
} from "@/components/admin/ui";

const DEFAULTS = {
  q: "",
  status: "problems",
  model: "",
  type: "",
  range: "",
  userId: "",
  sort: "createdAt",
  dir: "desc",
  /** The generation open in the drawer — in the URL so it can be linked. */
  open: "",
};
const FILTER_KEYS = ["q", "status", "model", "type", "range", "userId"] as const;

const IN_FLIGHT = ["pending", "queued", "processing"];

const STATUS_CHIPS = [
  { value: "problems", label: "Needs attention" },
  { value: "failed", label: "Failed" },
  { value: "processing", label: "Processing" },
  { value: "queued", label: "Queued" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
] as const;

const TYPE_OPTIONS = [
  { value: "", label: "Any" },
  ...[...GENERATION_TYPES, "edit"].map((t) => ({ value: t, label: t })),
];

const EXPORT_COLUMNS: CsvColumn<AdminGenerationRow>[] = [
  { header: "id", value: (g) => g.id },
  { header: "created_at", value: (g) => g.createdAt },
  { header: "status", value: (g) => g.status },
  { header: "model", value: (g) => g.model },
  { header: "type", value: (g) => g.type },
  { header: "user_email", value: (g) => g.userEmail },
  { header: "user_id", value: (g) => g.userId },
  { header: "cost_credits", value: (g) => g.costCredits },
  { header: "processing_seconds", value: (g) => g.processingTimeSeconds },
  { header: "retries", value: (g) => g.retryCount },
  { header: "error_code", value: (g) => g.errorCode },
  { header: "error_message", value: (g) => g.errorMessage },
  { header: "provider_task_id", value: (g) => g.providerTaskId },
  { header: "completed_at", value: (g) => g.completedAt },
];

const canRetry = (g: AdminGenerationRow) => g.status !== "completed";
const canFail = (g: AdminGenerationRow) => g.status !== "completed" && g.status !== "failed";

export default function AdminGenerationsPage() {
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, { limit: 25 });
  const [live, setLive] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const retry = useRetryGeneration();
  const forceFail = useForceFailGeneration();
  const bulk = useBulkGenerationAction();
  const csv = useCsvExport();
  const { toast } = useToast();

  const params = {
    q: filters.q || undefined,
    problems: filters.status === "problems" ? "true" : undefined,
    status: filters.status && !["problems", "all"].includes(filters.status) ? filters.status : undefined,
    model: filters.model || undefined,
    type: filters.type || undefined,
    range: filters.range || undefined,
    userId: filters.userId || undefined,
    sort: filters.sort,
    dir: filters.dir,
  };
  const { data, isLoading, isError, error, isFetching, refetch } = useAdminGenerations(
    { ...params, limit, offset },
    { live },
  );

  const statusCount = (status: string) => data?.byStatus.find((s) => s.status === status)?.count ?? 0;
  const chips = STATUS_CHIPS.map((chip) => ({
    ...chip,
    count: !data
      ? undefined
      : chip.value === "problems"
        ? statusCount("failed") + IN_FLIGHT.reduce((n, s) => n + statusCount(s), 0)
        : chip.value === "all"
          ? data.byStatus.reduce((n, s) => n + s.count, 0)
          : statusCount(chip.value),
    alert: chip.value === "failed" || chip.value === "problems",
  }));

  const rows = data?.generations ?? [];
  // Selection only ever acts on what's on screen: a row that refreshed or
  // paged out of view is dropped rather than retried unseen.
  const picked = rows.filter((g) => selected.has(g.id));
  const retryable = picked.filter(canRetry);
  const failable = picked.filter(canFail);
  const allPicked = rows.length > 0 && picked.length === rows.length;

  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);
  const userEmail = filters.userId ? rows.find((g) => g.userId === filters.userId)?.userEmail : undefined;

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function runBulk(action: "retry" | "fail", targets: AdminGenerationRow[], reason: string) {
    const result = await bulk.mutateAsync({ action, ids: targets.map((g) => g.id), reason });
    setSelected(new Set());
    const verb = action === "retry" ? "Re-queued" : "Failed and refunded";
    toast({
      title: `${verb} ${result.done} of ${targets.length}`,
      description: result.failures.length
        ? `${result.failures.length} didn't go through: ${result.failures[0].error}`
        : undefined,
      variant: result.failures.length ? "error" : "success",
    });
  }

  function sortBy(field: string) {
    update(nextSort(filters, field, "desc"));
  }

  return (
    <div>
      <PageHeader
        title="Generations"
        subtitle="The job queue. Retry re-queues for the next tick; fail refunds the user."
      />

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Prompt, email, model, generation or provider task id"
          label="Search generations"
        />
        <FilterSelect
          label="Model"
          value={filters.model}
          onChange={(model) => update({ model })}
          options={[
            { value: "", label: "All models" },
            ...(data?.models ?? []).map((m) => ({ value: m.model, label: m.model, count: m.count })),
          ]}
        />
        <FilterSelect
          label="Type"
          value={filters.type}
          onChange={(type) => update({ type })}
          options={TYPE_OPTIONS}
        />
        <FilterSelect
          label="When"
          value={filters.range}
          onChange={(range) => update({ range })}
          options={RANGE_OPTIONS}
        />
      </FilterBar>

      <FilterBar>
        <ChipGroup
          label="Status"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={chips}
        />
        {filters.userId && (
          <FilterToken
            label="Account"
            value={userEmail ?? filters.userId}
            onRemove={() => update({ userId: null })}
          />
        )}
      </FilterBar>

      {data && data.failuresByModel.length > 0 && (
        <ChartCard
          title="Failures by model"
          hint="Last 7 days. Separates “we are broken” from “one provider is broken”. Click a bar to see its failures."
          className="mb-4"
        >
          <RankedBars
            data={data.failuresByModel.map((m) => ({
              label: m.model.replace(/^[^/]+\//, ""),
              value: m.failed,
            }))}
            height={Math.max(140, data.failuresByModel.length * 34)}
            onSelect={(i) =>
              update({ model: data.failuresByModel[i]?.model, status: "failed", range: "7d" })
            }
          />
        </ChartCard>
      )}

      <ResultBar
        total={data?.total}
        noun={data?.total === 1 ? "generation" : "generations"}
        fetching={isFetching && !isLoading}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => refetch()}
        exporting={csv.exporting}
        onExport={() =>
          csv.run(
            "generations",
            () =>
              fetchAllRows<AdminGenerationsResponse, AdminGenerationRow>(
                "/api/admin/generations",
                params,
                (r) => ({ rows: r.generations, total: r.total }),
              ),
            EXPORT_COLUMNS,
          )
        }
      >
        <ToolbarButton
          onClick={() => setLive((v) => !v)}
          label={live ? "Pause auto-refresh" : "Resume auto-refresh"}
          active={live}
        >
          <span
            className={cn("size-2 rounded-full", live ? "animate-pulse bg-brand" : "bg-muted")}
            aria-hidden="true"
          />
          <span>{live ? "Live" : "Paused"}</span>
        </ToolbarButton>
      </ResultBar>

      {picked.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand/[0.06] px-4 py-2.5">
          <p className="mr-auto text-body-sm text-ink-soft">
            <span className="font-medium tabular-nums">{picked.length}</span> selected
          </p>
          <ActionDialog
            trigger={
              <Button variant="secondary" size="sm" disabled={retryable.length === 0}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Retry {retryable.length}
              </Button>
            }
            title={`Re-queue ${retryable.length} generation${retryable.length === 1 ? "" : "s"}`}
            description={
              <>
                Each goes back to pending for the next tick, one audit entry apiece under the reason
                below. Nobody is charged again.
                {retryable.length < picked.length &&
                  ` ${picked.length - retryable.length} selected job(s) already completed and are skipped.`}
              </>
            }
            confirmLabel={`Retry ${retryable.length}`}
            pending={bulk.isPending}
            onConfirm={(reason) => runBulk("retry", retryable, reason)}
          />
          <ActionDialog
            trigger={
              <Button variant="secondary" size="sm" disabled={failable.length === 0}>
                <XCircle className="size-3.5 text-accent" aria-hidden="true" />
                Fail and refund {failable.length}
              </Button>
            }
            title={`Fail and refund ${failable.length} generation${failable.length === 1 ? "" : "s"}`}
            description={
              <>
                Ends each job and refunds{" "}
                {failable.reduce((n, g) => n + g.costCredits, 0).toLocaleString()} credits in total,
                through the same path the automatic sweeper uses.
                {failable.length < picked.length &&
                  ` ${picked.length - failable.length} selected job(s) already finished and are skipped.`}
              </>
            }
            confirmLabel={`Fail and refund ${failable.length}`}
            destructive
            pending={bulk.isPending}
            onConfirm={(reason) => runBulk("fail", failable, reason)}
          />
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : isError || !data ? (
        <ErrorBlock message={(error as Error)?.message} />
      ) : (
        <Panel>
          <Table
            head={
              <>
                <Th className="w-10 pr-0">
                  <Checkbox
                    label="Select all on this page"
                    checked={allPicked}
                    indeterminate={picked.length > 0}
                    disabled={rows.length === 0}
                    onChange={(on) => setSelected(on ? new Set(rows.map((g) => g.id)) : new Set())}
                  />
                </Th>
                <Th>Model</Th>
                <Th>User</Th>
                <Th>Status</Th>
                <SortTh
                  field="cost"
                  sort={filters.sort}
                  dir={filters.dir}
                  onSort={sortBy}
                  className="text-right"
                >
                  Cost
                </SortTh>
                <SortTh
                  field="duration"
                  sort={filters.sort}
                  dir={filters.dir}
                  onSort={sortBy}
                  className="text-right"
                >
                  Took
                </SortTh>
                <Th>Error</Th>
                <SortTh field="createdAt" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                  Created
                </SortTh>
                <Th />
              </>
            }
          >
            {rows.length === 0 ? (
              <EmptyRow colSpan={9}>
                {filters.status === "problems" && !filtered
                  ? "Nothing needs attention — that's the good outcome."
                  : "No generations match."}{" "}
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
              rows.map((g) => (
                <ClickableRow
                  key={g.id}
                  selected={selected.has(g.id)}
                  onActivate={() => update({ open: g.id, offset })}
                >
                  <Td className="w-10 pr-0">
                    <Checkbox
                      label={`Select ${g.id}`}
                      checked={selected.has(g.id)}
                      onChange={(on) => toggle(g.id, on)}
                    />
                  </Td>
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
                    {g.retryCount > 0 && <Mono className="mt-1 block">retried ×{g.retryCount}</Mono>}
                  </Td>
                  <Td className="text-right tabular-nums">{g.costCredits}</Td>
                  <Td className="text-right tabular-nums">
                    {g.processingTimeSeconds != null ? `${g.processingTimeSeconds}s` : "—"}
                  </Td>
                  <Td className="max-w-56">
                    {g.errorCode ? (
                      <>
                        <Mono className="text-accent">{g.errorCode}</Mono>
                        <span
                          className="mt-0.5 block truncate text-caption text-muted"
                          title={g.errorMessage ?? ""}
                        >
                          {g.errorMessage}
                        </span>
                      </>
                    ) : (
                      <Mono>—</Mono>
                    )}
                  </Td>
                  <Td>
                    <When value={g.createdAt} />
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      {canRetry(g) && (
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
                      {canFail(g) && (
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
                </ClickableRow>
              ))
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

      <GenerationDrawer id={filters.open || null} onClose={() => update({ open: null, offset })} />
    </div>
  );
}
