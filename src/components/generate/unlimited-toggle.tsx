"use client";

import { Infinity as InfinityIcon, Timer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { UnlimitedState } from "@/hooks/use-unlimited";
import { WAN3_CREDITS_PER_SECOND_FROM } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** How long ago the window may have ended and still get the "it ended"
 *  note in the composer. */
const ENDED_NOTE_DAYS = 14;

/** Whether a window that is over ended recently enough to say so. */
export function unlimitedRecentlyEnded(state: UnlimitedState | null | undefined): boolean {
  if (!state || state.active || state.secondsLeft === null) return false;
  return -state.secondsLeft < ENDED_NOTE_DAYS * 86_400;
}

/**
 * The composer's Wan 3.0 Unlimited switch, shown on the models the window
 * covers while it is open. On, the run goes to the Relax queue for 0
 * credits, within the plan's Unlimited limits; off, it is an ordinary
 * priority run paid in credits. Below it, the queue's current wait.
 */
export function UnlimitedToggle({
  state,
  checked,
  onCheckedChange,
  className,
}: {
  state: UnlimitedState;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  const hoursLeft = state.secondsLeft === null ? null : Math.max(0, Math.round(state.secondsLeft / 3600));
  const waitMinutes = state.queue ? Math.ceil(state.queue.estimatedWaitSeconds / 60) : 0;
  const limits = [
    state.max_resolution,
    state.max_duration_seconds ? `up to ${state.max_duration_seconds}s` : null,
    state.max_concurrent ? `${state.max_concurrent} at a time` : null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        checked ? "border-accent-amber-ink/40 bg-accent-amber/5" : "border-line bg-ink/[0.03]",
        className,
      )}
    >
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <InfinityIcon className="size-4 shrink-0 text-accent-amber-ink" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-body-sm font-semibold text-ink">Unlimited · Relax mode</span>
            <span className="block text-caption text-muted">
              0 credits · {limits.join(" · ")}
              {hoursLeft !== null && ` · ${hoursLeft < 48 ? `${hoursLeft}h` : `${Math.round(hoursLeft / 24)} days`} left`}
            </span>
          </span>
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label="Generate in Relax mode for free" />
      </label>
      {checked && state.queue && (
        <p className="mt-2.5 flex items-start gap-1.5 text-caption text-muted">
          <Timer className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {state.queue.paused ? (
            <span>The Relax queue is paused for now. Generate with credits to start right away.</span>
          ) : waitMinutes > 1 ? (
            <span>
              You&apos;re in the Relax queue — estimated wait: ~{waitMinutes} min. Need it faster?
              Turn this off to generate now with credits in the priority queue.
            </span>
          ) : (
            <span>Relax queue speed varies with demand. Turn this off to use credits and skip it.</span>
          )}
        </p>
      )}
    </div>
  );
}

/** The note once the window is over, on the model it covered. */
export function UnlimitedEndedNote({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-xl border border-line bg-ink/[0.03] px-3.5 py-3 text-caption text-muted", className)}>
      Your 7-day Wan 3.0 Unlimited has ended. Wan 3.0 is still available with your credits from{" "}
      {WAN3_CREDITS_PER_SECOND_FROM} credits/second.
    </p>
  );
}
