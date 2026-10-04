"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import {
  useAdminPromoCodes,
  useAdminPromoRedemptions,
  useCreatePromoCode,
  useUpdatePromoCode,
  type AdminPromoCode,
  type AdminPromoCodeInput,
} from "@/hooks/use-admin-data";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { RECHARGE_PACKS, TIERS, TIER_INFO } from "@/lib/constants";
import { formatCredits, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChipGroup,
  FilterBar,
  ResultBar,
  SearchField,
} from "@/components/admin/filters";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  Td,
  Mono,
  Pagination,
  EmptyRow,
  LoadingBlock,
  ErrorBlock,
  ActionDialog,
  ClickableRow,
  CopyButton,
  When,
  formatDate,
} from "@/components/admin/ui";

/**
 * Promo codes: bonus credits on top of a plan or credit pack. The customer
 * types the code on the billing page; the bonus is granted once, when that
 * payment settles (a plan's first payment or upgrade, never a renewal), so a code never changes what Stripe charges. Codes are switched
 * off rather than deleted — their redemptions keep pointing at them.
 */

const DEFAULTS = { q: "", status: "", code: "" };
const FILTER_KEYS = ["q", "status"] as const;

type PromoStatus = "active" | "disabled" | "expired" | "exhausted";

/** Same precedence as the API's status filter. */
function promoStatus(p: AdminPromoCode): PromoStatus {
  if (p.disabledAt) return "disabled";
  if (p.maxRedemptions !== null && p.redemptions >= p.maxRedemptions)
    return "exhausted";
  if (p.expiresAt && new Date(p.expiresAt).getTime() <= Date.now())
    return "expired";
  return "active";
}

const STATUS_TONE: Record<PromoStatus, string> = {
  active: "border-success/30 bg-success/15 text-success",
  exhausted: "border-warning/30 bg-warning/15 text-warning",
  expired: "border-line bg-white/5 text-muted",
  disabled: "border-accent/30 bg-accent/15 text-accent",
};

/** What a code can be limited to, in the order the form lists them: the
 *  paid plans, then the credit packs. Mirrors PROMO_PRODUCTS in the API. */
const PRODUCT_GROUPS = [
  {
    label: "Plans",
    options: TIERS.filter((t) => t !== "free").map((t) => ({ id: t, label: TIER_INFO[t].label })),
  },
  {
    label: "Credit packs",
    options: RECHARGE_PACKS.map((p) => ({ id: p.id, label: formatCredits(p.credits) })),
  },
];

function productLabel(id: string) {
  const pack = RECHARGE_PACKS.find((p) => p.id === id);
  if (pack) return `${formatCredits(pack.credits)} pack`;
  return TIER_INFO[id as keyof typeof TIER_INFO]?.label ?? id;
}

function appliesToLabel(ids: string[]) {
  return ids.length === 0 ? "All plans & packs" : ids.map(productLabel).join(", ");
}

/** The form's own shape: every field a string, as the inputs hold them. */
type Draft = {
  code: string;
  bonus: string;
  appliesTo: string[];
  max: string;
  expires: string;
};

function toDraft(p?: AdminPromoCode): Draft {
  return {
    code: "",
    bonus: p ? String(p.bonusCredits) : "",
    appliesTo: p?.appliesTo ?? [],
    max: p?.maxRedemptions ? String(p.maxRedemptions) : "",
    // <input type="date"> wants the local calendar day.
    expires: p?.expiresAt
      ? new Date(p.expiresAt).toLocaleDateString("en-CA")
      : "",
  };
}

/** Validates the draft into the API's shape, or throws the message to show. */
function fromDraft(d: Draft): AdminPromoCodeInput {
  const bonusCredits = Number(d.bonus);
  if (!Number.isInteger(bonusCredits) || bonusCredits < 1) {
    throw new Error("Bonus credits must be a whole number of at least 1.");
  }
  const maxRedemptions = d.max.trim() ? Number(d.max) : null;
  if (
    maxRedemptions !== null &&
    (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)
  ) {
    throw new Error(
      "Max uses must be a whole number of at least 1, or empty for unlimited.",
    );
  }
  return {
    bonusCredits,
    appliesTo: d.appliesTo,
    maxRedemptions,
    // The code works through the whole of the chosen day, local time.
    expiresAt: d.expires
      ? new Date(`${d.expires}T23:59:59`).toISOString()
      : null,
  };
}

const inputClass =
  "w-full rounded-xl border border-line bg-surface-dark px-3.5 py-2.5 text-body-sm text-ink-soft placeholder:text-muted focus:border-border-strong focus:outline-none disabled:opacity-60";

