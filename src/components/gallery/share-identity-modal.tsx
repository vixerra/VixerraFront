"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Globe, RotateCcw, VenetianMask } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMe } from "@/hooks/use-me";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Asked once, before a generation goes public: whose name goes on it.
 *
 * Publishing is the point of no return for identity — once a piece is in the
 * community gallery under someone's real name, unsharing it doesn't unsee it.
 * So the choice is made deliberately here rather than being a setting buried
 * elsewhere that people discover after the fact.
 *
 * Unsharing skips this entirely; there's no identity question in taking
 * something down.
 */

type Identity = { nickname: string; nicknameAvatarUrl: string };

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return src ? (
    // Avatar hosts are arbitrary (Google, DiceBear, whatever a user pasted
    // into their profile), which next/image's allowlist can't cover.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="size-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-label font-semibold text-ink-soft">
      {fallback}
    </span>
  );
}

function IdentityOption({
  selected,
  onSelect,
  avatar,
  label,
  hint,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  avatar: React.ReactNode;
  label: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
        selected
          ? "border-brand bg-brand/10"
          : "border-line bg-surface-dark hover:border-border-strong",
      )}
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-label font-semibold text-ink">
          {icon}
          {label}
        </span>
        <span className="mt-0.5 block truncate text-caption text-muted">{hint}</span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-brand bg-brand text-on-brand" : "border-line",
        )}
        aria-hidden="true"
      >
        {selected && <Check className="size-3" />}
      </span>
    </button>
  );
}

export function ShareIdentityModal({
  open,
  onOpenChange,
  defaultAsNickname = false,
  onConfirm,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selects whatever this generation was last shared as. The caller
   *  remounts this component per generation (see the `key` in
   *  my-gallery-client), so this is read once as the initial value rather
   *  than synced back in an effect. */
  defaultAsNickname?: boolean;
  onConfirm: (shareAsNickname: boolean) => void;
  pending?: boolean;
}) {
  const { data: me } = useMe();
  const [asNickname, setAsNickname] = useState(defaultAsNickname);
  const [identity, setIdentity] = useState<Identity | null>(
    me?.nickname ? { nickname: me.nickname, nicknameAvatarUrl: me.nicknameAvatarUrl ?? "" } : null,
  );

  // Minted lazily: asking for it here means an account that never shares
  // anonymously never burns a handle. Idempotent, so reopening the dialog
  // returns the same pen name rather than rerolling it.
  const ensureNickname = useMutation({
    mutationFn: async (): Promise<Identity> => {
      const res = await apiFetch("/api/user/nickname", { method: "POST" });
      if (!res.ok) throw new Error("Could not prepare a pen name");
      return res.json();
    },
    onSuccess: setIdentity,
  });

  useEffect(() => {
    // isError guards the retry: without it a failing endpoint would be
    // re-called on every render for as long as the dialog stayed open.
    if (open && !identity && !ensureNickname.isPending && !ensureNickname.isError) {
      ensureNickname.mutate();
    }
    // ensureNickname is a stable mutation object; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, identity]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Share to the community"
      description="Choose the name this appears under in the community gallery."
    >
      <div className="mt-4 space-y-2">
        <IdentityOption
          selected={!asNickname}
          onSelect={() => setAsNickname(false)}
          avatar={<Avatar src={me?.avatarUrl ?? null} fallback={(me?.name ?? "?").charAt(0).toUpperCase()} />}
          icon={<Globe className="size-3.5 text-muted" aria-hidden="true" />}
          label={me?.name ?? "Your name"}
          hint="Credited to your profile"
        />

        <IdentityOption
          // Selecting this while it failed retries instead of doing nothing:
          // the pen name is fetched, so a bad deploy or a dropped connection
          // used to leave this row spinning forever with no way out.
          selected={asNickname}
          onSelect={() => {
            if (ensureNickname.isError) ensureNickname.reset();
            else setAsNickname(true);
          }}
          avatar={
            identity ? (
              <Avatar src={identity.nicknameAvatarUrl || null} fallback="?" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3">
                {ensureNickname.isError ? (
                  <RotateCcw className="size-4 text-muted" aria-hidden="true" />
                ) : (
                  <Spinner size={16} />
                )}
              </span>
            )
          }
          icon={<VenetianMask className="size-3.5 text-muted" aria-hidden="true" />}
          label={
            identity?.nickname ??
            (ensureNickname.isError ? "Pen name unavailable" : "Preparing a pen name…")
          }
          hint={
            ensureNickname.isError && !identity
              ? "Couldn't reach the server — tap to try again"
              : "Your real name and profile stay private"
          }
        />
      </div>

      <p className="mt-3 text-caption text-text-tertiary">
        This applies to this generation only — you can share the next one differently.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(asNickname)}
          // Sharing anonymously before the pen name exists would publish under
          // no byline at all, so that one option waits for it.
          disabled={pending || (asNickname && !identity)}
        >
          {pending ? <Spinner size={16} /> : <Globe className="size-4" aria-hidden="true" />}
          Share
        </Button>
      </div>
    </Modal>
  );
}
