import type { Metadata } from "next";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";

export const metadata: Metadata = { title: "API keys" };

export default function ApiKeysSettingsPage() {
  return (
    <div className="max-w-2xl">
      <ApiKeysManager />
    </div>
  );
}
