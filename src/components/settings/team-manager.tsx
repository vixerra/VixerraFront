"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Users, UserPlus, X, Crown, Check, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useMe } from "@/hooks/use-me";
import { TIER_INFO, type Tier } from "@/lib/constants";
import { apiFetch } from "@/lib/api-client";
import { useUsage, useInvalidateCredits } from "@/hooks/use-credits";
import { cn, formatDate, formatCredits } from "@/lib/utils";

export const MEMBER_ROLES = ["creator", "editor", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** What each role may do, in the owner's words rather than the schema's. */
export const ROLE_LABEL: Record<MemberRole, string> = {
  creator: "Creator",
  editor: "Editor",
  viewer: "Viewer",
};

/** A dot per role, ordered by how much it can do: the action colour for the
 *  role that spends credits, then silver, then muted. */
export const ROLE_DOT: Record<MemberRole, string> = {
  creator: "bg-brand",
  editor: "bg-silver",
  viewer: "bg-text-tertiary",
};

export const ROLE_BLURB: Record<MemberRole, string> = {
  creator: "Can generate, edit and publish",
  editor: "Can edit and publish, but not generate",
  viewer: "Can look, but not change anything",
};

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  /** Credits of the pool this member may spend per month; null = unlimited. */
  monthlyCreditLimit: number | null;
  /** Spent against the pool this month, derived from their generations. */
  spentThisMonth: number;
};
type Invite = { id: string; email: string; createdAt: string; expiresAt: string };
type TeamResponse =
  | { role: null }
  | { role: "owner"; organization: { id: string; name: string }; seats: number; members: Member[]; invites: Invite[] }
  | { role: "member"; organization: { id: string; name: string; ownerName: string }; members: Member[] };

/** An invite addressed to the signed-in user, waiting to be accepted. */
type MyInvite = {
  id: string;
  organizationName: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
};

/**
 * Invites waiting for this account.
 *
 * Fetched by email server-side, so joining a team never depends on finding
 * the invite email — the link still works, this is just the other door.
 */
function useMyInvites() {
  return useQuery({
    queryKey: ["my-invites"],
    queryFn: async (): Promise<MyInvite[]> => {
      const res = await apiFetch("/api/organization/invites/mine");
      if (!res.ok) throw new Error("Failed to load invites");
      return (await res.json()).invites ?? [];
    },
  });
}

/** The accept/decline panel, shown above the empty state for someone who has
 *  been invited but has no team yet. */
function PendingInvites({ invites, onChanged }: { invites: MyInvite[]; onChanged: () => void }) {
  const { toast } = useToast();

  const accept = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/organization/invites/${id}/accept`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't accept this invite.");
    },
    onSuccess: () => {
      toast({ title: "You're in", description: "You've joined the team.", variant: "success" });
      onChanged();
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't join", description: err.message, variant: "error" }),
  });

  const decline = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/organization/invites/${id}/decline`, { method: "POST" });
    },
    onSuccess: onChanged,
  });

  if (invites.length === 0) return null;

  return (
    <Card variant="standard" className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-brand" aria-hidden="true" />
        <h2 className="text-subheading font-semibold text-ink">
          {invites.length === 1 ? "You've been invited" : "You've been invited to a few teams"}
        </h2>
      </div>
      <div className="divide-y divide-line">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-label text-ink-soft">{invite.organizationName}</p>
              <p className="mt-1 text-caption text-muted">
                Invited by {invite.invitedByName} — expires {formatDate(invite.expiresAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => decline.mutate(invite.id)}
                loading={decline.isPending}
              >
                Decline
              </Button>
              <Button onClick={() => accept.mutate(invite.id)} loading={accept.isPending}>
                Join
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-caption text-muted">
        Joining a team means generating against its shared credit pool, with the owner&apos;s plan.
      </p>
    </Card>
  );
}

function useTeam() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: async (): Promise<TeamResponse> => {
      const res = await apiFetch("/api/organization");
      if (!res.ok) throw new Error("Failed to load team");
      return res.json();
    },
  });
}

