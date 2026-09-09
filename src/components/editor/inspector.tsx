"use client";

import { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Music,
  Plus,
  Settings2,
  Sliders,
  Trash2,
  Type,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { clipDuration, formatTimecode } from "@/lib/editor/project";
import { probeAudioDuration } from "@/lib/editor/audio";
import { readLogoFile, ACCEPTED_LOGO_TYPES } from "@/lib/editor/image";
import { deleteAsset, putAsset, saveBrandKit } from "@/lib/editor/storage";
import {
  ASPECT_PRESETS,
  EXPORT_FPS,
  EXPORT_QUALITIES,
  FILTER_PRESETS,
  FIT_MODES,
  KEN_BURNS,
  NEUTRAL_FILTERS,
  TEXT_ANIMATIONS,
  TEXT_FONTS,
  TRANSITIONS,
  WATERMARK_POSITIONS,
  type AspectId,
  type Clip,
  type ExportFps,
  type FitMode,
  type KenBurns,
  type MusicTrack,
  type Project,
  type QualityId,
  type TextOverlay,
  type TransitionId,
  type Watermark,
  type WatermarkPosition,
} from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import { ColorRow, EmptyPanel, Field, PanelSection, Segmented, SliderRow } from "./controls";
import type { Selection } from "./timeline";

export type InspectorTab = "clip" | "text" | "brand" | "audio" | "output";

const TABS: { id: InspectorTab; label: string; icon: typeof Sliders }[] = [
  { id: "clip", label: "Clip", icon: Sliders },
  { id: "text", label: "Text", icon: Type },
  { id: "brand", label: "Brand", icon: ImageIcon },
  { id: "audio", label: "Audio", icon: Music },
  { id: "output", label: "Output", icon: Settings2 },
];

export function Inspector({
  project,
  duration,
  selection,
  tab,
  onTabChange,
  onSelect,
  onPatchProject,
  onPatchClip,
  onPatchOverlay,
  onAddOverlay,
  onRemoveOverlay,
  onDeleteClip,
}: {
  project: Project;
  /** Timeline length. Text overlays are bounded by it rather than by any one
   *  clip, so the panel has to be told — it can't derive it from a clip. */
  duration: number;
  selection: Selection;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onSelect: (selection: Selection) => void;
  onPatchProject: (patch: Partial<Project>) => void;
  onPatchClip: (clipId: string, patch: Partial<Clip>) => void;
  onPatchOverlay: (overlayId: string, patch: Partial<TextOverlay>) => void;
  onAddOverlay: () => void;
  onRemoveOverlay: (overlayId: string) => void;
  onDeleteClip: (clipId: string) => void;
}) {
  const selectedClip =
    selection?.kind === "clip" ? project.clips.find((c) => c.id === selection.id) : undefined;
  const selectedOverlay =
    selection?.kind === "overlay"
      ? project.overlays.find((o) => o.id === selection.id)
      : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 border-b border-border-subtle">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onTabChange(entry.id)}
            aria-pressed={tab === entry.id}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
              tab === entry.id
                ? "border-b-2 border-brand text-brand"
                : "border-b-2 border-transparent text-muted hover:text-ink-soft",
            )}
          >
            <entry.icon className="size-4" aria-hidden="true" />
            {entry.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "clip" &&
          (selectedClip ? (
            <ClipPanel
              clip={selectedClip}
              isFirst={project.clips[0]?.id === selectedClip.id}
              onPatch={(patch) => onPatchClip(selectedClip.id, patch)}
              onDelete={() => onDeleteClip(selectedClip.id)}
            />
          ) : (
            <EmptyPanel>Select a clip on the timeline to edit it.</EmptyPanel>
          ))}

        {tab === "text" && (
          <TextPanel
            project={project}
            duration={duration}
            overlay={selectedOverlay}
            onSelect={onSelect}
            onPatch={(patch) => selectedOverlay && onPatchOverlay(selectedOverlay.id, patch)}
            onAdd={onAddOverlay}
            onRemove={onRemoveOverlay}
          />
        )}

        {tab === "brand" && (
          <BrandPanel
            watermark={project.watermark}
            onPatch={(patch) => onPatchProject({ watermark: { ...project.watermark, ...patch } })}
          />
        )}

        {tab === "audio" && <AudioPanel project={project} onPatchProject={onPatchProject} />}

        {tab === "output" && <OutputPanel project={project} onPatchProject={onPatchProject} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ clip panel */

const SPEED_STEPS: { value: number; label: string }[] = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];

