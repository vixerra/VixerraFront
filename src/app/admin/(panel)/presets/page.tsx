"use client";

import { useState } from "react";
import { CopyPlus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  SortTh,
  Td,
  Mono,
  EmptyRow,
  LoadingBlock,
  ErrorBlock,
  Pagination,
  When,
} from "@/components/admin/ui";
import {
  ChipGroup,
  FilterBar,
  FilterSelect,
  ResultBar,
  SearchField,
} from "@/components/admin/filters";
import { PresetForm } from "@/components/admin/preset-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  PRESET_CATEGORIES,
  presetCredits,
  presetDurationLabel,
  presetDurationSeconds,
  presetResolution,
} from "@/lib/viral-presets";
import { nextSort, useUrlFilters } from "@/hooks/use-url-filters";
import {
  useAdminPresets,
  useCreatePreset,
  useUpdatePreset,
  useDeletePreset,
  type AdminPresetInput,
  type AdminPresetRow,
} from "@/hooks/use-admin-data";

/**
 * The preset catalogue, now editable.
 *
 * This page used to be read-only with a note explaining why: the catalogue
 * was a code constant, so there was no row to write to and no way to
 * attribute a generation back to a recipe. Both of those are fixed — presets
 * live in the "Preset" table and Generation carries a presetId — so the note
 * is gone and the usage column means something.
 *
 * One caveat survives and is stated in the UI rather than dropped: usage
 * counts only generations made since the presetId column existed. Nothing
 * before that can be attributed, and no backfill can invent it.
 */

const DEFAULTS = { q: "", category: "", published: "", sort: "sortOrder", dir: "asc" };
const FILTER_KEYS = ["q", "category", "published"] as const;

/** Orderings offered in the picker; each column header can set the same. */
const ORDERS = [
  { value: "sortOrder:asc", label: "Catalogue order" },
  { value: "title:asc", label: "Title A–Z" },
  { value: "usage:desc", label: "Most used" },
  { value: "createdAt:desc", label: "Newest" },
  { value: "updatedAt:desc", label: "Recently edited" },
];

/** A copy of a preset as the starting point for a new one: a free slug, a
 *  title that says what it is, and unpublished until someone decides. */
function duplicateOf(preset: AdminPresetRow): AdminPresetRow {
  return {
    ...preset,
    slug: `${preset.slug}-copy`.slice(0, 64),
    title: `${preset.title} (copy)`.slice(0, 80),
    published: false,
  };
}

