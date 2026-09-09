"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Link2, Loader2, Lock, Unplug } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useSpotlight } from "@/hooks/use-spotlight";
import { CreatorSuiteUpsell, useCreatorSuite } from "@/components/upgrade-gate";
import { cn, formatDate } from "@/lib/utils";
import { PlatformIcon, platformTint } from "@/components/social/platform-icons";
import {
  useConnectSocial,
  useDisconnectSocial,
  useSocialAccounts,
  type PlatformInfo,
  type SocialAccount,
} from "@/hooks/use-social";

/** What each platform can actually do once connected, stated up front.
 *  These aren't our restrictions — they're the platforms' own rules about
 *  who may post through an API, and finding out afterwards is worse. */
const REQUIREMENTS: Record<string, string> = {
  tiktok: "Posts land in your TikTok drafts unless the app has passed TikTok's content-posting audit.",
  youtube: "Needs a YouTube channel on the Google account. Uploads stay private until Google verifies the app.",
  facebook: "Posts to a Facebook Page you manage — Facebook's API can't post to a personal profile.",
  instagram: "Needs an Instagram Business or Creator account linked to a Facebook Page.",
};

/**
 * Each card's state, as one value rather than three booleans read at four
 * different points in the markup. Colour never carries this on its own —
 * every pill pairs its tint with a word, and the two that matter also carry
 * an icon.
 */
type CardState = "connected" | "expired" | "available" | "unavailable";

function cardState(platform: PlatformInfo, linked: SocialAccount[]): CardState {
  if (!platform.configured) return "unavailable";
  if (linked.length === 0) return "available";
  return linked.some((a) => a.status !== "active") ? "expired" : "connected";
}

const STATUS: Record<CardState, { label: string; variant: BadgeVariant }> = {
  connected: { label: "Connected", variant: "success" },
  expired: { label: "Reconnect", variant: "accent" },
  available: { label: "Not connected", variant: "outline" },
  unavailable: { label: "Unavailable", variant: "neutral" },
};

