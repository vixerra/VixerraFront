import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Card } from "@/components/ui/card";
import { CLOUDFLARE_MODELS } from "@/lib/cloudflare-models";
import { CREDIT_VALUE_USD, PAID_TIERS, TIER_INFO } from "@/lib/constants";
import { CATEGORY_LABEL, modelPageHref } from "@/lib/model-seo";
import { openGraph } from "@/lib/seo";

// The public face of the API that Settings → API Keys already sells. Every
// detail is read off the API's code rather than described from memory:
// bearer keys starting sk_live_ (lib/http.ts there), 120 requests a minute
// per key, one POST per generation type, then GET /generations/:id to poll.
// It lives at /developers, not /api: /api/ is the route-handler namespace
// here and is disallowed in robots.ts.

const DESCRIPTION =
  "The Vixlens API: generate AI video and images from your own code with the same models, credits and pipeline as the web app.";

export const metadata: Metadata = {
  title: "API for AI video and image generation",
  description: DESCRIPTION,
  alternates: { canonical: "/developers" },
  openGraph: openGraph({
    images: "file",
    title: "API for AI video and image generation",
    description: DESCRIPTION,
    path: "/developers",
  }),
};

const API_TIER = PAID_TIERS.find((tier) => TIER_INFO[tier].apiAccess);

const ENDPOINT: Record<(typeof CLOUDFLARE_MODELS)[number]["category"], string> = {
  "text-to-image": "POST /generations/text-to-image",
  "text-to-video": "POST /generations/text-to-video",
  "image-to-video": "POST /generations/image-to-video",
};

const REQUEST = `curl -X POST "$VIXLENS_API_BASE/generations/text-to-image" \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "apikey: $VIXLENS_PUBLIC_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-image-2",
    "prompt": "A matte ceramic mug on a wooden table, morning window light",
    "size": "1024x1024",
    "quality": "medium"
  }'`;

const RESPONSE = `HTTP/1.1 201 Created
{
  "job_id": "7f3c…",
  "estimated_time_seconds": 3,
  "status": "pending",
  "model": "openai/gpt-image-2",
  "costCredits": …,
  …
}`;

const POLL = `curl "$VIXLENS_API_BASE/generations/7f3c…" \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "apikey: $VIXLENS_PUBLIC_KEY"

{ "status": "completed", "resultUrl": "https://…", "thumbnailUrl": "https://…", … }`;

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface-3 p-4 font-mono text-caption text-ink-soft">
      {children}
    </pre>
  );
}

export default function DevelopersPage() {
  const models = [...CLOUDFLARE_MODELS].sort((a, b) => a.category.localeCompare(b.category));

  return (
    <div className="container-page py-14 sm:py-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "API" }]} />

      <header className="mt-8 max-w-3xl">
        <h1 className="text-heading font-light text-ink sm:text-display">
          The Vixlens <span className="text-gradient">API</span>
        </h1>
        <p className="mt-4 text-body-lg text-muted">
          Generate video and images from your own code — the same models, the same credit balance
          and the same pipeline as the web app.
        </p>
        <p className="mt-4 text-body text-ink-soft">
          {API_TIER
            ? `API access is included on the ${TIER_INFO[API_TIER].label} plan.`
            : "API access is included on selected plans."}{" "}
          <Link href="/pricing" className="text-brand-ink underline-offset-4 hover:underline">
            See pricing
          </Link>
          .
        </p>
      </header>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <Card variant="standard">
          <h2 className="text-feature-title font-semibold text-ink">1. Authenticate</h2>
          <p className="mt-2 text-body-sm text-muted">
            Create a key in Settings → API Keys. Send it as a bearer token on every request; it acts
            as your account and spends your credits. Your API base URL and public key are shown on
            the same page. Each key is limited to 120 requests a minute, and keys can be revoked at
            any time.
          </p>
          <Code>{`Authorization: Bearer sk_live_...`}</Code>
        </Card>

        <Card variant="standard">
          <h2 className="text-feature-title font-semibold text-ink">2. Pricing</h2>
          <p className="mt-2 text-body-sm text-muted">
            API generations cost exactly what they cost in the web app: credits per generation,
            depending on the model, resolution and duration. Every response includes{" "}
            <code className="font-mono">costCredits</code>. Credit packs sell credits at $
            {CREDIT_VALUE_USD} each, and plans for less. Failed generations are refunded
            automatically.
          </p>
        </Card>
      </div>

      <section className="mt-14 max-w-3xl">
        <h2 className="text-heading font-bold text-ink">3. Create a generation</h2>
        <p className="mt-3 text-body text-muted">
          One endpoint per type. The body takes a <code className="font-mono">model</code> id from
          the table below, a <code className="font-mono">prompt</code>, and that model&apos;s own
          settings (its model page lists them).
        </p>
        <Code>{REQUEST}</Code>
        <Code>{RESPONSE}</Code>
      </section>

      <section className="mt-14 max-w-3xl">
        <h2 className="text-heading font-bold text-ink">4. Poll for the result</h2>
        <p className="mt-3 text-body text-muted">
          Generations run asynchronously. Poll the job until its status is{" "}
          <code className="font-mono">completed</code> or <code className="font-mono">failed</code>
          . Result links are signed and expire, so download the file rather than storing the URL.
        </p>
        <Code>{POLL}</Code>
      </section>

      <section className="mt-14">
        <h2 className="text-heading font-bold text-ink">Models</h2>
        <p className="mt-3 max-w-3xl text-body text-muted">
          Model ids and the endpoint each one uses. Seedance 2.5, Seedance 2.0 and the motion-control
          models take their own request shapes —{" "}
          <Link href="/contact" className="text-brand-ink underline-offset-4 hover:underline">
            ask us
          </Link>{" "}
          for details.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-2 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Id</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Endpoint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {models.map((model) => {
                const href = modelPageHref(model.id);
                return (
                  <tr key={model.id}>
                    <td className="px-4 py-3 text-ink">
                      {href ? (
                        <Link href={href} className="hover:text-brand-ink">
                          {model.label}
                        </Link>
                      ) : (
                        model.label
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-caption text-ink-soft">{model.id}</td>
                    <td className="px-4 py-3 text-muted">{CATEGORY_LABEL[model.category]}</td>
                    <td className="px-4 py-3 font-mono text-caption text-muted">{ENDPOINT[model.category]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
