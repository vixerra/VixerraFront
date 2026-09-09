"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, ShieldCheck } from "lucide-react";
import {
  useAdminUser,
  useAdjustCredits,
  useChangeTier,
} from "@/hooks/use-admin-data";
import { TIERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  Td,
  Mono,
  StatusPill,
  EmptyRow,
  LoadingBlock,
  ErrorBlock,
  ActionDialog,
  formatDate,
} from "@/components/admin/ui";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useAdminUser(id);
  const changeTier = useChangeTier(id);
  const adjustCredits = useAdjustCredits(id);

  const [tier, setTier] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message} />;

  const { user, grants, generations, usage, audit } = data;

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-muted transition-colors hover:text-ink-soft"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All users
      </Link>

      <PageHeader
        title={user.name}
        subtitle={user.email}
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionDialog
              trigger={
                <Button size="sm" variant="secondary">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Change tier
                </Button>
              }
              title="Change plan tier"
              description={
                <>
                  Sets the plan column only — it does <strong>not</strong> grant that
                  tier&apos;s credits. Adjust credits separately if that&apos;s what you mean to
                  do.
                </>
              }
              confirmLabel="Change tier"
              pending={changeTier.isPending}
              extra={(disabled) => (
                <div>
                  <label htmlFor="tier-select" className="mb-1.5 block text-label text-ink-soft">
                    New tier <span className="text-muted">(currently {user.tier})</span>
                  </label>
                  <select
                    id="tier-select"
                    value={tier}
                    disabled={disabled}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-dark px-3.5 py-2.5 text-body-sm text-ink-soft focus:border-border-strong focus:outline-none"
                  >
                    <option value="">Select…</option>
                    {TIERS.filter((t) => t !== user.tier).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              onConfirm={async (reason) => {
                if (!tier) throw new Error("Pick a tier.");
                await changeTier.mutateAsync({ tier, reason });
                setTier("");
              }}
            />

            <ActionDialog
              trigger={
                <Button size="sm">
                  <Coins className="size-4" aria-hidden="true" />
                  Adjust credits
                </Button>
              }
              title="Adjust credits"
              description={
                <>
                  Positive grants credits (never expiring, marked{" "}
                  <code className="font-mono">admin_grant</code>). Negative claws them back,
                  soonest-expiring first, stopping at zero.
                </>
              }
              confirmLabel="Apply adjustment"
              pending={adjustCredits.isPending}
              extra={(disabled) => (
                <div>
                  <label htmlFor="credit-amount" className="mb-1.5 block text-label text-ink-soft">
                    Amount <span className="text-muted">(balance {user.creditBalance})</span>
                  </label>
                  <input
                    id="credit-amount"
                    type="number"
                    value={amount}
                    disabled={disabled}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500 or -200"
                    className="w-full rounded-xl border border-line bg-surface-dark px-3.5 py-2.5 text-body-sm text-ink-soft placeholder:text-muted focus:border-border-strong focus:outline-none"
                  />
                </div>
              )}
              onConfirm={async (reason) => {
                const n = Number(amount);
                if (!Number.isInteger(n) || n === 0) throw new Error("Enter a non-zero whole number.");
                await adjustCredits.mutateAsync({ amount: n, reason });
                setAmount("");
              }}
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tier", value: user.tier },
          { label: "Credit balance", value: user.creditBalance.toLocaleString() },
          { label: "Generations", value: user.generationCount },
          { label: "Joined", value: formatDate(user.createdAt) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface-2 p-4">
            <p className="text-caption tracking-wide text-muted uppercase">{s.label}</p>
            <p className="mt-1.5 font-display text-feature-title font-bold text-ink capitalize">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-label font-medium text-ink-soft">Credit grants</h2>
        <Panel>
          <Table
            head={
              <>
                <Th>Source</Th>
                <Th>Tier</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Remaining</Th>
                <Th>Expires</Th>
                <Th>Created</Th>
              </>
            }
          >
            {grants.length === 0 ? (
              <EmptyRow colSpan={6}>No grants yet.</EmptyRow>
            ) : (
              grants.map((g) => (
                <tr key={g.id}>
                  <Td>
                    <span className="rounded-full border border-line bg-white/5 px-2 py-0.5 font-mono text-caption">
                      {g.source}
                    </span>
                  </Td>
                  <Td className="capitalize">{g.tier}</Td>
                  <Td className="text-right">{g.amount.toLocaleString()}</Td>
                  <Td className="text-right text-accent-amber">{g.remaining.toLocaleString()}</Td>
                  <Td>
                    <Mono>{g.expiresAt ? formatDate(g.expiresAt) : "never"}</Mono>
                  </Td>
                  <Td>
                    <Mono>{formatDate(g.createdAt)}</Mono>
                  </Td>
                </tr>
              ))
            )}
          </Table>
        </Panel>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-label font-medium text-ink-soft">Recent generations</h2>
        <Panel>
          <Table
            head={
              <>
                <Th>Model</Th>
                <Th>Status</Th>
                <Th className="text-right">Cost</Th>
                <Th>Error</Th>
                <Th>Created</Th>
              </>
            }
          >
            {generations.length === 0 ? (
              <EmptyRow colSpan={5}>No generations yet.</EmptyRow>
            ) : (
              generations.map((g) => (
                <tr key={g.id}>
                  <Td>
                    <Mono className="text-ink-soft">{g.model}</Mono>
                  </Td>
                  <Td>
                    <StatusPill status={g.status} />
                  </Td>
                  <Td className="text-right">{g.costCredits}</Td>
                  <Td>
                    <Mono className="text-accent">{g.errorCode ?? "—"}</Mono>
                  </Td>
                  <Td>
                    <Mono>{formatDate(g.createdAt)}</Mono>
                  </Td>
                </tr>
              ))
            )}
          </Table>
        </Panel>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-label font-medium text-ink-soft">Monthly usage</h2>
          <Panel>
            <Table
              head={
                <>
                  <Th>Month</Th>
                  <Th className="text-right">Generations</Th>
                  <Th className="text-right">Credits used</Th>
                </>
              }
            >
              {usage.length === 0 ? (
                <EmptyRow colSpan={3}>No usage recorded.</EmptyRow>
              ) : (
                usage.map((u) => (
                  <tr key={u.monthYear}>
                    <Td>
                      <Mono>{u.monthYear}</Mono>
                    </Td>
                    <Td className="text-right">{u.generationsCount}</Td>
                    <Td className="text-right">{u.creditsUsed.toLocaleString()}</Td>
                  </tr>
                ))
              )}
            </Table>
          </Panel>
        </section>

        <section>
          <h2 className="mb-3 text-label font-medium text-ink-soft">Admin actions on this account</h2>
          <Panel className="p-4">
            {audit.length === 0 ? (
              <p className="py-6 text-center text-body-sm text-muted">
                Nothing has been changed by staff.
              </p>
            ) : (
              <ul className="space-y-3">
                {audit.map((a) => (
                  <li key={a.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <p className="text-body-sm text-ink-soft">
                      <span className="font-mono text-caption text-brand">{a.action}</span>{" "}
                      by {a.adminEmail}
                    </p>
                    {typeof a.details.reason === "string" && (
                      <p className="mt-0.5 text-caption text-muted">“{a.details.reason}”</p>
                    )}
                    <Mono className="mt-0.5 block">{formatDate(a.createdAt)}</Mono>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>
      </div>
    </div>
  );
}
