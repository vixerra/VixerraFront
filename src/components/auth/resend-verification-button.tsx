"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

// Supabase Auth refuses a second email to the same address inside its
// max_frequency window (60s — supabase/config.toml in the backend), and the
// API swallows that refusal, so a click inside the window would "succeed"
// while nothing is sent. Counting the window down here keeps the button
// honest: it can only be pressed when a press does something.
const COOLDOWN_SECONDS = 60;

// One resend control for every place a person can be stuck without their
// verification link: the post-signup card, the login page's "unverified"
// notice, and an expired /verify-email link. The endpoint always answers
// 200 (it never reveals whether the address has an account), so "sent" here
// means "asked" — the copy stays conditional on purpose.
export function ResendVerificationButton({
  email,
  className,
}: {
  email: string;
  className?: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  async function resend() {
    setPending(true);
    try {
      await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
      setSecondsLeft(COOLDOWN_SECONDS);
    } finally {
      setPending(false);
    }
  }

  const coolingDown = secondsLeft > 0;

  return (
    <div className={className}>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={pending}
        disabled={coolingDown}
        onClick={resend}
      >
        {coolingDown ? `Resend in ${secondsLeft}s` : sent ? "Resend again" : "Resend email"}
      </Button>
      {sent && (
        <p className="mt-3 text-center text-caption text-muted" role="status">
          Sent — give it a minute, and check your spam folder.
        </p>
      )}
    </div>
  );
}
