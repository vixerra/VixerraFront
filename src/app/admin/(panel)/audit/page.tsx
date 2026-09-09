"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminAudit } from "@/hooks/use-admin-data";
import {
  PageHeader, Panel, Table, Th, Td, Mono, Pagination,
  EmptyRow, LoadingBlock, ErrorBlock, formatDate,
} from "@/components/admin/ui";

const LIMIT = 50;

/** Read-only by design: the log has no edit or delete anywhere in the panel,
 *  because a trail an operator can rewrite isn't a trail. */
export default function AdminAuditPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useAdminAudit({ limit: LIMIT, offset });

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message} />;

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Every mutating staff action, append-only. Nothing here can be edited or removed."
      />

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
            <EmptyRow colSpan={5}>No admin actions recorded yet.</EmptyRow>
          ) : (
            data.entries.map((e) => {
              const reason = typeof e.details.reason === "string" ? e.details.reason : null;
              const rest = Object.entries(e.details).filter(([k]) => k !== "reason");
              return (
                <tr key={e.id} className="align-top">
                  <Td><Mono>{formatDate(e.createdAt)}</Mono></Td>
                  <Td><Mono>{e.adminEmail}</Mono></Td>
                  <Td><span className="font-mono text-caption text-brand">{e.action}</span></Td>
                  <Td>
                    {e.targetType === "User" && e.targetId ? (
                      <Link href={`/admin/users/${e.targetId}`} className="hover:underline">
                        <Mono>{e.targetType}</Mono>
                      </Link>
                    ) : (
                      <Mono>{e.targetType}</Mono>
                    )}
                    <Mono className="block opacity-50">{e.targetId?.slice(0, 8) ?? "—"}</Mono>
                  </Td>
                  <Td className="max-w-md">
                    {reason && <p className="text-body-sm text-ink-soft">“{reason}”</p>}
                    {rest.length > 0 && (
                      <p className="mt-1 font-mono text-caption text-muted">
                        {rest.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join("  ")}
                      </p>
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </Table>
        <Pagination total={data.total} limit={LIMIT} offset={offset} onOffset={setOffset} />
      </Panel>
    </div>
  );
}
