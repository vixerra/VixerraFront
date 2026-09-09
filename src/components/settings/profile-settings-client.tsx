"use client";

import { useMe } from "@/hooks/use-me";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ProfileForm } from "@/components/settings/profile-form";
import { VenetianMask } from "lucide-react";

export function ProfileSettingsClient() {
  const { data: user, isLoading } = useMe();

  return (
    <div className="max-w-lg space-y-6">
    <Card variant="standard">
      <h2 className="text-subheading font-semibold text-ink">Profile</h2>
      <p className="mt-1 text-body-sm text-muted">Update your name and avatar.</p>
      <div className="mt-6">
        {isLoading || !user ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <ProfileForm initialName={user.name} initialAvatarUrl={user.avatarUrl} email={user.email} />
        )}
      </div>
    </Card>

    {/* Read-only on purpose: the pen name is generated so that it can't be
      * traced back to the account, and letting people type their own would
      * invite exactly the identifying (or abusive) handles it exists to
      * avoid. It only appears once one has been minted — see
      * ShareIdentityModal. */}
    <Card variant="standard">
      <h2 className="text-subheading font-semibold text-ink">Community pen name</h2>
      <p className="mt-1 text-body-sm text-muted">
        The identity shown when you share a generation anonymously.
      </p>
      <div className="mt-6">
        {user?.nickname ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-dark p-3">
            {user.nicknameAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.nicknameAvatarUrl}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3">
                <VenetianMask className="size-5 text-muted" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-label font-semibold text-ink">{user.nickname}</p>
              <p className="text-caption text-text-tertiary">
                Used on every generation you share anonymously
              </p>
            </div>
          </div>
        ) : (
          <p className="text-body-sm text-muted">
            You&apos;ll be given one automatically the first time you share a generation
            anonymously.
          </p>
        )}
      </div>
    </Card>
    </div>
  );
}
