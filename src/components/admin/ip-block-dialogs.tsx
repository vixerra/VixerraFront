"use client";

import { useState, type ReactNode } from "react";
import {
  IP_BLOCK_DURATIONS,
  useBlockIp,
  useUnblockIp,
  type IpBlockDuration,
} from "@/hooks/use-admin-data";
import { cn } from "@/lib/utils";
import { ActionDialog } from "@/components/admin/ui";

/**
 * Blocking and unblocking an IP address or range, shared by the IP blocks
 * page and a user's page. The API decides what's valid (routes/admin-ip-
 * blocks.ts): one address or a range no wider than /16 (IPv4) or /32 (IPv6).
 */

const inputClass =
  "w-full rounded-xl border border-line bg-surface-dark px-3.5 py-2.5 text-body-sm text-ink-soft placeholder:text-muted focus:border-border-strong focus:outline-none disabled:opacity-60";

export function BlockIpDialog({
  trigger,
  defaultAddress = "",
  userId,
  yourIp,
}: {
  trigger: ReactNode;
  defaultAddress?: string;
  /** The account it's blocked from, recorded with the block. */
  userId?: string;
  /** The operator's own address, to warn before they block themselves. */
  yourIp?: string | null;
}) {
  const block = useBlockIp();
  const [address, setAddress] = useState(defaultAddress);
  // Not "until lifted": addresses get reassigned, and a permanent block on
  // one can end up shutting out a stranger.
  const [duration, setDuration] = useState<IpBlockDuration>("30d");
  const isYou = Boolean(yourIp) && address.trim() === yourIp;

  return (
    <ActionDialog
      trigger={trigger}
      title="Block an IP address"
      description={
        <>
          Every request from it is refused, signed in or not. This panel stays reachable. A VPN or
          mobile data gets around a block, and addresses change hands, so prefer a time limit.
        </>
      }
      confirmLabel="Block"
      destructive
      pending={block.isPending}
      extra={(disabled) => (
        <>
          <div>
            <label htmlFor="ip-block-address" className="mb-1.5 block text-label text-ink-soft">
              Address or range
            </label>
            <input
              id="ip-block-address"
              value={address}
              disabled={disabled}
              onChange={(e) => setAddress(e.target.value.replace(/\s/g, ""))}
              placeholder="203.0.113.7 or 203.0.113.0/24"
              className={cn(inputClass, "font-mono")}
            />
            <p className="mt-1.5 text-caption text-muted">
              For IPv6, block the /64: one connection usually holds all of it.
            </p>
            {isYou && (
              <p className="mt-1.5 text-caption text-warning">
                This is your own address. You&apos;d be locked out of the app, not the panel.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ip-block-duration" className="mb-1.5 block text-label text-ink-soft">
              For
            </label>
            <select
              id="ip-block-duration"
              value={duration}
              disabled={disabled}
              onChange={(e) => setDuration(e.target.value as IpBlockDuration)}
              className={inputClass}
            >
              {IP_BLOCK_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      onConfirm={async (reason) => {
        if (!address.trim()) throw new Error("Enter an address or range.");
        await block.mutateAsync({ address: address.trim(), duration, userId, reason });
        setAddress(defaultAddress);
      }}
    />
  );
}

export function UnblockIpDialog({
  trigger,
  blockId,
  address,
  expired,
}: {
  trigger: ReactNode;
  blockId: string;
  address: string;
  /** An expired block no longer applies; this only clears it away. */
  expired?: boolean;
}) {
  const unblock = useUnblockIp();
  return (
    <ActionDialog
      trigger={trigger}
      title={expired ? `Remove ${address}` : `Unblock ${address}`}
      description={
        expired
          ? "This block has already expired. Removing it only clears it from the list."
          : address.includes("/")
            ? "Lifts the whole range, for every address and account in it."
            : "Requests from this address are let through again within about 30 seconds."
      }
      confirmLabel={expired ? "Remove" : "Unblock"}
      pending={unblock.isPending}
      onConfirm={(reason) => unblock.mutateAsync({ id: blockId, reason })}
    />
  );
}
