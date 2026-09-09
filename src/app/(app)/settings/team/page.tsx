import type { Metadata } from "next";
import { TeamManager } from "@/components/settings/team-manager";

export const metadata: Metadata = { title: "Team" };

export default function TeamSettingsPage() {
  return (
    <div className="max-w-2xl">
      <TeamManager />
    </div>
  );
}