export function TeamManager() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data, isLoading } = useTeam();
  const { data: myInvites } = useMyInvites();
  const { data: usage } = useUsage();
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["organization"] });

  // Anything that moves an allowance moves the owner's spendable balance in
  // the same breath — allocating reserves credits, removing a member frees
  // them. So the team query and the credit views have to be refreshed
  // together, or the badge keeps last minute's number until something else
  // happens to refetch it. ["usage"] is matched by prefix, so both the
  // personal and team variants of the key are invalidated.
  const invalidateCredits = useInvalidateCredits();
  const invalidateTeamAndCredits = () => {
    invalidate();
    invalidateCredits();
  };
  // Accepting an invite changes the team AND what this account can do (a
  // member inherits the owner's tier), so /me has to be refetched too or the
  // sidebar keeps the old locks until a reload.
  const invalidateAfterJoin = () => {
    queryClient.invalidateQueries({ queryKey: ["organization"] });
    queryClient.invalidateQueries({ queryKey: ["my-invites"] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
    queryClient.invalidateQueries({ queryKey: ["usage"] });
  };

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch("/api/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create team");
    },
    onSuccess: () => {
      toast({ title: "Team created", variant: "success" });
      invalidate();
    },
    onError: (err: Error) => toast({ title: "Couldn't create team", description: err.message, variant: "error" }),
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiFetch("/api/organization/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send invite");
    },
    onSuccess: () => {
      setInviteEmail("");
      toast({ title: "Invite sent", variant: "success" });
      invalidate();
    },
    onError: (err: Error) => toast({ title: "Couldn't send invite", description: err.message, variant: "error" }),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/organization/invites/${id}`, { method: "DELETE" });
    },
    onSuccess: invalidate,
  });

  // Role and allowance are one endpoint; either field may be sent alone.
  const updateMemberMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { role?: MemberRole; monthlyCreditLimit?: number | null };
    }) => {
      const res = await apiFetch(`/api/organization/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't update this member");
    },
    onSuccess: () => {
      toast({ title: "Member updated", variant: "success" });
      invalidateTeamAndCredits();
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't update member", description: err.message, variant: "error" }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/organization/members/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Member removed", variant: "success" });
      // Their unspent allowance returns to the pool immediately.
      invalidateTeamAndCredits();
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/organization/leave", { method: "POST" });
    },
    onSuccess: () => {
      toast({ title: "You left the team", variant: "success" });
      // Billing goes back to their own credits, so every balance changes.
      invalidateTeamAndCredits();
    },
  });

  if (isLoading || !data || !me) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const seats = me.tier in TIER_INFO ? TIER_INFO[me.tier as Tier].seats : 1;

  // No team yet, and this plan doesn't include extra seats — upsell rather
  // than a bare empty state, since this is the one settings page that's
  // genuinely plan-gated.
  const pending = myInvites ?? [];

  // Being invited is independent of your own plan: a free account can join a
  // Studio team, so the invite panel sits ABOVE the upsell rather than behind
  // it. Without this, the one screen an invitee is sent to would show them a
  // "buy Studio" card and no way to accept.
  if (data.role === null && seats <= 1) {
    return (
      <div className="space-y-6">
        <PendingInvites invites={pending} onChanged={invalidateAfterJoin} />
        <Card variant="standard" className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10">
          <Users className="size-5 text-brand" aria-hidden="true" />
        </span>
        <h2 className="text-subheading font-semibold text-ink">Team accounts are a Studio feature</h2>
        <p className="max-w-sm text-body-sm text-muted">
          Studio includes 3 seats — invite teammates to generate against one shared credit pool.
        </p>
          <Link href="/settings/billing" className={buttonVariants({ className: "mt-2" })}>
            View plans
          </Link>
        </Card>
      </div>
    );
  }

  if (data.role === null) {
    return (
      <div className="space-y-6">
        <PendingInvites invites={pending} onChanged={invalidateAfterJoin} />
        <Card variant="standard" className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10">
          <Users className="size-5 text-brand" aria-hidden="true" />
        </span>
        <h2 className="text-subheading font-semibold text-ink">Create your team</h2>
        <p className="max-w-sm text-body-sm text-muted">
          Your plan includes {seats} seats. Give your team a name to start inviting people.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (teamName.trim()) createMutation.mutate(teamName.trim());
          }}
          className="mt-2 flex w-full max-w-xs gap-2"
        >
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team name"
            aria-label="Team name"
          />
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (data.role === "member") {
    return (
      <div className="space-y-6">
        <Card variant="standard">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-subheading font-semibold text-ink">{data.organization.name}</h2>
              <p className="mt-1 text-body-sm text-muted">
                You&apos;re a member — {data.organization.ownerName} owns this team and its billing.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                const ok = await confirm({
                  title: `Leave ${data.organization.name}?`,
                  description:
                    "You lose access to the shared credit pool and go back to your own plan's credits. Only an owner can invite you back.",
                  confirmLabel: "Leave team",
                  tone: "danger",
                });
                if (ok) leaveMutation.mutate();
              }}
              loading={leaveMutation.isPending}
            >
              Leave team
            </Button>
          </div>
        </Card>
        <Card variant="standard" className="divide-y divide-line p-0">
          {data.members.map((m) => (
            <MemberRow key={m.id} member={m} isOwnerView={false} poolCeiling={0} />
          ))}
        </Card>
      </div>
    );
  }

  // What the owner may still hand out. An allowance is a reservation
  // against real credits, so the slider must not offer more than the pool
  // can back — a member's own current allowance is added back because it is
  // already counted in `reserved`.
  // `pool_balance` is the owner's raw ledger, independent of workspace.
  // The reservation is computed HERE from the member list rather than read
  // from /usage, because /usage only reports it for the team workspace — so
  // taking it from there would move this slider's ceiling depending on which
  // workspace the owner happened to be viewing from.
  const poolBalance = usage?.pool_balance ?? 0;
  const unspentAllowance = (m: Member) =>
    m.monthlyCreditLimit === null ? 0 : Math.max(0, m.monthlyCreditLimit - m.spentThisMonth);

  /** Everything this member could be given: the owner's credits, less what
   *  is promised to everyone ELSE. Their own allowance is not subtracted —
   *  it is the thing being moved. */
  const ceilingFor = (m: Member) => {
    const promisedToOthers = data.members
      .filter((other) => other.id !== m.id)
      .reduce((sum, other) => sum + unspentAllowance(other), 0);
    return Math.max(0, poolBalance - promisedToOthers);
  };

  // role === "owner"
  const seatsUsed = data.members.length + data.invites.length + 1; // +1 for the owner
  const seatsLeft = data.seats - seatsUsed;

  return (
    <div className="space-y-6">
      <Card variant="standard">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-subheading font-semibold text-ink">{data.organization.name}</h2>
            <p className="mt-1 text-body-sm text-muted">
              {seatsUsed} of {data.seats} seats used
            </p>
          </div>
        </div>
        {seatsLeft > 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inviteEmail.trim()) inviteMutation.mutate(inviteEmail.trim());
            }}
            className="mt-4 flex gap-2"
          >
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                required
              />
            </div>
            <Button type="submit" loading={inviteMutation.isPending}>
              <UserPlus className="size-4" /> Invite
            </Button>
          </form>
        )}
      </Card>

      <Card variant="standard" className="divide-y divide-line p-0">
        <div className="flex items-center gap-2 p-4">
          <Crown className="size-3.5 text-brand" aria-hidden="true" />
          <p className="text-label text-ink-soft">{me.name} (you) — owner</p>
        </div>
        {data.members.map((m) => (
          <MemberRow
            // Keyed on the committed values, not just the id: the slider
            // holds a local draft while dragging, and remounting on the
            // server's answer is what makes a REJECTED allowance (over the
            // pool, or below what they already spent) snap back instead of
            // sitting there looking saved.
            key={`${m.id}:${m.role}:${m.monthlyCreditLimit ?? "none"}`}
            member={m}
            poolCeiling={ceilingFor(m)}
            isOwnerView
            onUpdate={(patch) => updateMemberMutation.mutate({ id: m.id, patch })}
            onRemove={async () => {
              const ok = await confirm({
                title: `Remove ${m.name} from the team?`,
                description:
                  "They lose access to the shared credit pool right away. Their own generations are untouched, and you can re-invite them later.",
                confirmLabel: "Remove",
                tone: "danger",
              });
              if (ok) removeMemberMutation.mutate(m.id);
            }}
          />
        ))}
        {data.invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-label text-ink-soft">{invite.email}</p>
              <p className="mt-1 text-caption text-muted">
                Invited {formatDate(invite.createdAt)} — expires {formatDate(invite.expiresAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                const ok = await confirm({
                  title: `Cancel the invite to ${invite.email}?`,
                  description: "The link they were sent stops working. You can invite them again.",
                  confirmLabel: "Cancel invite",
                  cancelLabel: "Keep it",
                });
                if (ok) cancelInviteMutation.mutate(invite.id);
              }}
              aria-label="Cancel invite"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {data.members.length === 0 && data.invites.length === 0 && (
          <p className="p-6 text-center text-body-sm text-muted">No teammates yet — invite someone above.</p>
        )}
      </Card>
    </div>
  );
}