function ClipPanel({
  clip,
  isFirst,
  onPatch,
  onDelete,
}: {
  clip: Clip;
  isFirst: boolean;
  onPatch: (patch: Partial<Clip>) => void;
  onDelete: () => void;
}) {
  const [fineTune, setFineTune] = useState(false);
  const activePreset = FILTER_PRESETS.find(
    (preset) => JSON.stringify(preset.values) === JSON.stringify(clip.filters),
  );

  return (
    <>
      <PanelSection
        title="Clip"
        action={
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-accent/10 hover:text-accent"
            aria-label="Remove clip"
          >
            <Trash2 className="size-3.5" />
          </button>
        }
      >
        <p className="truncate text-body-sm text-ink-soft">{clip.label}</p>
        <p className="text-caption text-muted">
          {formatTimecode(clip.in)} → {formatTimecode(clip.out)} · {clipDuration(clip).toFixed(1)}s
          on the timeline
        </p>
      </PanelSection>

      <PanelSection title="Trim">
        <SliderRow
          label="Start"
          value={clip.in}
          min={0}
          max={Math.max(0, clip.out - 0.2)}
          step={0.05}
          onChange={(value) => onPatch({ in: value })}
          format={formatTimecode}
          defaultValue={0}
        />
        <SliderRow
          label="End"
          value={clip.out}
          min={Math.min(clip.sourceDuration, clip.in + 0.2)}
          max={clip.sourceDuration}
          step={0.05}
          onChange={(value) => onPatch({ out: value })}
          format={formatTimecode}
          defaultValue={clip.sourceDuration}
        />
      </PanelSection>

      <PanelSection title="Speed">
        <div className="flex gap-1">
          {SPEED_STEPS.map((step) => (
            <button
              key={step.value}
              type="button"
              onClick={() => onPatch({ speed: step.value })}
              className={cn(
                "flex-1 rounded-lg border py-1.5 text-caption font-medium transition-colors",
                Math.abs(clip.speed - step.value) < 0.001
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line text-muted hover:text-ink-soft",
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
        <SliderRow
          label="Fine speed"
          value={clip.speed}
          min={0.25}
          max={4}
          step={0.05}
          onChange={(value) => onPatch({ speed: value })}
          format={(v) => `${v.toFixed(2)}x`}
          defaultValue={1}
        />
      </PanelSection>

      <PanelSection title="Framing">
        <Field label="Fit">
          <Segmented<FitMode>
            value={clip.fit}
            columns={4}
            onChange={(fit) => onPatch({ fit })}
            options={FIT_MODES.map((mode) => ({
              value: mode,
              label: mode === "blur" ? "Blur bg" : mode,
              hint:
                mode === "blur"
                  ? "Fills the empty space with a blurred copy of the clip"
                  : undefined,
            }))}
          />
        </Field>
        <SliderRow
          label="Zoom"
          value={clip.scale}
          min={0.5}
          max={2.5}
          step={0.01}
          onChange={(scale) => onPatch({ scale })}
          format={(v) => `${Math.round(v * 100)}%`}
          defaultValue={1}
        />
        <SliderRow
          label="Pan X"
          value={clip.offsetX}
          min={-0.5}
          max={0.5}
          step={0.005}
          onChange={(offsetX) => onPatch({ offsetX })}
          format={(v) => `${Math.round(v * 100)}%`}
          defaultValue={0}
        />
        <SliderRow
          label="Pan Y"
          value={clip.offsetY}
          min={-0.5}
          max={0.5}
          step={0.005}
          onChange={(offsetY) => onPatch({ offsetY })}
          format={(v) => `${Math.round(v * 100)}%`}
          defaultValue={0}
        />
        <Field label="Motion">
          <Segmented<KenBurns>
            value={clip.kenBurns}
            columns={5}
            onChange={(kenBurns) => onPatch({ kenBurns })}
            options={KEN_BURNS.map((value) => ({
              value,
              label: value === "none" ? "Off" : value,
              hint: "A slow drift across the clip",
            }))}
          />
        </Field>
      </PanelSection>

      <PanelSection title="Transition in">
        {isFirst ? (
          <p className="text-caption text-muted">
            The first clip has nothing to transition from. Use the fade-in under Output for an
            opening fade.
          </p>
        ) : (
          <>
            <Segmented<TransitionId>
              value={clip.transition.type}
              columns={3}
              onChange={(type) => onPatch({ transition: { ...clip.transition, type } })}
              options={TRANSITIONS.map((t) => ({ value: t.id, label: t.label }))}
            />
            {clip.transition.type !== "none" && (
              <SliderRow
                label="Length"
                value={clip.transition.duration}
                min={0.1}
                max={2}
                step={0.05}
                onChange={(duration) => onPatch({ transition: { ...clip.transition, duration } })}
                format={(v) => `${v.toFixed(2)}s`}
                defaultValue={0.5}
              />
            )}
          </>
        )}
      </PanelSection>

      <PanelSection
        title="Look"
        action={
          <button
            type="button"
            onClick={() => setFineTune((v) => !v)}
            className="text-caption text-muted transition-colors hover:text-ink-soft"
          >
            {fineTune ? "Hide" : "Fine tune"}
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPatch({ filters: { ...preset.values } })}
              className={cn(
                "rounded-lg border py-1.5 text-caption transition-colors",
                activePreset?.id === preset.id
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line text-muted hover:text-ink-soft",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {fineTune && (
          <div className="space-y-3.5 border-t border-border-subtle pt-3.5">
            <SliderRow
              label="Brightness"
              value={clip.filters.brightness}
              min={0.4}
              max={1.8}
              step={0.01}
              onChange={(brightness) => onPatch({ filters: { ...clip.filters, brightness } })}
              defaultValue={1}
            />
            <SliderRow
              label="Contrast"
              value={clip.filters.contrast}
              min={0.4}
              max={2}
              step={0.01}
              onChange={(contrast) => onPatch({ filters: { ...clip.filters, contrast } })}
              defaultValue={1}
            />
            <SliderRow
              label="Saturation"
              value={clip.filters.saturate}
              min={0}
              max={2.5}
              step={0.01}
              onChange={(saturate) => onPatch({ filters: { ...clip.filters, saturate } })}
              defaultValue={1}
            />
            <SliderRow
              label="Hue"
              value={clip.filters.hueRotate}
              min={-180}
              max={180}
              step={1}
              onChange={(hueRotate) => onPatch({ filters: { ...clip.filters, hueRotate } })}
              format={(v) => `${Math.round(v)}°`}
              defaultValue={0}
            />
            <SliderRow
              label="Black & white"
              value={clip.filters.grayscale}
              min={0}
              max={1}
              step={0.01}
              onChange={(grayscale) => onPatch({ filters: { ...clip.filters, grayscale } })}
              format={(v) => `${Math.round(v * 100)}%`}
              defaultValue={0}
            />
            <SliderRow
              label="Blur"
              value={clip.filters.blur}
              min={0}
              max={1}
              step={0.01}
              onChange={(blur) => onPatch({ filters: { ...clip.filters, blur } })}
              format={(v) => `${Math.round(v * 100)}%`}
              defaultValue={0}
            />
            <SliderRow
              label="Vignette"
              value={clip.filters.vignette}
              min={0}
              max={1}
              step={0.01}
              onChange={(vignette) => onPatch({ filters: { ...clip.filters, vignette } })}
              format={(v) => `${Math.round(v * 100)}%`}
              defaultValue={0}
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onPatch({ filters: { ...NEUTRAL_FILTERS } })}
            >
              Reset look
            </Button>
          </div>
        )}
      </PanelSection>

      {/* Stills have no audio track, so a working-looking volume slider that
          can never do anything is worse than no slider. */}
      {clip.kind !== "image" && (
        <PanelSection title="Sound">
          <SliderRow
            label="Clip volume"
            value={clip.volume}
            min={0}
            max={1.5}
            step={0.01}
            onChange={(volume) => onPatch({ volume })}
            format={(v) => `${Math.round(v * 100)}%`}
            defaultValue={1}
          />
        </PanelSection>
      )}
    </>
  );
}

/* ------------------------------------------------------------ text panel */

function TextPanel({
  project,
  duration,
  overlay,
  onSelect,
  onPatch,
  onAdd,
  onRemove,
}: {
  project: Project;
  duration: number;
  overlay: TextOverlay | undefined;
  onSelect: (selection: Selection) => void;
  onPatch: (patch: Partial<TextOverlay>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <PanelSection
        title="Text overlays"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-caption text-brand transition-colors hover:text-brand-hover"
          >
            <Plus className="size-3" /> Add
          </button>
        }
      >
        {project.overlays.length === 0 ? (
          <p className="text-caption text-muted">
            Titles, captions and calls to action. They sit above every clip, so one can carry
            across a cut.
          </p>
        ) : (
          <div className="space-y-1">
            {project.overlays.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect({ kind: "overlay", id: entry.id })}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-caption transition-colors",
                  overlay?.id === entry.id
                    ? "bg-brand/10 text-brand"
                    : "text-muted hover:bg-white/5 hover:text-ink-soft",
                )}
              >
                <span className="truncate">{entry.text || "Empty"}</span>
                <span className="shrink-0 font-mono text-[10px] opacity-70">
                  {formatTimecode(entry.start)}
                </span>
              </button>
            ))}
          </div>
        )}
      </PanelSection>

      {!overlay ? (
        <EmptyPanel>Pick a text block above, or on the timeline, to style it.</EmptyPanel>
      ) : (
        <>
          <PanelSection
            title="Content"
            action={
              <button
                type="button"
                onClick={() => onRemove(overlay.id)}
                className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-accent/10 hover:text-accent"
                aria-label="Remove text"
              >
                <Trash2 className="size-3.5" />
              </button>
            }
          >
            <Textarea
              value={overlay.text}
              rows={3}
              onChange={(e) => onPatch({ text: e.target.value })}
              placeholder="Type your caption…"
            />
            <label className="flex items-center justify-between text-caption text-muted">
              Uppercase
              <Switch
                checked={overlay.uppercase}
                onCheckedChange={(uppercase) => onPatch({ uppercase })}
              />
            </label>
          </PanelSection>

          <PanelSection title="Timing">
            <SliderRow
              label="From"
              value={overlay.start}
              min={0}
              max={Math.max(0, overlay.end - 0.3)}
              step={0.05}
              onChange={(start) => onPatch({ start })}
              format={formatTimecode}
            />
            <SliderRow
              label="To"
              value={overlay.end}
              min={overlay.start + 0.3}
              // Clamped to the timeline, not to some arbitrary ceiling: an
              // overlay that outlives the video is invisible for its tail
              // and looks like it simply failed to appear.
              max={Math.max(overlay.start + 0.3, duration)}
              step={0.05}
              onChange={(end) => onPatch({ end })}
              format={formatTimecode}
            />
            <Field label="Entrance">
              <Segmented
                value={overlay.animation}
                columns={4}
                onChange={(animation) => onPatch({ animation })}
                options={TEXT_ANIMATIONS.map((value) => ({
                  value,
                  label: value === "none" ? "Off" : value,
                }))}
              />
            </Field>
          </PanelSection>

          <PanelSection title="Style">
            <Field label="Typeface">
              <Segmented
                value={overlay.font}
                columns={4}
                onChange={(font) => onPatch({ font })}
                options={TEXT_FONTS.map((f) => ({ value: f.id, label: f.label }))}
              />
            </Field>
            <Field label="Alignment">
              <Segmented
                value={overlay.align}
                onChange={(align) => onPatch({ align })}
                options={[
                  { value: "left" as const, label: "Left" },
                  { value: "center" as const, label: "Center" },
                  { value: "right" as const, label: "Right" },
                ]}
              />
            </Field>
            <SliderRow
              label="Size"
              value={overlay.size}
              min={0.02}
              max={0.16}
              step={0.002}
              onChange={(size) => onPatch({ size })}
              format={(v) => `${Math.round(v * 100)}%`}
              defaultValue={0.06}
            />
            <SliderRow
              label="Wrap width"
              value={overlay.maxWidth}
              min={0.3}
              max={1}
              step={0.01}
              onChange={(maxWidth) => onPatch({ maxWidth })}
              format={(v) => `${Math.round(v * 100)}%`}
              defaultValue={0.84}
            />
            <ColorRow label="Colour" value={overlay.color} onChange={(color) => onPatch({ color })} />
            <ColorRow
              label="Background"
              value={overlay.boxColor}
              allowNone
              onChange={(boxColor) => onPatch({ boxColor })}
            />
            <label className="flex items-center justify-between text-caption text-muted">
              Drop shadow
              <Switch checked={overlay.shadow} onCheckedChange={(shadow) => onPatch({ shadow })} />
            </label>
          </PanelSection>

          <PanelSection title="Position">
            <SliderRow
              label="Horizontal"
              value={overlay.x}
              min={0}
              max={1}
              step={0.005}
              onChange={(x) => onPatch({ x })}
              format={(v) => `${Math.round(v * 100)}%`}
              defaultValue={0.5}
            />
            <SliderRow
              label="Vertical"
              value={overlay.y}
              min={0}
              max={1}
              step={0.005}
              onChange={(y) => onPatch({ y })}
              format={(v) => `${Math.round(v * 100)}%`}
              defaultValue={0.72}
            />
          </PanelSection>
        </>
      )}
    </>
  );
}