export default function AdminPresetsPage() {
  const { filters, offset, limit, update, reset } = useUrlFilters(DEFAULTS, { limit: 25 });
  // null: closed. "new": a blank form. A row: the form pre-filled from it.
  const [creating, setCreating] = useState<AdminPresetRow | "new" | null>(null);
  const [editing, setEditing] = useState<AdminPresetRow | null>(null);
  const [deleting, setDeleting] = useState<AdminPresetRow | null>(null);
  const { toast } = useToast();

  const query = useAdminPresets({
    q: filters.q || undefined,
    category: filters.category || undefined,
    published: filters.published || undefined,
    sort: filters.sort,
    dir: filters.dir,
    limit,
    offset,
  });

  const create = useCreatePreset();
  const updatePreset = useUpdatePreset();
  const remove = useDeletePreset();

  const presets = query.data?.presets ?? [];
  const filtered = FILTER_KEYS.some((k) => filters[k] !== DEFAULTS[k]);
  const order = `${filters.sort}:${filters.dir}`;

  function submitCreate(value: AdminPresetInput) {
    create.mutate(value, { onSuccess: () => setCreating(null) });
  }

  function submitEdit(value: AdminPresetInput) {
    if (!editing) return;
    updatePreset.mutate({ id: editing.id, patch: value }, { onSuccess: () => setEditing(null) });
  }

  function togglePublished(preset: AdminPresetRow, published: boolean) {
    updatePreset.mutate(
      { id: preset.id, patch: { published } },
      {
        onSuccess: () =>
          toast({
            title: published ? `“${preset.title}” is live` : `“${preset.title}” is now a draft`,
            variant: "success",
          }),
        onError: (err) =>
          toast({ title: "Couldn't change it", description: (err as Error).message, variant: "error" }),
      },
    );
  }

  function sortBy(field: string) {
    update(nextSort(filters, field, field === "title" ? "asc" : "desc"));
  }

  // Each form opens clean — without this, an error from a publish switch
  // that failed a minute ago would greet the next edit.
  function openCreate(source: AdminPresetRow | "new") {
    create.reset();
    setCreating(source);
  }

  function openEdit(preset: AdminPresetRow) {
    updatePreset.reset();
    setEditing(preset);
  }

  return (
    <div>
      <PageHeader
        title="Presets"
        subtitle="The recipe catalogue. The switch publishes or hides a preset without opening it."
        actions={
          <Button onClick={() => openCreate("new")}>
            <Plus className="size-4" aria-hidden="true" />
            New preset
          </Button>
        }
      />

      <FilterBar>
        <SearchField
          value={filters.q}
          onChange={(q) => update({ q })}
          placeholder="Title, slug or preset id"
          label="Search presets"
        />
        <FilterSelect
          label="Category"
          value={filters.category}
          onChange={(category) => update({ category })}
          options={[
            { value: "", label: "All" },
            ...PRESET_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          label="Order"
          value={order}
          defaultValue="sortOrder:asc"
          onChange={(value) => {
            const [sort, dir] = value.split(":");
            update({ sort, dir });
          }}
          // A header click can pick an ordering the list doesn't name
          // ("least used"); say so rather than showing "usage:asc".
          options={
            ORDERS.some((o) => o.value === order)
              ? ORDERS
              : [{ value: order, label: "Set by column" }, ...ORDERS]
          }
        />
      </FilterBar>

      <FilterBar>
        <ChipGroup
          label="Status"
          value={filters.published}
          onChange={(published) => update({ published })}
          options={[
            { value: "", label: "All" },
            { value: "true", label: "Published" },
            { value: "false", label: "Drafts" },
          ]}
        />
      </FilterBar>

      <ResultBar
        total={query.data?.total}
        noun={query.data?.total === 1 ? "preset" : "presets"}
        fetching={query.isFetching && !query.isLoading}
        filtered={filtered}
        onClear={() => reset([...FILTER_KEYS])}
        onRefresh={() => query.refetch()}
      />

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={(query.error as Error).message} />
      ) : (
        <Panel>
          <Table
            head={
              <>
                <SortTh field="title" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                  Preset
                </SortTh>
                <Th>Category</Th>
                <Th>Model</Th>
                <Th>Settings</Th>
                <Th>Credits</Th>
                <SortTh field="usage" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                  Used
                </SortTh>
                <Th>Published</Th>
                <SortTh field="updatedAt" sort={filters.sort} dir={filters.dir} onSort={sortBy}>
                  Updated
                </SortTh>
                <Th />
              </>
            }
          >
            {presets.length === 0 ? (
              <EmptyRow colSpan={9}>
                No presets match these filters.{" "}
                {filtered && (
                  <button
                    type="button"
                    onClick={() => reset([...FILTER_KEYS])}
                    className="text-brand hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </EmptyRow>
            ) : (
              presets.map((preset) => (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  toggling={updatePreset.isPending && updatePreset.variables?.id === preset.id}
                  onTogglePublished={(published) => togglePublished(preset, published)}
                  onEdit={() => openEdit(preset)}
                  onDuplicate={() => openCreate(duplicateOf(preset))}
                  onDelete={() => setDeleting(preset)}
                />
              ))
            )}
          </Table>
          <Pagination
            total={query.data?.total ?? 0}
            limit={limit}
            offset={offset}
            onOffset={(next) => update({ offset: next })}
            onLimit={(next) => update({ limit: next })}
          />
        </Panel>
      )}

      <p className="mt-4 text-caption text-muted">
        &ldquo;Used&rdquo; counts generations made since presets moved into the database. Anything
        generated before that carries no preset reference and cannot be attributed retroactively.
      </p>

      <Modal
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        title={creating && creating !== "new" ? "Duplicate preset" : "New preset"}
        description={
          creating && creating !== "new"
            ? "A copy of the recipe, saved as a draft. Change the slug and title before creating it."
            : "The recipe is never shown to users — only the title, tagline and preview clip are."
        }
        className="max-w-3xl"
      >
        {creating !== null && (
          <PresetForm
            // Remount per source so a duplicate never inherits the blank
            // form's state, or another duplicate's.
            key={creating === "new" ? "new" : creating.id}
            initial={creating === "new" ? undefined : creating}
            pending={create.isPending}
            error={create.error ? (create.error as Error).message : null}
            submitLabel="Create preset"
            onSubmit={submitCreate}
            onCancel={() => setCreating(null)}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? `Edit ${editing.title}` : "Edit preset"}
        className="max-w-3xl"
      >
        {editing && (
          <PresetForm
            // Remount per preset so the form's initial state is re-read
            // instead of showing the previously opened recipe.
            key={editing.id}
            initial={editing}
            pending={updatePreset.isPending}
            error={updatePreset.error ? (updatePreset.error as Error).message : null}
            submitLabel="Save changes"
            onSubmit={submitEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete preset"
        description={
          deleting
            ? `"${deleting.title}" will be removed permanently. Unpublishing hides it from users without losing it.`
            : undefined
        }
      >
        {deleting && (
          <div className="space-y-4">
            {remove.error && <ErrorBlock message={(remove.error as Error).message} />}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  updatePreset.mutate(
                    { id: deleting.id, patch: { published: false } },
                    { onSuccess: () => setDeleting(null) },
                  )
                }
                disabled={updatePreset.isPending || !deleting.published}
              >
                Unpublish instead
              </Button>
              <Button
                onClick={() =>
                  remove.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })
                }
                disabled={remove.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PresetRow({
  preset,
  toggling,
  onTogglePublished,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  preset: AdminPresetRow;
  toggling: boolean;
  onTogglePublished: (published: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const resolution = presetResolution(preset.parameters);
  const credits = presetCredits(preset, {
    durationSeconds: presetDurationSeconds(preset.parameters),
    resolution,
  });

  return (
    <tr className="transition-colors hover:bg-white/[0.03]">
      <Td>
        <button type="button" onClick={onEdit} className="text-left">
          <span className="font-medium text-ink hover:underline">{preset.title}</span>
          <Mono className="block text-caption text-muted">{preset.slug}</Mono>
        </button>
      </Td>
      <Td>{preset.category}</Td>
      <Td>
        <Mono className="text-caption">{preset.model}</Mono>
        {preset.styleModel && (
          <Mono className="block text-caption text-muted">via {preset.styleModel}</Mono>
        )}
      </Td>
      <Td>
        {presetDurationLabel(preset.parameters)}
        {resolution ? ` · ${resolution}` : ""}
      </Td>
      <Td>{credits}</Td>
      <Td className="tabular-nums">{preset.usageCount.toLocaleString()}</Td>
      <Td>
        <div className="flex items-center gap-2">
          <Switch
            checked={preset.published}
            disabled={toggling}
            onCheckedChange={onTogglePublished}
            aria-label={preset.published ? `Unpublish ${preset.title}` : `Publish ${preset.title}`}
          />
          <span className={preset.published ? "text-caption text-success" : "text-caption text-muted"}>
            {preset.published ? "Live" : "Draft"}
          </span>
        </div>
      </Td>
      <Td>
        <When value={preset.updatedAt} />
      </Td>
      <Td>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${preset.title}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDuplicate}
            aria-label={`Duplicate ${preset.title}`}
            title="Duplicate"
          >
            <CopyPlus className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label={`Delete ${preset.title}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </Td>
    </tr>
  );
}