function PromoFields({
  draft,
  onChange,
  disabled,
  withCode,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  disabled: boolean;
  withCode?: boolean;
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  return (
    <>
      {withCode && (
        <div>
          <label
            htmlFor="promo-code"
            className="mb-1.5 block text-label text-ink-soft"
          >
            Code{" "}
            <span className="text-muted">(leave empty to generate one)</span>
          </label>
          <input
            id="promo-code"
            value={draft.code}
            disabled={disabled}
            maxLength={32}
            onChange={(e) =>
              set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })
            }
            placeholder="e.g. LAUNCH200"
            className={cn(inputClass, "font-mono")}
          />
        </div>
      )}
      <div>
        <label
          htmlFor="promo-bonus"
          className="mb-1.5 block text-label text-ink-soft"
        >
          Bonus credits{" "}
          <span className="text-muted">(added on top of the pack)</span>
        </label>
        <input
          id="promo-bonus"
          type="number"
          min={1}
          value={draft.bonus}
          disabled={disabled}
          onChange={(e) => set({ bonus: e.target.value })}
          placeholder="e.g. 200"
          className={inputClass}
        />
      </div>
      <fieldset>
        <legend className="mb-1.5 block text-label text-ink-soft">
          Applies to <span className="text-muted">(none ticked = every plan and pack)</span>
        </legend>
        <div className="space-y-2">
          {PRODUCT_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="w-24 text-caption text-muted">{group.label}</span>
              {group.options.map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-body-sm text-ink-soft">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand"
                    disabled={disabled}
                    checked={draft.appliesTo.includes(option.id)}
                    onChange={(e) =>
                      set({
                        appliesTo: e.target.checked
                          ? [...draft.appliesTo, option.id]
                          : draft.appliesTo.filter((id) => id !== option.id),
                      })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="promo-max"
            className="mb-1.5 block text-label text-ink-soft"
          >
            Max uses <span className="text-muted">(total)</span>
          </label>
          <input
            id="promo-max"
            type="number"
            min={1}
            value={draft.max}
            disabled={disabled}
            onChange={(e) => set({ max: e.target.value })}
            placeholder="Unlimited"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="promo-expires"
            className="mb-1.5 block text-label text-ink-soft"
          >
            Last day
          </label>
          <input
            id="promo-expires"
            type="date"
            value={draft.expires}
            disabled={disabled}
            onChange={(e) => set({ expires: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-caption text-muted">
        Each account can use a code once.
      </p>
    </>
  );
}

function CreatePromoDialog() {
  const create = useCreatePromoCode();
  const [draft, setDraft] = useState<Draft>(toDraft);
  return (
    <ActionDialog
      trigger={
        <Button size="sm">
          <Plus className="size-4" aria-hidden="true" />
          New code
        </Button>
      }
      title="New promo code"
      description="Customers enter it on the billing page and get the bonus on top of a plan or credit pack — once, with the payment. The price doesn't change."
      confirmLabel="Create code"
      pending={create.isPending}
      extra={(disabled) => (
        <PromoFields
          draft={draft}
          onChange={setDraft}
          disabled={disabled}
          withCode
        />
      )}
      onConfirm={async (reason) => {
        await create.mutateAsync({
          ...fromDraft(draft),
          code: draft.code || undefined,
          reason,
        });
        setDraft(toDraft());
      }}
    />
  );
}

function EditPromoDialog({ promo }: { promo: AdminPromoCode }) {
  const update = useUpdatePromoCode();
  const [draft, setDraft] = useState<Draft>(() => toDraft(promo));
  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="ghost" aria-label={`Edit ${promo.code}`}>
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      }
      title={`Edit ${promo.code}`}
      description="Applies to checkouts opened from now on. Anyone already on Stripe's page keeps the bonus they were shown."
      confirmLabel="Save"
      pending={update.isPending}
      extra={(disabled) => (
        <PromoFields draft={draft} onChange={setDraft} disabled={disabled} />
      )}
      onConfirm={(reason) =>
        update.mutateAsync({
          id: promo.id,
          patch: { ...fromDraft(draft), reason },
        })
      }
    />
  );
}

function TogglePromoDialog({ promo }: { promo: AdminPromoCode }) {
  const update = useUpdatePromoCode();
  const enabling = Boolean(promo.disabledAt);
  return (
    <ActionDialog
      trigger={
        <Button
          size="sm"
          variant="ghost"
          aria-label={`${enabling ? "Enable" : "Disable"} ${promo.code}`}
          title={enabling ? "Enable" : "Disable"}
        >
          {enabling ? (
            <Power className="size-3.5" aria-hidden="true" />
          ) : (
            <PowerOff className="size-3.5" aria-hidden="true" />
          )}
        </Button>
      }
      title={`${enabling ? "Enable" : "Disable"} ${promo.code}`}
      description={
        enabling
          ? "Customers can use it again, within its limits."
          : "Customers can no longer apply it. Bonuses already granted stay, and so does a checkout already on Stripe's page."
      }
      confirmLabel={enabling ? "Enable" : "Disable"}
      destructive={!enabling}
      pending={update.isPending}
      onConfirm={(reason) =>
        update.mutateAsync({
          id: promo.id,
          patch: { active: enabling, reason },
        })
      }
    />
  );
}

function Redemptions({ promo }: { promo: AdminPromoCode }) {
  const { data, isLoading, isError, error } = useAdminPromoRedemptions(
    promo.id,
  );
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-label font-medium text-ink-soft">
        Who used <span className="font-mono text-brand">{promo.code}</span>
        {promo.note && (
          <span className="ml-2 font-normal text-muted">— {promo.note}</span>
        )}
      </h2>
      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : isError || !data ? (
          <ErrorBlock message={(error as Error)?.message} />
        ) : (
          <Table
            head={
              <>
                <Th>User</Th>
                <Th>Bought</Th>
                <Th className="text-right">Bonus</Th>
                <Th>Payment</Th>
                <Th>When</Th>
              </>
            }
          >
            {data.redemptions.length === 0 ? (
              <EmptyRow colSpan={5}>Nobody has used this code yet.</EmptyRow>
            ) : (
              data.redemptions.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link
                      href={`/admin/users/${r.userId}`}
                      className="hover:underline"
                    >
                      <Mono>{r.userEmail}</Mono>
                    </Link>
                  </Td>
                  <Td>{productLabel(r.product)}</Td>
                  <Td className="text-right text-accent-amber tabular-nums">
                    +{formatCredits(r.bonusCredits)}
                  </Td>
                  <Td>
                    <Mono>{r.paymentRef}</Mono>
                  </Td>
                  <Td>
                    <When value={r.createdAt} />
                  </Td>
                </tr>
              ))
            )}
          </Table>
        )}
      </Panel>
    </div>
  );
}

