"use client";

import { AlertTriangle } from "lucide-react";

/**
 * The composer's dead end, for a model id that has no form to render.
 *
 * It replaces a pair of hand-written "generic" fallback forms that could
 * never actually run: VIDEO_MODELS/IMAGE_MODELS are built from the model
 * registry (plus the two Seedance ids), so every id they can hold is already
 * matched by a real branch. Those forms had drifted — their own resolution
 * and duration lists, prompt placeholders and character caps no longer
 * matched any model in the catalog — which made them a standing source of
 * inconsistency for anyone reading the composer to see how a field is meant
 * to behave. This says the honest thing in a shape that matches the rest of
 * the composer, and can't drift.
 */
export function UnsupportedModelNotice({ modelId }: { modelId: string }) {
  return (
    <div className="flex items-start gap-3 p-4 sm:p-5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3">
        <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-label font-medium text-ink">This model isn&apos;t available yet</p>
        <p className="mt-1 text-caption text-muted">
          <span className="font-mono">{modelId}</span> has no composer form. Pick another model to
          keep going.
        </p>
      </div>
    </div>
  );
}
