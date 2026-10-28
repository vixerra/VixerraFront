import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { McpClientSetup, McpEndpoint } from "@/components/marketing/mcp-setup";
import { Reveal } from "@/components/marketing/reveal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PAID_TIERS, TIER_INFO } from "@/lib/constants";
import { appHref } from "@/lib/hosts";
import { openGraph } from "@/lib/seo";

// The MCP server's public page. Like /developers, every claim is read off the
// API's code (routes/mcp.ts there): the nine tools and what each one does,
// API-key auth, generations queued and followed with get_generation (which
// waits up to 25s per call), and nothing billed beyond the web app's credits.
// The page lives on the site host at /mcp; the endpoint itself is the same
// path on api.vixlens.com (next.config.ts, src/proxy.ts).

const TITLE = "Vixlens MCP server for Claude, Cursor and AI agents";
const DESCRIPTION =
  "Connect Claude, Cursor, VS Code or any MCP client to Vixlens and generate AI video and images by asking for them in plain language.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/mcp" },
  openGraph: openGraph({ images: "file", title: TITLE, description: DESCRIPTION, path: "/mcp" }),
};

const API_TIER = PAID_TIERS.find((tier) => TIER_INFO[tier].apiAccess);

const EXAMPLES = [
  "Make a 5-second vertical video of a matcha latte being poured, with Seedance 2.5.",
  "Generate three square product shots of this sneaker on a concrete floor.",
  "Animate my logo photo into a short looping clip, then send me the link.",
];

const STEPS = [
  {
    title: "Add Vixlens to your client",
    body: "A custom connector in Claude, or one command or config block in Claude Code, Cursor or VS Code.",
  },
  {
    title: "Approve access",
    body: "Claude sends you to Vixlens to sign in and allow it. Other clients use a key from Settings → API Keys.",
  },
  {
    title: "Ask for what you want",
    body: "Your agent picks a model, queues the generation, waits for it and hands you the result link.",
  },
];

type Tool = { name: string; body: string; spends?: boolean };

const TOOLS: Tool[] = [
  { name: "list_models", body: "Every image and video model, with its inputs and settings." },
  { name: "generate_image", body: "Queue a text-to-image generation.", spends: true },
  { name: "generate_video", body: "Queue a video from text, or from a start image.", spends: true },
  { name: "list_presets", body: "The ready-made video recipes from the presets gallery." },
  { name: "generate_from_preset", body: "Run a preset on your own photo.", spends: true },
  { name: "get_generation", body: "Status and result link; can wait for it to finish." },
  { name: "list_generations", body: "Your recent generations, newest first." },
  { name: "upload_image", body: "Store an image from a link or file to use as input." },
  { name: "get_account", body: "Your plan and the credits you can still spend." },
];

const FAQ = [
  {
    q: "What is MCP?",
    a: "The Model Context Protocol is an open standard that lets AI assistants use outside tools. Once Vixlens is connected, your assistant can generate media for you the same way it reads files or searches the web.",
  },
  {
    q: "Does it cost extra?",
    a: "No. Generations made through MCP cost the same credits as in the web app, come out of the same balance, and are refunded automatically if they fail.",
  },
  {
    q: "Which clients work?",
    a: "Claude as a connector (web, desktop and mobile), plus any client that supports remote MCP servers over HTTP: Claude Code, Cursor, VS Code, Windsurf and others.",
  },
  {
    q: "Can I add it as a connector in Claude?",
    a: "Yes. In Settings → Connectors, add a custom connector with the endpoint above, then sign in to Vixlens and allow access. No API key needed, and it works on claude.ai, desktop and mobile.",
  },
  {
    q: "Where do my results go?",
    a: "Into your Vixlens gallery, like anything you make in the web app, so you can open, edit or share them there too.",
  },
  {
    q: "Is Unlimited available through MCP?",
    a: "No. Unlimited runs are a web-app benefit, so MCP and API generations always use credits.",
  },
];

