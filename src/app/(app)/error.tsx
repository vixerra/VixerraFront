"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Without this boundary, an unhandled render error anywhere under the app
// shell (dashboard, generate, gallery, etc.) unmounts the whole React tree
// with nothing to catch it — the user is left staring at a blank/black page
// with no way to recover short of a manual browser reload. This keeps the
// sidebar/header (rendered by the layout above this segment) intact and
// gives them a retry action instead.
export default function AppError({
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
    <div className="flex min-h-[60vh] items-center justify-center py-16">
      <Card
        variant="standard"
        className="flex flex-col items-center gap-4 text-center hover:translate-y-0 hover:shadow-card"
      >
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
      </Card>
    </div>
  );
}
