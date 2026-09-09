"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Shared furniture for the admin tables. Plain and dense on purpose — this
 *  is a tool, and an operator scanning 50 rows is better served by tight
 *  monospace columns than by the product's card styling. */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-heading font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-body-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-surface-2", className)}>
      {children}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <thead className="border-b border-line bg-surface-3/50">
          <tr className="text-caption tracking-wide text-muted uppercase">{head}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2.5 font-medium whitespace-nowrap", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-body-sm text-ink-soft", className)}>{children}</td>;
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-caption text-muted", className)}>{children}</span>;
}

const STATUS_TONE: Record<string, string> = {
  completed: "border-success/30 bg-success/15 text-success",
  failed: "border-accent/30 bg-accent/15 text-accent",
  processing: "border-info/30 bg-info/15 text-info",
  queued: "border-warning/30 bg-warning/15 text-warning",
  pending: "border-warning/30 bg-warning/15 text-warning",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-caption font-medium whitespace-nowrap",
        STATUS_TONE[status] ?? "border-line bg-white/5 text-muted",
      )}
    >
      {status}
    </span>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-body-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex min-h-48 items-center justify-center">
      <Spinner size={24} />
    </div>
  );
}

export function ErrorBlock({ message }: { message?: string }) {
  return (
    <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-body-sm text-accent">
      {message ?? "Couldn't load this."}
    </p>
  );
}

export function Pagination({
  total,
  limit,
  offset,
  onOffset,
}: {
  total: number;
  limit: number;
  offset: number;
  onOffset: (next: number) => void;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
      <p className="text-caption text-muted">
        {from}–{to} of {total}
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => onOffset(Math.max(0, offset - limit))}
          aria-label="Previous page"
          className="flex size-7 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-border-strong hover:text-ink-soft disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={to >= total}
          onClick={() => onOffset(offset + limit)}
          aria-label="Next page"
          className="flex size-7 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-border-strong hover:text-ink-soft disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Confirmation for anything that writes.
 *
 * The reason field is required rather than optional, and the API rejects a
 * blank one too — an audit trail full of "" is the same as no audit trail.
 * Making the operator type something is a small tax that pays for itself the
 * first time anyone asks why an account got 5,000 credits.
 */
export function ActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  error,
  extra,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  error?: string | null;
  /** Extra inputs above the reason box (e.g. the credit amount). */
  extra?: (disabled: boolean) => ReactNode;
  onConfirm: (reason: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 3) {
      setLocalError("Give a reason — it goes in the audit log.");
      return;
    }
    setLocalError(null);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason("");
    } catch (err) {
      setLocalError((err as Error).message);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason("");
          setLocalError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface-2 p-6 shadow-modal focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-feature-title font-bold text-ink">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-ink-soft"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description asChild>
              <div className="mt-2 text-body-sm text-muted">{description}</div>
            </Dialog.Description>
          )}

          <div className="mt-5 space-y-4">
            {extra?.(Boolean(pending))}

            <div>
              <label htmlFor="action-reason" className="mb-1.5 block text-label text-ink-soft">
                Reason <span className="text-muted">(recorded)</span>
              </label>
              <textarea
                id="action-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={pending}
                placeholder="Why are you doing this?"
                className="w-full resize-none rounded-xl border border-line bg-surface-dark px-3.5 py-2.5 text-body-sm text-ink-soft placeholder:text-muted focus:border-border-strong focus:outline-none"
              />
            </div>

            {(localError || error) && (
              <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-caption text-accent">
                {localError ?? error}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm" disabled={pending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              variant={destructive ? "accent" : "primary"}
              onClick={submit}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "2-digit",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
