import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";

// Lives at the app root rather than inside any (marketing)/(app)/(auth)
// route group, so it doesn't inherit any of their headers/sidebars — this
// app had no custom 404 at all before (a broken/mistyped link just fell
// through to Next's bare default page, with none of this app's styling).
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-4 text-center">
      <Logo />
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10">
        <Compass className="size-6 text-brand" aria-hidden="true" />
      </span>
      <div>
        <h1 className="font-display text-heading font-bold tracking-tight text-ink">Page not found</h1>
        <p className="mt-2 text-body text-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        Back to home
      </Link>
    </div>
  );
}
