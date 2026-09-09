import { AlertTriangle } from "lucide-react";

// Shared banner for /terms and /privacy — this app had *no* legal pages at
// all before (nothing to link from signup or the footer), which is a real
// gap for a product taking signups and payments. A drafted starting point
// beats nothing, but it isn't a substitute for review by an actual lawyer
// before it's relied on as binding — that distinction has to be visible on
// the page itself, not just in a code comment nobody but us will read.
export function LegalDraftNotice() {
  return (
    <div className="mb-10 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-body-sm text-ink-soft">
        <strong className="font-semibold">Draft — not yet reviewed by counsel.</strong> This is a
        starting-point template, not a finished legal document. Have a lawyer review it before
        treating it as binding.
      </p>
    </div>
  );
}
