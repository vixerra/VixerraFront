"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, RotateCcw, User, X, XCircle } from "lucide-react";
import {
  useAdminGeneration,
  useForceFailGeneration,
  useRetryGeneration,
} from "@/hooks/use-admin-data";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ActionDialog,
  CopyButton,
  ErrorBlock,
  LoadingBlock,
  Mono,
  StatusPill,
  TierPill,
  formatDate,
} from "@/components/admin/ui";

/**
 * Everything about one job, opened from a row of the generations table (or
 * any link carrying ?open=<id>). The table shows what's needed to triage a
 * list; this shows what's needed to understand a single case — the full
 * prompt and error text, the parameters the provider actually got, the
 * media on both ends, and every id worth pasting into a provider dashboard.
 */
export function GenerationDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Same layer as ActionDialog on purpose: a confirmation opened from
            inside the drawer is portalled after it, so it lands on top. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "animate-sheet-right fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-hidden",
            "border-l border-line bg-surface-2 shadow-modal focus:outline-none",
            "sm:inset-y-3 sm:right-3 sm:rounded-2xl sm:border",
          )}
        >
          {id && <DrawerBody id={id} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DrawerBody({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading, isError, error } = useAdminGeneration(id);
  const retry = useRetryGeneration();
  const forceFail = useForceFailGeneration();
  const g = data?.generation;

  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
        <div className="min-w-0">
          <Dialog.Title className="font-display truncate text-feature-title font-bold text-ink">
            {g ? g.model : "Generation"}
          </Dialog.Title>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {g && <StatusPill status={g.status} />}
            <Mono className="truncate">{id}</Mono>
            <CopyButton value={id} label="Copy generation id" />
          </div>
        </div>
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-ink-soft"
          >
            <X className="size-4" />
          </button>
        </Dialog.Close>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {isLoading ? (
          <LoadingBlock />
        ) : isError || !g ? (
          <ErrorBlock message={(error as Error)?.message} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/users/${g.userId}`}
                onClick={onClose}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <User className="size-3.5" aria-hidden="true" />
                Open account
              </Link>
              {g.status !== "completed" && (
                <ActionDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      Retry
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
                    <Button variant="secondary" size="sm">
                      <XCircle className="size-3.5 text-accent" aria-hidden="true" />
                      Fail and refund
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
              {g.isPublic && (
                <a
                  href={`/gallery/${g.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Public page
                </a>
              )}
            </div>

            {g.errorCode && (
              <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
                <p className="font-mono text-caption text-accent">{g.errorCode}</p>
                {g.errorMessage && (
                  <p className="mt-1.5 text-body-sm break-words whitespace-pre-wrap text-ink-soft">
                    {g.errorMessage}
                  </p>
                )}
              </div>
            )}

            <MediaStrip
              items={[
                { label: "Result", url: g.resultUrl, image: g.type === "text-to-image" },
                { label: "Input image", url: g.inputImageUrl, image: true },
                { label: "Styled image", url: g.styledImageUrl, image: true },
              ]}
            />

            <Section title="Prompt" action={<CopyButton value={g.prompt} label="Copy prompt" />}>
              <p className="rounded-xl border border-line bg-surface-dark p-3 text-body-sm break-words whitespace-pre-wrap text-ink-soft">
                {g.prompt || "—"}
              </p>
              {g.negativePrompt && (
                <p className="mt-2 text-caption text-muted">
                  <span className="text-ink-soft">Negative:</span> {g.negativePrompt}
                </p>
              )}
            </Section>

            <Section title="Details">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Field label="Account">
                  <span className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/admin/users/${g.userId}`}
                      onClick={onClose}
                      className="truncate hover:underline"
                    >
                      {g.userEmail}
                    </Link>
                    <TierPill tier={g.userTier} />
                  </span>
                </Field>
                <Field label="Type">{g.type}</Field>
                <Field label="Cost">{g.costCredits.toLocaleString()} credits</Field>
                <Field label="Processing time">
                  {g.processingTimeSeconds != null ? `${g.processingTimeSeconds}s` : "—"}
                </Field>
                <Field label="Created">{formatDate(g.createdAt)}</Field>
                <Field label="Completed">{formatDate(g.completedAt)}</Field>
                <Field label="Retries">{g.retryCount}</Field>
                <Field label="Progress">{g.progressPercent}%</Field>
                <Field label="Provider task">
                  {g.providerTaskId ? (
                    <span className="flex min-w-0 items-center gap-1">
                      <Mono className="truncate">{g.providerTaskId}</Mono>
                      <CopyButton value={g.providerTaskId} label="Copy provider task id" />
                    </span>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Preset">
                  {g.presetId ? (
                    <Link
                      href={`/admin/presets?q=${encodeURIComponent(g.presetId)}`}
                      onClick={onClose}
                      className="hover:underline"
                    >
                      {g.presetTitle ?? g.presetSlug ?? g.presetId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Workspace">{g.organizationName ?? "Personal"}</Field>
                <Field label="Visibility">
                  {g.isPublic
                    ? `Public · ${g.viewCount.toLocaleString()} views${g.shareAsNickname ? " · as pen name" : ""}`
                    : "Private"}
                </Field>
                {g.seed != null && <Field label="Seed">{g.seed}</Field>}
              </dl>
            </Section>

            <KeyValues title="Parameters" values={g.parameters} />
            <KeyValues title="Metadata" values={g.metadata} />
          </>
        )}
      </div>
    </>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-caption font-medium tracking-wide text-muted uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-body-sm text-ink-soft">{children}</dd>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function KeyValues({ title, values }: { title: string; values: Record<string, unknown> | null }) {
  const entries = Object.entries(values ?? {});
  if (entries.length === 0) return null;
  return (
    <Section title={title}>
      <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-3 px-3 py-2">
            <dt className="truncate font-mono text-caption text-muted" title={key}>
              {key}
            </dt>
            {/* Clamped: reference images arrive as long URLs, and the odd
                data: URI would otherwise run to thousands of characters. */}
            <dd
              className="line-clamp-3 font-mono text-caption break-all text-ink-soft"
              title={formatValue(value)}
            >
              {formatValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function MediaStrip({ items }: { items: { label: string; url: string | null; image: boolean }[] }) {
  const present = items.filter((m) => m.url);
  if (present.length === 0) return null;
  return (
    <div className={cn("grid gap-3", present.length > 1 && "sm:grid-cols-2")}>
      {present.map((m) => (
        <figure key={m.label} className="overflow-hidden rounded-xl border border-line bg-surface-3">
          <div className="flex aspect-video items-center justify-center bg-black/40">
            {m.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url!} alt={m.label} className="h-full w-full object-contain" />
            ) : (
              <video
                src={m.url!}
                controls
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
              />
            )}
          </div>
          <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-caption text-muted">
            {m.label}
            <a
              href={m.url!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-ink-soft"
            >
              Open <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
