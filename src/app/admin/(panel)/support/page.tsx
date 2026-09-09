"use client";

import { useState } from "react";
import { Mail, MailOpen } from "lucide-react";
import { useAdminSupport, useMarkMessageRead } from "@/hooks/use-admin-data";
import { Button } from "@/components/ui/button";
import {
  PageHeader, Panel, Pagination, LoadingBlock, ErrorBlock, Mono, formatDate,
} from "@/components/admin/ui";

const LIMIT = 25;

export default function AdminSupportPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useAdminSupport({ limit: LIMIT, offset });
  const markRead = useMarkMessageRead();

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message} />;

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle={
          data.total === 0
            ? "Messages from the contact form land here."
            : `${data.unread} unread of ${data.total}.`
        }
      />

      {data.messages.length === 0 ? (
        <Panel className="p-12 text-center">
          <p className="text-body-sm text-muted">
            No messages yet. The contact form writes here — before this page existed, nothing read
            the table at all.
          </p>
        </Panel>
      ) : (
        <Panel>
          {/* Unread-first ordering comes from the API; the left border is the
              scan cue so an operator can see the queue depth without reading. */}
          <ul className="divide-y divide-line">
            {data.messages.map((m) => (
              <li
                key={m.id}
                className={`border-l-2 p-4 ${m.readAt ? "border-l-transparent" : "border-l-brand bg-brand/[0.03]"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-ink">
                      {m.name} <Mono className="ml-1">{m.email}</Mono>
                    </p>
                    <Mono className="block">{formatDate(m.createdAt)}</Mono>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a href={`mailto:${m.email}`}>
                      <Button variant="secondary" size="sm">Reply by email</Button>
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={markRead.isPending}
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
          <Pagination total={data.total} limit={LIMIT} offset={offset} onOffset={setOffset} />
        </Panel>
      )}
    </div>
  );
}