export function SocialAccounts() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading, isError } = useSocialAccounts();
  const { allowed, isLoading: planLoading } = useCreatorSuite();
  const connect = useConnectSocial();
  const disconnect = useDisconnectSocial();

  // The OAuth callback redirects back here with its outcome in the query
  // string, since it has no other way to talk to this page. Consumed once
  // and stripped, so a refresh doesn't re-announce a week-old connection.
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");
  useEffect(() => {
    if (!connected && !error) return;
    if (connected) {
      toast({ title: `Connected ${connected}`, variant: "success" });
    } else if (error) {
      toast({ title: "Couldn't connect that account", description: error, variant: "error" });
    }
    router.replace("/settings/social");
  }, [connected, error, toast, router]);

  if (isLoading || planLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="py-16 text-center text-body-sm text-muted">Couldn&apos;t load your accounts.</p>;
  }

  // Connecting and publishing are gated (TIER_INFO.creatorSuite), disconnecting
  // never is: someone who downgrades still owns the accounts they linked, and a
  // page that hid them would leave a live token with no way to revoke it. So a
  // locked plan with nothing linked gets the upsell and nothing else, while a
  // locked plan with accounts still gets the cards — Connect disabled, Disconnect
  // working. The API draws the same line (routes/social.ts).
  if (!allowed && data.accounts.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeading />
        <CreatorSuiteUpsell feature="social-publishing" />
      </div>
    );
  }

  const byPlatform = new Map<string, SocialAccount[]>();
  for (const account of data.accounts) {
    byPlatform.set(account.platform, [...(byPlatform.get(account.platform) ?? []), account]);
  }

  return (
    <div className="space-y-6">
      <SectionHeading />

      {!allowed && (
        <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-3 text-body-sm text-ink-soft">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            Your plan no longer includes publishing, so these accounts can&apos;t be used to post and
            no new ones can be connected. Disconnecting still works.{" "}
            <Link href="/settings/billing" className="text-brand hover:text-brand-hover">
              See plans
            </Link>
            .
          </span>
        </p>
      )}

      {data.simulated && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 p-3 text-body-sm text-ink-soft">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          Simulated mode is on: connecting and publishing both complete without contacting a real
          platform. Turn off <code className="font-mono">SOCIAL_SIMULATE</code> once real
          credentials are in place.
        </p>
      )}

      {/* A grid rather than a stack of full-width rows: four peers with no
          ordering between them read better side by side, each one sized by
          its own content instead of every row stretching to the longest
          requirement line. Collapses to one column on narrow screens. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.platforms.map((platform) => (
          <PlatformCard
            key={platform.platform}
            platform={platform}
            linked={byPlatform.get(platform.platform) ?? []}
            // Scoped to the card that was actually clicked. `isPending` on
            // its own is one flag shared by all four, so a click on TikTok
            // put every button in a spinner and disabled the lot —
            // `variables` is the platform this in-flight call was fired for.
            connecting={connect.isPending && connect.variables === platform.platform}
            locked={!allowed}
            onConnect={() =>
              connect.mutate(platform.platform, {
                onError: (err) => toast({ title: (err as Error).message, variant: "error" }),
              })
            }
            onDisconnect={async (account) => {
              const ok = await confirm({
                title: `Disconnect ${account.displayName}?`,
                description:
                  "Anything still scheduled to this account is cancelled. Posts already published stay up.",
                confirmLabel: "Disconnect",
                tone: "danger",
              });
              if (ok) {
                disconnect.mutate(account.id, {
                  onError: (err) => toast({ title: (err as Error).message, variant: "error" }),
                  onSuccess: () => toast({ title: "Disconnected", variant: "success" }),
                });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** One copy of the page heading, shared by the upsell branch and the real
 *  one so they can't drift apart. */
function SectionHeading() {
  return (
    <div>
      <h2 className="font-display text-subheading font-bold tracking-tight text-ink">
        Social accounts
      </h2>
      <p className="mt-1 max-w-prose text-body-sm text-muted">
        Connect a platform to publish finished generations straight from the app — with a
        description, tags and a scheduled time.
      </p>
    </div>
  );
}

function PlatformCard({
  platform,
  linked,
  connecting,
  locked,
  onConnect,
  onDisconnect,
}: {
  platform: PlatformInfo;
  linked: SocialAccount[];
  connecting: boolean;
  /** Plan doesn't include publishing — see TIER_INFO.creatorSuite. */
  locked: boolean;
  onConnect: () => void;
  onDisconnect: (account: SocialAccount) => void;
}) {
  const spotlight = useSpotlight<HTMLDivElement>();
  const state = cardState(platform, linked);
  const tint = platformTint(platform.platform);
  const status = STATUS[state];

  return (
    <div
      {...spotlight}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 p-5 shadow-card",
        "transition-[border-color,box-shadow] duration-300 ease-out hover:border-border-strong hover:shadow-floating",
      )}
    >
      {/* Cursor-tracked glow in the platform's own colour — a blurred solid,
          not a radial-gradient(), matching every other glow in this app.
          Decoration only: nothing here is reachable by hover alone. */}
      <div
        className={cn(
          "pointer-events-none absolute size-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-10",
          tint.glow,
        )}
        style={{ left: "var(--spot-x, 50%)", top: "var(--spot-y, 0%)" }}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-3">
        <span
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tint.tile)}
        >
          <PlatformIcon platform={platform.platform} className="size-5.5" labelled />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label font-semibold text-ink">{platform.label}</p>
          {/* Word first, colour second — the pill never carries the state on
              tint alone, and the two states worth acting on carry a glyph. */}
          <Badge variant={status.variant} className="mt-1.5">
            {state === "connected" && <Check className="size-3" aria-hidden="true" />}
            {state === "expired" && <AlertTriangle className="size-3" aria-hidden="true" />}
            {status.label}
          </Badge>
        </div>
      </div>

      <p className="relative mt-3 flex-1 text-caption leading-relaxed text-muted">
        {platform.configured
          ? REQUIREMENTS[platform.platform]
          : "No credentials on this server yet — you can still export the caption and file from any generation and post by hand."}
      </p>

      {linked.length > 0 && (
        <ul className="relative mt-3 space-y-1.5">
          {linked.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-surface-3 py-1.5 pr-1.5 pl-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-caption text-ink-soft">
                  {account.displayName}
                </span>
                <span
                  className={cn(
                    "block text-[11px]",
                    account.status === "active" ? "text-muted" : "text-accent",
                  )}
                >
                  {account.status === "active"
                    ? `Since ${formatDate(account.connectedAt)}`
                    : "Access expired"}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={`Disconnect ${account.displayName}`}
                title="Disconnect"
                onClick={() => onDisconnect(account)}
              >
                <Unplug className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Same place in every card regardless of how long the copy above ran,
          so the eye doesn't hunt for the action between platforms. */}
      <Button
        variant={linked.length > 0 ? "secondary" : "primary"}
        className="relative mt-4 w-full"
        disabled={locked || !platform.configured || connecting}
        title={locked ? "Publishing is included on Creator and Studio" : undefined}
        onClick={onConnect}
      >
        {connecting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : locked ? (
          <Lock className="size-4" aria-hidden="true" />
        ) : (
          <Link2 className="size-4" aria-hidden="true" />
        )}
        {locked
          ? "Creator plan"
          : state === "expired"
            ? "Reconnect"
            : linked.length > 0
              ? "Connect another"
              : "Connect"}
      </Button>
    </div>
  );
}
