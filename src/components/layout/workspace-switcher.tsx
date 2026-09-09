"use client";

import { Check, ChevronsUpDown, User as UserIcon, Users } from "lucide-react";

import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import {
  setWorkspace,
  useWorkspace,
  type Workspace,
} from "@/components/providers/workspace-provider";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown";

/**
 * Personal workspace vs the team's shared one.
 *
 * Renders nothing for an account with no team — a switcher with one option is
 * just noise, and the personal workspace is what a solo account already has.
 *
 * The team is named by its owner, so members see the owner's chosen name
 * rather than a generic "Team".
 */
export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { data: me } = useMe();
  const org = me?.organization ?? null;
  const workspace = useWorkspace(Boolean(org));

  if (!org) return null;

  const isTeam = workspace === "team";
  const label = isTeam ? org.name : "Personal";
  const Icon = isTeam ? Users : UserIcon;

  const choose = (next: Workspace) => setWorkspace(next);

  const trigger = (
    <button
      type="button"
      aria-label={`Workspace: ${label}. Switch workspace.`}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-line bg-surface-2 text-label transition-colors hover:border-border-strong hover:bg-surface-3",
        collapsed ? "size-8 justify-center p-0" : "w-full px-2.5 py-2",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md",
          isTeam ? "bg-brand/15" : "bg-white/8",
        )}
      >
        <Icon className={cn("size-3", isTeam ? "text-brand" : "text-muted")} aria-hidden="true" />
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-left text-ink-soft">{label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
        </>
      )}
    </button>
  );

  return (
    <DropdownRoot>
      <DropdownTrigger asChild>
        {collapsed ? (
          <Tooltip content={`Workspace: ${label}`} side="right">
            {trigger}
          </Tooltip>
        ) : (
          trigger
        )}
      </DropdownTrigger>
      <DropdownContent align="start" className="w-56">
        <DropdownItem onSelect={() => choose("personal")}>
          <UserIcon className="size-4 text-muted" aria-hidden="true" />
          <span className="flex-1">Personal</span>
          {!isTeam && <Check className="size-3.5 text-brand" aria-hidden="true" />}
        </DropdownItem>
        <DropdownItem onSelect={() => choose("team")}>
          <Users className="size-4 text-muted" aria-hidden="true" />
          <span className="flex-1 truncate">{org.name}</span>
          {isTeam && <Check className="size-3.5 text-brand" aria-hidden="true" />}
        </DropdownItem>
        <p className="px-2 pt-2 text-caption text-text-tertiary">
          {org.role === "owner"
            ? "Your team shares your credits."
            : "Team work is visible to everyone on the team."}
        </p>
      </DropdownContent>
    </DropdownRoot>
  );
}
