"use client";

import Link from "next/link";
import {
  fetchAllRows,
  useAdminAudit,
  type AdminAuditResponse,
  type AuditEntry,
} from "@/hooks/use-admin-data";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useCsvExport } from "@/hooks/use-csv-export";
import type { CsvColumn } from "@/lib/csv";
import {
  FilterBar,
  FilterSelect,
  FilterToken,
  RANGE_OPTIONS,
  ResultBar,
  SearchField,
} from "@/components/admin/filters";
import {
  PageHeader, Panel, Table, Th, Td, Mono, Pagination,
  EmptyRow, LoadingBlock, ErrorBlock, CopyButton, When,
} from "@/components/admin/ui";

const DEFAULTS = {
  q: "",
  action: "",
  adminId: "",
  targetType: "",
  targetId: "",
  range: "",
};
const FILTER_KEYS = ["q", "action", "adminId", "targetType", "targetId", "range"] as const;

const EXPORT_COLUMNS: CsvColumn<AuditEntry>[] = [
  { header: "id", value: (e) => e.id },
  { header: "created_at", value: (e) => e.createdAt },
  { header: "admin_email", value: (e) => e.adminEmail },
  { header: "action", value: (e) => e.action },
  { header: "target_type", value: (e) => e.targetType },
  { header: "target_id", value: (e) => e.targetId },
  { header: "reason", value: (e) => (typeof e.details.reason === "string" ? e.details.reason : "") },
  { header: "details", value: (e) => JSON.stringify(e.details) },
];

/** Where a target lives in the panel, when it has a page of its own. */
function targetHref(type: string, id: string | null) {
  if (!id) return null;
  switch (type) {
    case "User":
      return `/admin/users/${id}`;
    case "Generation":
      return `/admin/generations?status=all&open=${encodeURIComponent(id)}`;
    case "Preset":
      return `/admin/presets?q=${encodeURIComponent(id)}`;
    default:
      return null;
  }
}

/** Read-only by design: the log has no edit or delete anywhere in the panel,
 *  because a trail an operator can rewrite isn't a trail. */
export default function AdminAuditPage() {
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, { limit: 50 });
  const csv = useCsvExport();

  const params = {
    q: filters.q || undefined,
    action: filters.action || undefined,
    adminId: filters.adminId || undefined,
    targetType: filters.targetType || undefined,
    targetId: filters.targetId || undefined,
    range: filters.range || undefined,
  };
  const { data, isLoading, isError, error, isFetching, refetch } = useAdminAudit({
    ...params,
    limit,
    offset,
  });

  const facets = data?.facets;
  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Every mutating staff action, append-only. Nothing here can be edited or removed."
      />

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Reason or detail text, staff email, or a target id"
          label="Search the audit log"
        />
        <FilterSelect
          label="Action"
          value={filters.action}
          onChange={(action) => update({ action })}
          options={[
            { value: "", label: "Any" },
            ...(facets?.actions ?? []).map((a) => ({ value: a.action, label: a.action, count: a.count })),
          ]}
        />
        <FilterSelect
          label="Staff"
          value={filters.adminId}
          onChange={(adminId) => update({ adminId })}
          options={[
            { value: "", label: "Anyone" },
            ...(facets?.admins ?? []).map((a) => ({
              value: a.adminId,
              label: a.adminEmail,
              count: a.count,
            })),
          ]}
        />
        <FilterSelect
          label="Target"
          value={filters.targetType}
          onChange={(targetType) => update({ targetType })}
          options={[
            { value: "", label: "Anything" },
            ...(facets?.targetTypes ?? []).map((t) => ({
              value: t.targetType,
              label: t.targetType,
              count: t.count,
            })),
          ]}
        />
        <FilterSelect
          label="When"
          value={filters.range}
          onChange={(range) => update({ range })}
          options={RANGE_OPTIONS}
        />
      </FilterBar>

      {filters.targetId && (
        <FilterBar>
          <FilterToken
            label={filters.targetType || "Target"}
            value={filters.targetId}
            onRemove={() => update({ targetId: null })}
          />
        </FilterBar>
      )}

      <ResultBar
        total={data?.total}
        noun={data?.total === 1 ? "entry" : "entries"}
        fetching={isFetching && !isLoading}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => refetch()}
        exporting={csv.exporting}
        onExport={() =>
          csv.run(
            "audit-log",
            () =>
              fetchAllRows<AdminAuditResponse, AuditEntry>("/api/admin/audit", params, (r) => ({
                rows: r.entries,
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
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Detail</Th>
              </>
            }
          >
            {data.entries.length === 0 ? (
              <EmptyRow colSpan={5}>
                {filtered ? "No entries match." : "No admin actions recorded yet."}{" "}
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
              data.entries.map((e) => {
                const reason = typeof e.details.reason === "string" ? e.details.reason : null;
                const rest = Object.entries(e.details).filter(([k]) => k !== "reason");
                const href = targetHref(e.targetType, e.targetId);
                return (
                  <tr key={e.id} className="align-top">
                    <Td>
                      <When value={e.createdAt} />
                    </Td>
                    <Td>
                      {/* Click-to-filter: "what else did this person do". */}
                      <button
                        type="button"
                        onClick={() => update({ adminId: e.adminId })}
                        className="text-left hover:underline"
                        title="Show only this staff member's actions"
                      >
                        <Mono>{e.adminEmail}</Mono>
                      </button>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => update({ action: e.action })}
                        className="font-mono text-caption text-brand hover:underline"
                        title="Show only this action"
                      >
                        {e.action}
                      </button>
                    </Td>
                    <Td>
                      {href ? (
                        <Link href={href} className="hover:underline">
                          <Mono>{e.targetType}</Mono>
                        </Link>
                      ) : (
                        <Mono>{e.targetType}</Mono>
                      )}
                      {e.targetId ? (
                        <span className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              update({ targetType: e.targetType, targetId: e.targetId })
                            }
                            className="hover:underline"
                            title="Everything done to this target"
                          >
                            <Mono className="opacity-60">{e.targetId.slice(0, 10)}…</Mono>
                          </button>
                          <CopyButton value={e.targetId} label="Copy target id" className="size-5" />
                        </span>
                      ) : (
                        <Mono className="block opacity-50">—</Mono>
                      )}
                    </Td>
                    <Td className="max-w-md">
                      {reason && <p className="text-body-sm text-ink-soft">“{reason}”</p>}
                      {rest.length > 0 && (
                        <p className="mt-1 font-mono text-caption break-words text-muted">
                          {rest.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join("  ")}
                        </p>
                      )}
                    </Td>
                  </tr>
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