export default function McpPage() {
  return (
    <div>
      <section className="container-page py-14 sm:py-20">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "MCP" }]} />

        <div className="mt-8 max-w-3xl">
          <p className="eyebrow">Model Context Protocol</p>
          <h1 className="mt-4 text-heading font-light text-ink sm:text-display">
            Vixlens for your <span className="text-gradient">AI agent</span>
          </h1>
          <p className="mt-5 max-w-2xl text-body-lg text-muted">
            Connect Claude, Cursor or any MCP client to Vixlens, then ask for a video or an image in
            plain language. Your agent picks the model, runs the generation and brings back the file.
          </p>

          <div className="mt-8">
            <McpEndpoint />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#setup" className={buttonVariants()}>
              Add to Claude
            </a>
            <Link
              href={appHref("/settings/api-keys")}
              prefetch={false}
              className={buttonVariants({ variant: "secondary" })}
            >
              Get an API key
            </Link>
          </div>

          <p className="mt-5 text-body-sm text-muted">
            {API_TIER
              ? `Connecting an agent is included on the ${TIER_INFO[API_TIER].label} plan.`
              : "Connecting an agent is included on selected plans."}{" "}
            <Link href="/pricing" className="text-brand-ink underline-offset-4 hover:underline">
              See pricing
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="container-page pb-14 sm:pb-20">
        <p className="eyebrow">Just ask</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {EXAMPLES.map((example, index) => (
            <Reveal key={example} delayMs={index * 100}>
              <Card variant="compact" className="h-full">
                <p className="text-caption font-bold tracking-[0.06em] text-text-tertiary uppercase">You</p>
                <p className="mt-3 text-body text-ink">&ldquo;{example}&rdquo;</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="setup" className="container-page scroll-mt-24 border-t border-line py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">Setup</p>
            <h2 className="mt-4 text-heading text-ink">Connected in a minute</h2>
            <ol className="mt-8 border-t border-line">
              {STEPS.map((step, index) => (
                <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-line py-5">
                  <span className="text-3xl leading-none font-light text-muted tabular-nums" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-label font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1 text-body-sm text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <Card variant="compact" className="min-w-0">
            <McpClientSetup />
            <p className="mt-5 text-body-sm text-muted">
              For the other clients, replace <code className="font-mono text-ink-soft">sk_live_...</code> with
              a key from Settings → API Keys. Keep it out of shared repositories: anyone holding it can
              spend your credits.
            </p>
          </Card>
        </div>
      </section>

      <section className="container-page border-t border-line py-14 sm:py-20">
        <div className="max-w-3xl">
          <p className="eyebrow">Tools</p>
          <h2 className="mt-4 text-heading text-ink">What your agent can do</h2>
          <p className="mt-4 text-body text-muted">
            Nine tools, the same ones the web app is built on. Only the three marked below spend
            credits, at the same price as the web app.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Card key={tool.name} variant="compact" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="font-mono text-body-sm text-ink">{tool.name}</code>
                {tool.spends && <Badge variant="outline">Uses credits</Badge>}
              </div>
              <p className="text-body-sm text-muted">{tool.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container-page border-t border-line py-14 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card variant="compact">
            <h3 className="text-feature-title font-semibold text-ink">Queued, not blocking</h3>
            <p className="mt-2 text-body-sm text-muted">
              Generations return a job right away. Your agent follows it with get_generation, which
              can wait up to 25 seconds per call, and checks again for longer videos.
            </p>
          </Card>
          <Card variant="compact">
            <h3 className="text-feature-title font-semibold text-ink">Same credits, same models</h3>
            <p className="mt-2 text-body-sm text-muted">
              Every model in the web app, billed from the same balance at the same price. Failed
              generations are refunded automatically.
            </p>
          </Card>
          <Card variant="compact">
            <h3 className="text-feature-title font-semibold text-ink">Your key, your limits</h3>
            <p className="mt-2 text-body-sm text-muted">
              Each key allows 120 requests a minute and can be revoked from Settings at any time.
              Prefer raw HTTP?{" "}
              <Link href="/developers" className="text-brand-ink underline-offset-4 hover:underline">
                Use the REST API
              </Link>
              .
            </p>
          </Card>
        </div>
      </section>

      <section className="container-page border-t border-line py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-4 text-heading text-ink">Questions</h2>
          </div>
          <dl className="border-t border-line">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-line py-6">
                <dt className="text-label font-semibold text-ink">{item.q}</dt>
                <dd className="mt-2 text-body-sm text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-page pb-20 sm:pb-28">
        <Card variant="compact" className="flex flex-col items-start gap-6 p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-subheading text-ink">Start generating from your agent</h2>
            <p className="mt-2 text-body text-muted">Add the connector, approve it, and ask.</p>
          </div>
          <a href="#setup" className={buttonVariants({ size: "lg" })}>
            Set it up
          </a>
        </Card>
      </section>
    </div>
  );
}