/* ----------------------------------------------------------- brand panel */

function BrandPanel({
  watermark,
  onPatch,
}: {
  watermark: Watermark;
  onPatch: (patch: Partial<Watermark>) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      onPatch({ imageDataUrl: await readLogoFile(file), kind: "image", enabled: true });
    } catch (error) {
      toast({
        title: "Couldn't use that image",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setReading(false);
    }
  };

  return (
    <>
      <PanelSection title="Watermark">
        <label className="flex items-center justify-between text-body-sm text-ink-soft">
          Show on this video
          <Switch checked={watermark.enabled} onCheckedChange={(enabled) => onPatch({ enabled })} />
        </label>
        <Segmented
          value={watermark.kind}
          onChange={(kind) => onPatch({ kind })}
          options={[
            { value: "text" as const, label: "Text" },
            { value: "image" as const, label: "Logo" },
          ]}
        />

        {watermark.kind === "text" ? (
          <>
            <Input
              value={watermark.text}
              onChange={(e) => onPatch({ text: e.target.value })}
              placeholder="@yourhandle"
              maxLength={40}
            />
            <ColorRow label="Colour" value={watermark.color} onChange={(color) => onPatch({ color })} />
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-[repeating-conic-gradient(#1a1a1e_0%_25%,#101013_0%_50%)] bg-[length:12px_12px]">
                {watermark.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={watermark.imageDataUrl} alt="" className="max-h-full max-w-full" />
                ) : (
                  <ImageIcon className="size-5 text-text-tertiary" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={reading}
                  className="w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {watermark.imageDataUrl ? "Replace logo" : "Upload logo"}
                </Button>
                <p className="mt-1 text-[10px] text-text-tertiary">
                  PNG with transparency works best.
                </p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_LOGO_TYPES}
              className="hidden"
              onChange={(e) => {
                void pickLogo(e.target.files?.[0]);
                // Cleared so re-picking the same file still fires a change.
                e.target.value = "";
              }}
            />
          </div>
        )}
      </PanelSection>

      <PanelSection title="Placement">
        <div className="grid grid-cols-3 gap-1.5">
          {WATERMARK_POSITIONS.map((position) => (
            <button
              key={position}
              type="button"
              onClick={() => onPatch({ position })}
              aria-label={position.replace("-", " ")}
              aria-pressed={watermark.position === position}
              className={cn(
                // The dot is placed by the same nine-way alignment the
                // setting itself means, so the control is a small map of the
                // frame rather than nine identical squares.
                "flex aspect-[4/3] rounded-lg border p-1 transition-colors",
                ANCHOR_ALIGNMENT[position],
                watermark.position === position
                  ? "border-brand bg-brand/15"
                  : "border-line hover:border-border-strong",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  watermark.position === position ? "bg-brand" : "bg-muted",
                )}
              />
            </button>
          ))}
        </div>
        <SliderRow
          label="Size"
          value={watermark.size}
          min={0.05}
          max={0.6}
          step={0.005}
          onChange={(size) => onPatch({ size })}
          format={(v) => `${Math.round(v * 100)}%`}
          defaultValue={0.22}
        />
        <SliderRow
          label="Opacity"
          value={watermark.opacity}
          min={0.1}
          max={1}
          step={0.01}
          onChange={(opacity) => onPatch({ opacity })}
          format={(v) => `${Math.round(v * 100)}%`}
          defaultValue={0.85}
        />
        <SliderRow
          label="Edge margin"
          value={watermark.margin}
          min={0}
          max={0.15}
          step={0.005}
          onChange={(margin) => onPatch({ margin })}
          format={(v) => `${Math.round(v * 100)}%`}
          defaultValue={0.04}
        />
      </PanelSection>

      <PanelSection title="Brand kit">
        <p className="text-caption text-muted">
          Store this watermark so every new edit starts with it already set up. It stays switched
          off until you turn it on — putting your mark on a video should be a decision.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => {
            saveBrandKit(watermark);
            toast({ title: "Saved to your brand kit", variant: "success" });
          }}
        >
          Save as my brand kit
        </Button>
      </PanelSection>
    </>
  );
}

/**
 * Flex alignment matching each anchor, written out in full rather than
 * assembled from the string.
 *
 * Tailwind scans source for complete class names — a template literal like
 * `items-${x}` produces classes that exist at runtime and in no stylesheet,
 * which is exactly how a control like this silently ends up with every dot
 * in the top-left corner.
 */
const ANCHOR_ALIGNMENT: Record<WatermarkPosition, string> = {
  "top-left": "items-start justify-start",
  "top-center": "items-start justify-center",
  "top-right": "items-start justify-end",
  "center-left": "items-center justify-start",
  center: "items-center justify-center",
  "center-right": "items-center justify-end",
  "bottom-left": "items-end justify-start",
  "bottom-center": "items-end justify-center",
  "bottom-right": "items-end justify-end",
};

/* ----------------------------------------------------------- audio panel */

function AudioPanel({
  project,
  onPatchProject,
}: {
  project: Project;
  onPatchProject: (patch: Partial<Project>) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [attaching, setAttaching] = useState(false);
  const music = project.music;

  const attach = async (file: File | undefined) => {
    if (!file) return;
    setAttaching(true);
    try {
      const duration = await probeAudioDuration(file);
      const assetId = crypto.randomUUID();
      await putAsset(assetId, file);
      // The old track's blob is dropped rather than orphaned in IndexedDB —
      // nothing else references it once the project points elsewhere.
      if (music) void deleteAsset(music.assetId);
      const track: MusicTrack = {
        assetId,
        name: file.name,
        duration,
        volume: 0.35,
        offset: 0,
        fadeIn: 0.5,
        fadeOut: 1,
        loop: true,
      };
      onPatchProject({ music: track });
    } catch (error) {
      toast({
        title: "Couldn't use that audio",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setAttaching(false);
    }
  };

  const patchMusic = (patch: Partial<MusicTrack>) => {
    if (!music) return;
    onPatchProject({ music: { ...music, ...patch } });
  };

  return (
    <>
      <PanelSection title="Original audio">
        <label className="flex items-center justify-between text-body-sm text-ink-soft">
          Keep clip audio
          <Switch
            checked={project.keepSourceAudio}
            onCheckedChange={(keepSourceAudio) => onPatchProject({ keepSourceAudio })}
          />
        </label>
        <p className="text-caption text-muted">
          Each clip has its own volume under the Clip tab. Turn this off for a silent cut with
          music over it.
        </p>
      </PanelSection>

      <PanelSection title="Music">
        {music ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-dark px-3 py-2">
              <Music className="size-4 shrink-0 text-brand" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-caption text-ink-soft">{music.name}</p>
                <p className="text-[10px] text-text-tertiary">
                  {formatTimecode(music.duration)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void deleteAsset(music.assetId);
                  onPatchProject({ music: null });
                }}
                className="rounded-md p-1 text-text-tertiary transition-colors hover:text-accent"
                aria-label="Remove music"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <SliderRow
              label="Volume"
              value={music.volume}
              min={0}
              max={1}
              step={0.01}
              onChange={(volume) => patchMusic({ volume })}
              format={(v) => `${Math.round(v * 100)}%`}
              defaultValue={0.35}
            />
            <SliderRow
              label="Start at"
              value={music.offset}
              min={0}
              max={Math.max(0, music.duration - 1)}
              step={0.1}
              onChange={(offset) => patchMusic({ offset })}
              format={formatTimecode}
              defaultValue={0}
            />
            <SliderRow
              label="Fade in"
              value={music.fadeIn}
              min={0}
              max={5}
              step={0.1}
              onChange={(fadeIn) => patchMusic({ fadeIn })}
              format={(v) => `${v.toFixed(1)}s`}
              defaultValue={0.5}
            />
            <SliderRow
              label="Fade out"
              value={music.fadeOut}
              min={0}
              max={5}
              step={0.1}
              onChange={(fadeOut) => patchMusic({ fadeOut })}
              format={(v) => `${v.toFixed(1)}s`}
              defaultValue={1}
            />
            <label className="flex items-center justify-between text-caption text-muted">
              Loop to fill the edit
              <Switch checked={music.loop} onCheckedChange={(loop) => patchMusic({ loop })} />
            </label>
          </>
        ) : (
          <>
            <p className="text-caption text-muted">
              Add a track from your machine. It is mixed in at export time and never leaves your
              browser until then — only the finished video is uploaded.
            </p>
            <Button
              variant="secondary"
              size="sm"
              loading={attaching}
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" /> Add music
            </Button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            void attach(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="text-[10px] text-text-tertiary">
          Only add music you have the rights to. Platforms mute or take down posts over it.
        </p>
      </PanelSection>
    </>
  );
}

/* ---------------------------------------------------------- output panel */

function OutputPanel({
  project,
  onPatchProject,
}: {
  project: Project;
  onPatchProject: (patch: Partial<Project>) => void;
}) {
  return (
    <>
      <PanelSection title="Frame">
        <div className="grid grid-cols-1 gap-1.5">
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPatchProject({ aspect: preset.id as AspectId })}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                project.aspect === preset.id
                  ? "border-brand bg-brand/10"
                  : "border-line hover:border-border-strong",
              )}
            >
              <span
                className={cn(
                  "shrink-0 rounded-[3px] border",
                  project.aspect === preset.id ? "border-brand bg-brand/30" : "border-muted",
                )}
                style={{
                  width: 18 * Math.min(1, preset.w / preset.h),
                  height: 18 * Math.min(1, preset.h / preset.w),
                }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-caption text-ink-soft">
                  {preset.label} · {preset.id}
                </span>
                <span className="block text-[10px] text-text-tertiary">{preset.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Quality">
        <Segmented<QualityId>
          value={project.quality}
          columns={3}
          onChange={(quality) => onPatchProject({ quality })}
          options={EXPORT_QUALITIES.map((q) => ({ value: q.id, label: q.label, hint: q.hint }))}
        />
        <Field label="Frame rate">
          <Segmented<ExportFps>
            value={project.fps}
            columns={3}
            onChange={(fps) => onPatchProject({ fps })}
            options={EXPORT_FPS.map((fps) => ({ value: fps, label: `${fps} fps` }))}
          />
        </Field>
      </PanelSection>

      <PanelSection title="Background">
        <p className="text-caption text-muted">
          Shows through letterboxing and under fades.
        </p>
        <ColorRow
          label="Colour"
          value={project.background}
          onChange={(background) => onPatchProject({ background })}
        />
      </PanelSection>

      <PanelSection title="Opening & closing">
        <SliderRow
          label="Fade in"
          value={project.fadeIn}
          min={0}
          max={3}
          step={0.05}
          onChange={(fadeIn) => onPatchProject({ fadeIn })}
          format={(v) => `${v.toFixed(2)}s`}
          defaultValue={0}
        />
        <SliderRow
          label="Fade out"
          value={project.fadeOut}
          min={0}
          max={3}
          step={0.05}
          onChange={(fadeOut) => onPatchProject({ fadeOut })}
          format={(v) => `${v.toFixed(2)}s`}
          defaultValue={0}
        />
      </PanelSection>
    </>
  );
}
