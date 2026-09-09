"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  PageHeader,
  Panel,
  Table,
  Th,
  Td,
  Mono,
  EmptyRow,
  LoadingBlock,
  ErrorBlock,
  Pagination,
  formatDate,
} from "@/components/admin/ui";
import { PresetForm } from "@/components/admin/preset-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/input";
import {
  PRESET_CATEGORIES,
  presetCredits,
  presetDurationLabel,
  presetDurationSeconds,
  presetResolution,
} from "@/lib/viral-presets";
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

const PAGE_SIZE = 25;

export default function AdminPresetsPage() {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminPresetRow | null>(null);
  const [deleting, setDeleting] = useState<AdminPresetRow | null>(null);

  const query = useAdminPresets({
    q: q || undefined,
    category: category || undefined,
    published: published || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const create = useCreatePreset();
  const update = useUpdatePreset();
  const remove = useDeletePreset();

  const presets = query.data?.presets ?? [];

  function submitCreate(value: AdminPresetInput) {
    create.mutate(value, { onSuccess: () => setCreating(false) });
  }

  function submitEdit(value: AdminPresetInput) {
    if (!editing) return;
    update.mutate({ id: editing.id, patch: value }, { onSuccess: () => setEditing(null) });
  }

  return (
    <div>
      <PageHeader
        title="Presets"
        subtitle={`${query.data?.total ?? 0} preset(s) in the catalogue.`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New preset
          </Button>
        }
      />

      <Panel className="mb-4 flex flex-wrap gap-3 p-4">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Search title or slug"
          className="max-w-xs"
        />
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All categories</option>
          {PRESET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={published}
          onChange={(e) => {
            setPublished(e.target.value);
            setPage(0);
          }}
          className="max-w-[10rem]"
        >
          <option value="">Any status</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </Select>
      </Panel>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={(query.error as Error).message} />
      ) : (
        <Panel>
          <Table
            head={
              <>
                <Th>Preset</Th>
                <Th>Category</Th>
                <Th>Model</Th>
                <Th>Settings</Th>
                <Th>Credits</Th>
                <Th>Used</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
                <Th />
              </>
            }
          >
            {presets.length === 0 ? (
              <EmptyRow colSpan={9}>No presets match these filters.</EmptyRow>
            ) : (
              presets.map((preset) => (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  onEdit={() => setEditing(preset)}
                  onDelete={() => setDeleting(preset)}
                />
              ))
            )}
          </Table>
          <Pagination
            total={query.data?.total ?? 0}
            limit={PAGE_SIZE}
            offset={page * PAGE_SIZE}
            onOffset={(next) => setPage(Math.floor(next / PAGE_SIZE))}
          />
        </Panel>
      )}

      <p className="mt-4 text-caption text-muted">
        &ldquo;Used&rdquo; counts generations made since presets moved into the database. Anything
        generated before that carries no preset reference and cannot be attributed retroactively.
      </p>

      <Modal
        open={creating}
        onOpenChange={(open) => !open && setCreating(false)}
        title="New preset"
        description="The recipe is never shown to users — only the title, tagline and preview clip are."
        className="max-w-3xl"
      >
        <PresetForm
          pending={create.isPending}
          error={create.error ? (create.error as Error).message : null}
          submitLabel="Create preset"
          onSubmit={submitCreate}
          onCancel={() => setCreating(false)}
        />
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
            pending={update.isPending}
            error={update.error ? (update.error as Error).message : null}
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
                  update.mutate(
                    { id: deleting.id, patch: { published: false } },
                    { onSuccess: () => setDeleting(null) },
                  )
                }
                disabled={update.isPending || !deleting.published}
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
  onEdit,
  onDelete,
}: {
  preset: AdminPresetRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const resolution = presetResolution(preset.parameters);
  const credits = presetCredits(preset, {
    durationSeconds: presetDurationSeconds(preset.parameters),
    resolution,
  });

  return (
    <tr>
      <Td>
        <div className="font-medium text-ink">{preset.title}</div>
        <Mono className="text-caption text-muted">{preset.slug}</Mono>
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
      <Td>{preset.usageCount}</Td>
      <Td>
        <span
          className={
            preset.published
              ? "rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-caption text-success"
              : "rounded-full border border-line bg-surface-3 px-2 py-0.5 text-caption text-muted"
          }
        >
          {preset.published ? "Published" : "Draft"}
        </span>
      </Td>
      <Td>{formatDate(preset.updatedAt)}</Td>
      <Td>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${preset.title}`}>
            <Pencil className="size-4" aria-hidden="true" />
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
