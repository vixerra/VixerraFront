import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PasswordChangeForm } from "@/components/settings/password-change-form";

export const metadata: Metadata = { title: "Security" };

export default function SecuritySettingsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <Card variant="standard">
        <h2 className="text-subheading font-semibold text-ink">Change password</h2>
        <div className="mt-6">
          <PasswordChangeForm />
        </div>
      </Card>

      <Card variant="standard" className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-subheading font-semibold text-ink">
            Two-factor authentication
          </h2>
          <p className="mt-1 text-body-sm text-muted">
            Add an extra layer of security to your account.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Switch disabled />
          <span className="text-caption text-muted">Coming soon</span>
        </div>
      </Card>
    </div>
  );
}
