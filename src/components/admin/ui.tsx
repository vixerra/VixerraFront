"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Loader2,
  X,
} from "lucide-react";
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

/** A column header that sorts the table. The arrow shows the live
 *  direction; unsorted columns show a faint two-way arrow so it's clear
 *  they can be clicked at all. */
export function SortTh({
  field,
  sort,
  dir,
  onSort,
  children,
  className,
}: {
  field: string;
  sort: string;
  dir: string;
  onSort: (field: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-2.5 font-medium whitespace-nowrap", className)}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 uppercase transition-colors hover:text-ink-soft",
          active && "text-ink-soft",
        )}
      >
        {children}
        <Icon className={cn("size-3", !active && "opacity-40")} aria-hidden="true" />
      </button>
    </th>
  );
}

/**
 * A table row that opens something when clicked anywhere on it — a much
 * bigger target than the name link alone. Clicks that land on a real
 * control inside the row (the link itself, a copy or action button, a
 * checkbox) are left to that control, and a click that ends a text
 * selection is ignored so an email can still be dragged over and copied.
 */
export function ClickableRow({
  onActivate,
  selected,
  className,
  children,
}: {
  onActivate: (e: MouseEvent<HTMLTableRowElement>) => void;
  selected?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <tr
      onClick={(e) => {
        // React bubbles events out of portals along the component tree, so a
        // click inside a dialog opened from this row (a Retry confirmation,
        // its overlay) arrives here too. Only clicks on the row's own DOM
        // count.
        if (!e.currentTarget.contains(e.target as Node)) return;
        if ((e.target as HTMLElement).closest("a,button,input,select,textarea,label")) return;
        if (window.getSelection()?.toString()) return;
        onActivate(e);
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-white/[0.03]",
        selected && "bg-brand/[0.05] hover:bg-brand/[0.07]",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-body-sm text-ink-soft", className)}>{children}</td>;
}

export function Mono({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} className={cn("font-mono text-caption text-muted", className)}>
      {children}
    </span>
  );
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

const PAGE_SIZES = [10, 25, 50, 100];

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-7 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-border-strong hover:text-ink-soft disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function Pagination({
  total,
  limit,
  offset,
  onOffset,
  onLimit,
  pageSizes = PAGE_SIZES,
}: {
  total: number;
  limit: number;
  offset: number;
  onOffset: (next: number) => void;
  /** Shows a rows-per-page picker when given. */
  onLimit?: (next: number) => void;
  pageSizes?: number[];
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.floor(offset / limit) + 1);
  // Reachable from a stale link, or when the last rows of the last page
  // were just acted on. Say so, rather than printing "101–20 of 20".
  const pastEnd = total > 0 && offset >= total;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-4 text-caption text-muted">
        {pastEnd ? (
          <button type="button" onClick={() => onOffset(0)} className="text-brand hover:underline">
            Past the last page — back to the first
          </button>
        ) : (
          <p className="tabular-nums">
            {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
          </p>
        )}
        {onLimit && (
          <label className="flex items-center gap-1.5">
            Rows
            <select
              value={limit}
              onChange={(e) => onLimit(Number(e.target.value))}
              className="cursor-pointer rounded-md border border-line bg-surface-dark px-1.5 py-0.5 text-caption text-ink-soft focus:border-border-strong focus:outline-none"
            >
              {(pageSizes.includes(limit) ? pageSizes : [...pageSizes, limit].sort((a, b) => a - b)).map(
                (size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <PageButton disabled={offset === 0} onClick={() => onOffset(0)} label="First page">
          <ChevronsLeft className="size-3.5" />
        </PageButton>
        <PageButton
          disabled={offset === 0}
          onClick={() => onOffset(Math.max(0, offset - limit))}
          label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </PageButton>
        <span className="px-1.5 text-caption text-muted tabular-nums">
          {page} / {pages}
        </span>
        <PageButton disabled={to >= total} onClick={() => onOffset(offset + limit)} label="Next page">
          <ChevronRight className="size-3.5" />
        </PageButton>
        <PageButton
          disabled={to >= total}
          onClick={() => onOffset((pages - 1) * limit)}
          label="Last page"
        >
          <ChevronsRight className="size-3.5" />
        </PageButton>
      </div>
    </div>
  );
}

/** Copies a value — an id, an email — with a tick for confirmation. Stops
 *  the click there, so it can sit inside a clickable row. */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // Clipboard refused (insecure context, denied permission) — the
          // value is still on screen to select by hand.
        }
      }}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-ink-soft",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** A row-selection checkbox. `indeterminate` is a DOM property with no
 *  attribute, so it's set through the ref. */
export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="size-4 cursor-pointer rounded accent-brand disabled:cursor-not-allowed disabled:opacity-30"
    />
  );
}

export function TierPill({ tier }: { tier: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-caption capitalize",
        tier === "free" ? "border-line bg-white/5 text-muted" : "border-brand/30 bg-brand/10 text-brand",
      )}
    >
      {tier}
    </span>
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

/** "3 hours ago" — for recency columns, where the gap matters more than the
 *  timestamp. Pair it with formatDate in a title for the exact moment. */
export function formatRelative(value: string | null | undefined) {
  if (!value) return "—";
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

/** A time cell: relative on screen, exact on hover. */
export function When({ value, fallback = "—" }: { value: string | null | undefined; fallback?: string }) {
  if (!value) return <Mono>{fallback}</Mono>;
  return (
    <time dateTime={value} title={formatDate(value)} className="font-mono text-caption text-muted">
      {formatRelative(value)}
    </time>
  );
}
