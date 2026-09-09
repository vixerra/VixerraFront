"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mirrors (app)/error.tsx's rationale — without this, an unhandled render
// error anywhere on the marketing site (home, pricing, prompts, gallery,
// contact) unmounts the whole tree with nothing to catch it. The
// (marketing) layout's header/footer live above this segment boundary and
// stay intact.
export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertTriangle className="size-8 text-warning" aria-hidden="true" />
      <div>
        <p className="text-body text-ink-soft">Something went wrong</p>
        <p className="mt-1 text-body-sm text-muted">
          This page hit an unexpected error. Try again, or reload if it keeps happening.
        </p>
      </div>
      <Button variant="accent" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