export default function AdminPromoCodesPage() {
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, {
    limit: 50,
  });
  const { data, isLoading, isError, error, isFetching, refetch } =
    useAdminPromoCodes({
      q: filters.q || undefined,
      status: filters.status || undefined,
      limit,
      offset,
    });

  if (isLoading) return <LoadingBlock />;
  if (isError || !data)
    return <ErrorBlock message={(error as Error)?.message} />;

  const { codes, total } = data;
  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);
  const selected = codes.find((p) => p.id === filters.code) ?? null;

  return (
    <div>
      <PageHeader
        title="Promo codes"
        subtitle="Bonus credits a customer gets on top of a plan or credit pack."
        actions={<CreatePromoDialog />}
      />

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Code or note"
          label="Search promo codes"
        />
        <ChipGroup
          label="Status"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={[
            { value: "", label: "All" },
            { value: "active", label: "Active" },
            { value: "exhausted", label: "Used up" },
            { value: "expired", label: "Expired" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
      </FilterBar>

      <ResultBar
        total={total}
        noun={total === 1 ? "code" : "codes"}
        fetching={isFetching}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => refetch()}
      />

      <Panel>
        <Table
          head={
            <>
              <Th>Code</Th>
              <Th className="text-right">Bonus</Th>
              <Th>Applies to</Th>
              <Th className="text-right">Uses</Th>
              <Th className="text-right">Granted</Th>
              <Th>Last day</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </>
          }
        >
          {codes.length === 0 ? (
            <EmptyRow colSpan={9}>
              {filtered
                ? "No codes match."
                : "No promo codes yet — create one to get started."}
            </EmptyRow>
          ) : (
            codes.map((p) => {
              const status = promoStatus(p);
              return (
                <ClickableRow
                  key={p.id}
                  selected={p.id === filters.code}
                  onActivate={() =>
                    update({ code: p.id === filters.code ? null : p.id })
                  }
                >
                  <Td>
                    <span className="flex items-center gap-1">
                      <span className="font-mono text-body-sm font-semibold text-ink">
                        {p.code}
                      </span>
                      <CopyButton value={p.code} label="Copy code" />
                    </span>
                    {p.note && (
                      <Mono className="block max-w-56 truncate" title={p.note}>
                        {p.note}
                      </Mono>
                    )}
                  </Td>
                  <Td className="text-right text-accent-amber tabular-nums">
                    +{formatCredits(p.bonusCredits)}
                  </Td>
                  <Td>{appliesToLabel(p.appliesTo)}</Td>
                  <Td className="text-right tabular-nums">
                    {p.redemptions.toLocaleString()}
                    <span className="text-muted">
                      {" "}
                      / {p.maxRedemptions?.toLocaleString() ?? "∞"}
                    </span>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatCredits(p.creditsGranted)}
                  </Td>
                  <Td>
                    <Mono>
                      {p.expiresAt ? formatDate(p.expiresAt) : "never"}
                    </Mono>
                  </Td>
                  <Td>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-caption font-medium capitalize",
                        STATUS_TONE[status],
                      )}
                    >
                      {status === "exhausted" ? "used up" : status}
                    </span>
                  </Td>
                  <Td>
                    <When value={p.createdAt} />
                    <Mono className="block">{p.createdBy}</Mono>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {/* Keyed on updatedAt so the form reopens on the saved values. */}
                    <EditPromoDialog key={p.updatedAt} promo={p} />
                    <TogglePromoDialog promo={p} />
                  </Td>
                </ClickableRow>
              );
            })
          )}
        </Table>
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          onOffset={(next) => update({ offset: next })}
          onLimit={(next) => update({ limit: next })}
        />
      </Panel>

      {selected ? (
        <Redemptions promo={selected} />
      ) : (
        codes.length > 0 && (
          <p className="mt-4 text-caption text-muted">
            Click a code to see who used it.
          </p>
        )
      )}
    </div>
  );
}