function MemberRow({
  member,
  isOwnerView,
  poolCeiling,
  onRemove,
  onUpdate,
}: {
  member: Member;
  isOwnerView: boolean;
  /** The top of the track: everything the owner could give this member —
   *  their own credits, minus what is promised to anyone else. */
  poolCeiling: number;
  onRemove?: () => void;
  onUpdate?: (patch: { role?: MemberRole; monthlyCreditLimit?: number | null }) => void;
}) {
  const role = (MEMBER_ROLES as readonly string[]).includes(member.role)
    ? (member.role as MemberRole)
    : "creator";

  const limited = member.monthlyCreditLimit !== null;
  const spent = member.spentThisMonth;
  // Local while dragging; the request fires on release, so one drag is one
  // PATCH rather than forty.
  const [draft, setDraft] = useState(member.monthlyCreditLimit ?? 0);

  const max = Math.max(poolCeiling, member.monthlyCreditLimit ?? 0, 100);
  const pctOf = (n: number) => (max > 0 ? Math.min(100, (n / max) * 100) : 0);

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-6">
      {/* Identity */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-label font-semibold text-ink-soft"
        >
          {member.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-label text-ink-soft">{member.name}</p>
          <p className="mt-0.5 truncate text-caption text-muted">{member.email}</p>
          <p className="mt-1.5 text-caption text-text-tertiary">{ROLE_BLURB[role]}</p>
        </div>
      </div>

      {isOwnerView && onUpdate ? (
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-80">
          <div className="flex items-center gap-2">
            {/* A styled menu rather than a native <select>: the option list
                of a native one is drawn by the operating system, so it lands
                as a white pane with a blue highlight in the middle of a dark
                app and cannot be themed. This also gives each role room for
                the one line that says what it actually means. */}
            <DropdownRoot>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  aria-label={`Role for ${member.name}: ${role}`}
                  className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-label text-ink-soft transition-colors hover:border-border-strong hover:bg-surface-3"
                >
                  <span className="flex items-center gap-2">
                    <i
                      aria-hidden="true"
                      className={cn("size-1.5 rounded-full", ROLE_DOT[role])}
                    />
                    {ROLE_LABEL[role]}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                </button>
              </DropdownTrigger>
              <DropdownContent align="start" className="min-w-[260px]">
                {MEMBER_ROLES.map((r) => (
                  <DropdownItem
                    key={r}
                    onSelect={() => {
                      if (r !== role) onUpdate({ role: r });
                    }}
                    className="flex items-start gap-2.5 py-2.5"
                  >
                    <i
                      aria-hidden="true"
                      className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", ROLE_DOT[r])}
                    />
                    <span className="flex-1">
                      <span className="block text-label text-ink">{ROLE_LABEL[r]}</span>
                      <span className="mt-0.5 block text-caption text-muted">{ROLE_BLURB[r]}</span>
                    </span>
                    {r === role && (
                      <Check className="mt-1 size-3.5 shrink-0 text-brand" aria-hidden="true" />
                    )}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </DropdownRoot>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                aria-label={`Remove ${member.name}`}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface-2 p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-caption text-muted">Monthly allowance</span>
              <span className="font-mono text-label font-semibold text-ink tabular-nums">
                {limited ? formatCredits(draft) : "Unlimited"}
              </span>
            </div>

            {limited ? (
              <>
                {/* ONE track. It runs from zero to the owner's credits, and
                    what the member has already used fills the start of it —
                    so the gap between the amber and the handle is exactly
                    what they have left, and the grey beyond the handle is
                    what the owner still holds back. */}
                <div className="relative mt-3">
                  <Slider
                    value={[draft]}
                    min={0}
                    max={max}
                    step={10}
                    aria-label={`Monthly credit allowance for ${member.name}`}
                    aria-valuetext={`${draft} credits, ${spent} already used`}
                    // The floor is what they have already spent: those
                    // credits are gone, so the allowance cannot go under
                    // them. The API refuses it too.
                    onValueChange={([next]) => setDraft(Math.max(spent, next))}
                    onValueCommit={([next]) =>
                      onUpdate({ monthlyCreditLimit: Math.max(spent, next) })
                    }
                  />
                  {/* Spent segment, laid over the start of the filled range
                      in the credits colour. Pointer-events off so it never
                      swallows a drag. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-accent-amber"
                    style={{ width: `${pctOf(spent)}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption">
                  <span className="flex items-center gap-1.5 text-muted">
                    <i className="size-2 rounded-full bg-accent-amber" aria-hidden="true" />
                    <span className="font-mono tabular-nums">{formatCredits(spent)}</span> used
                  </span>
                  <span className="flex items-center gap-1.5 text-muted">
                    <i className="size-2 rounded-full bg-brand" aria-hidden="true" />
                    <span className="font-mono tabular-nums">
                      {formatCredits(Math.max(0, draft - spent))}
                    </span>{" "}
                    left
                  </span>
                  <span className="ml-auto text-text-tertiary">
                    of {formatCredits(max)} yours
                  </span>
                </div>

                {spent > 0 && (
                  <p className="mt-2 text-caption text-text-tertiary">
                    Can&apos;t go below {formatCredits(spent)} — already spent this month.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-caption text-muted">
                Spending {formatCredits(spent)} of your pool this month, with no cap.
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                onUpdate({ monthlyCreditLimit: limited ? null : Math.max(spent, 500) })
              }
              className="mt-2.5 text-caption text-brand transition-colors hover:text-brand-hover"
            >
              {limited ? "Remove the limit" : "Set a limit"}
            </button>
          </div>
        </div>
      ) : (
        onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`Remove ${member.name}`}
          >
            <X className="size-4" />
          </Button>
        )
      )}
    </div>
  );
}
