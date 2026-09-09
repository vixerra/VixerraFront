"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Login/signup/forgot-password/reset-password had neither an error nor a
// loading boundary before this — an unhandled error here (the one place a
// user is trying to get *into* the app) previously left a blank page with
// no recovery short of a manual reload.
export default function AuthError({
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
    <Card variant="standard" className="flex flex-col items-center gap-4 text-center hover:translate-y-0 hover:shadow-card">
      <AlertTriangle className="size-8 text-warning" aria-hidden="true" />
      <div>
        <p className="text-body text-ink-soft">Something went wrong</p>
        <p className="mt-1 text-body-sm text-muted">Try again, or reload if it keeps happening.</p>
      </div>
      <Button variant="accent" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
