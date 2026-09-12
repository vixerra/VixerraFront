"use client";

import { workspaceQuery } from "@/components/providers/workspace-provider";
import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import {
  Clock,
  FileType,
  FolderOpen,
  Gauge,
  Info,
  Maximize,
  Monitor,
  Package,
  RectangleHorizontal,
  SlidersHorizontal,
  Timer,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { cn, formatCredits } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Slider } from "@/components/ui/slider";
import { useGeneration } from "@/hooks/use-generation";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import {
  PanelSection,
  PanelDropzone,
  PanelFieldList,
  PanelPromptField,
  FieldRow,
  PillSelect,
  SegmentedTabs,
  ProviderModelPicker,
  CreditsSubmitPill,
} from "@/components/generate/composer";
import { JobStatusCard } from "@/components/generate/job-status-card";
import { StylePicker } from "./style-picker";
import { StylePreview } from "./style-preview";
import {
  choicesFor,
  compareToolbarFieldKeys,
  composerFieldLabel,
  fieldPlacement,
  SIZE_FIELD_KEYS,
  valueHint,
} from "@/lib/composer-fields";
import {
  estimateImageCredits,
  estimateVideoCredits,
  hasAudioFromParameters,
  imageSettingsFromParameters,
  isDraftFromParameters,
} from "@/lib/credit-estimate";
import {
  isDurationLocked,
  isResolutionLocked,
  minTierForDuration,
  minTierForResolution,
  modelLockReason,
  upgradeHint,
} from "@/lib/tier-limits";
import {
  cleanParams,
  clampParamsToTier,
  durationLabel,
  durationSeconds,
  resolveStyleModel,
  seedStudioParams,
  studioModelConfig,
  studioPickerModels,
  tierBlockedReason,
  STUDIO_ENDPOINT,
} from "@/lib/marketing-models";
import {
  DEFAULT_MARKETING_STYLE_ID,
  getMarketingStyle,
  MARKETING_CATEGORIES,
  MARKETING_STYLES,
  styleKind,
  type MarketingStyle,
} from "@/lib/marketing-styles";
import {
  buildMarketingPrompt,
  promptBlockedReason,
  type ReferenceUse,
} from "@/lib/marketing-prompt";
import { composeReferenceSheet } from "@/lib/reference-sheet";

const FIELD_ICONS: Record<string, LucideIcon> = {
  aspectRatio: RectangleHorizontal,
  resolution: Monitor,
  duration: Clock,
  size: Maximize,
  imageSize: Maximize,
  quality: Gauge,
  outputFormat: FileType,
  fps: Timer,
};

function fieldIcon(key: string, isImage: boolean): LucideIcon {
  if (isImage && SIZE_FIELD_KEYS.has(key)) return Maximize;
  return FIELD_ICONS[key] ?? SlidersHorizontal;
}

/** One uploaded asset: the File is kept alongside the uploaded URL because
 *  the reference sheet is composited from the local file (an uploaded,
 *  cross-origin image taints the canvas — see reference-sheet.ts). */
type Asset = { file: File; previewUrl: string; url: string | null };

/**
 * The Marketing Studio: pick a style, attach your product and your talent,
 * say what you're selling, generate the ad.
 *
 * It is the third point on the same dial as the other two create surfaces —
 * /presets locks everything but one image, /generate exposes every model
 * parameter and asks you to write the whole prompt yourself. This one keeps
 * the parameters (a marketer still needs 9:16 vs 1:1) and splits the prompt:
 * you write the subject, the style writes the treatment.
 */
export function MarketingStudio() {
  const { toast } = useToast();
  const invalidateCredits = useInvalidateCredits();
  const usageQuery = useUsage();
  const tierInfo = usageQuery.data?.tier_info;

  const [style, setStyle] = useState<MarketingStyle>(
    () => getMarketingStyle(DEFAULT_MARKETING_STYLE_ID) ?? MARKETING_STYLES[0],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const kind = styleKind(style);
  const isImage = kind === "image";

  const [modelId, setModelId] = useState(() => resolveStyleModel(style).id);
  const config = studioModelConfig(modelId, kind);
  const [picked, setPicked] = useState<Record<string, unknown>>(() =>
    seedStudioParams(resolveStyleModel(style), style),
  );
  // The plan's caps ride the usage query and land well after the model's own
  // defaults are seeded, so the clamp is derived on every render rather than
  // written back into state by an effect — that way the pills, the price and
  // the payload all read the same value, and there's no window where the
  // composer displays a resolution the server would answer with a 403.
  const params = clampParamsToTier(config, picked, tierInfo);

  const [product, setProduct] = useState<Asset | null>(null);
  const [talent, setTalent] = useState<Asset | null>(null);
  const [uploading, setUploading] = useState(false);
  // What you type. The style's treatment and the reference note are appended
  // to it on submit rather than written into this field, so switching style
  // never rewrites your own words — see buildMarketingPrompt.
  const [description, setDescription] = useState("");

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  // What the RUNNING job produces, captured at submit — not derived from the
  // current style, which is free to change while a job is in flight and would
  // otherwise render a finished clip into an <img>.
  const [activeIsVideo, setActiveIsVideo] = useState(false);
  const generation = useGeneration(activeJobId);
  const busy = generation.status === "queued" || generation.status === "processing";

  // Which asset travels as the model's one reference image. Both uploaded and
  // an image style means the pair can be merged into a sheet; on a video model
  // the reference IS the opening frame, so a side-by-side sheet would be
  // animated as-is and only one asset can go (see marketing-prompt.ts).
  const [preferred, setPreferred] = useState<"product" | "talent">("product");
  const reference: ReferenceUse =
    product && talent
      ? isImage
        ? "sheet"
        : preferred
      : product
        ? "product"
        : talent
          ? "talent"
          : "none";

  const prompt = buildMarketingPrompt(style, description, { kind, reference });

  const credits = isImage
    ? estimateImageCredits(config.id, imageSettingsFromParameters(params))
    : estimateVideoCredits(
        config.id,
        durationSeconds(params.duration) || 5,
        (params.resolution as string) ?? "720p",
        // Same switches the backend prices on, or the quote here would miss
        // Kling's soundtrack charge and the draft discount.
        { hasAudio: hasAudioFromParameters(params), isDraft: isDraftFromParameters(params) },
      );

  function selectStyle(next: MarketingStyle) {
    const nextConfig = resolveStyleModel(next);
    setStyle(next);
    setModelId(nextConfig.id);
    setPicked(seedStudioParams(nextConfig, next));
  }

  function selectModel(id: string) {
    const nextConfig = studioModelConfig(id, kind);
    setModelId(id);
    setPicked(seedStudioParams(nextConfig, style));
  }

  // Composited sheets are uploaded once per asset pair, not once per
  // generation — iterating on a brief usually means pressing Generate several
  // times with the same two photos. Cleared whenever either asset changes.
  const sheetCache = useRef<{ key: string; url: string } | null>(null);

  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiFetch("/api/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Upload failed.");
    return json.url as string;
  }

  async function handleFile(slot: "product" | "talent", file: File) {
    const set = slot === "product" ? setProduct : setTalent;
    const previewUrl = URL.createObjectURL(file);
    set({ file, previewUrl, url: null });
    setUploading(true);
    try {
      const url = await uploadFile(file);
      set({ file, previewUrl, url });
      sheetCache.current = null;
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      set(null);
      URL.revokeObjectURL(previewUrl);
    } finally {
      setUploading(false);
    }
  }

  function clearAsset(slot: "product" | "talent") {
    const current = slot === "product" ? product : talent;
    if (current) URL.revokeObjectURL(current.previewUrl);
    (slot === "product" ? setProduct : setTalent)(null);
    sheetCache.current = null;
  }

  async function resolveReferenceUrl(): Promise<string | undefined> {
    if (reference === "none") return undefined;
    if (reference === "product") return product?.url ?? undefined;
    if (reference === "talent") return talent?.url ?? undefined;

    if (!product || !talent) return undefined;
    const key = `${product.url ?? product.file.name}|${talent.url ?? talent.file.name}`;
    if (sheetCache.current?.key === key) return sheetCache.current.url;
    const sheet = await composeReferenceSheet(product.file, talent.file);
    const url = await uploadFile(sheet);
    sheetCache.current = { key, url };
    return url;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const image = await resolveReferenceUrl();
      const res = await apiFetch(`${STUDIO_ENDPOINT[kind]}${workspaceQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.id,
          prompt,
          ...(image ? { image } : {}),
          ...cleanParams(params),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json;
    },
    onSuccess: (data) => {
      setActiveIsVideo(!isImage);
      setActiveJobId(data.id);
      invalidateCredits();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't start generation", description: err.message, variant: "error" });
    },
  });

  const blockedReason =
    tierBlockedReason(config, params, tierInfo) ?? promptBlockedReason(description, reference);

  function submit() {
    if (!blockedReason && !uploading && !mutation.isPending) mutation.mutate();
  }

  const pickerModels = studioPickerModels(kind);

  // Toolbar-worthy registry fields only (see fieldPlacement): the enum picks
  // plus the duration range. Everything else — seeds, negative prompts,
  // switches — stays at its default here; the full composer at /generate is
  // where a parameter surface belongs.
  const durationField = config.fields.find(
    (f) => f.key === "duration" && f.type === "number" && f.min !== undefined && f.max !== undefined,
  );
  const pillFields = config.fields
    .filter((f) => fieldPlacement(f, durationField?.key) === "toolbar")
    .sort((a, b) => compareToolbarFieldKeys(a.key, b.key));

  const durationModelMax = durationField?.max ?? 0;
  const durationCap = tierInfo
    ? Math.min(durationModelMax, tierInfo.maxDurationSeconds)
    : durationModelMax;
  const durationValue = Math.min(
    durationSeconds(params.duration) || durationField?.min || 0,
    durationCap,
  );

  function optionLock(key: string): ((value: string) => boolean) | undefined {
    if (isImage) return undefined;
    if (key === "resolution") return (v) => isResolutionLocked(v, tierInfo);
    if (key === "duration") return (v) => isDurationLocked(durationSeconds(v), tierInfo);
    return undefined;
  }

  function optionLockHint(key: string): ((value: string) => string) | undefined {
    if (isImage) return undefined;
    if (key === "resolution") return (v) => upgradeHint(minTierForResolution(v), v);
    if (key === "duration") {
      return (v) => upgradeHint(minTierForDuration(durationSeconds(v)), `${durationLabel(v)} clips`);
    }
    return undefined;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      // Same studio frame as /generate and /presets — 8rem is the app header
      // plus <main>'s vertical padding (see app-shell.tsx).
      className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:flex-row"
    >
      <div
        className={cn(
          "relative isolate flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-floating",
          "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-brand before:content-['']",
          "lg:w-[400px] xl:w-[430px]",
        )}
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          <PanelSection label="Style">
            <StyleChip style={style} onChange={() => setPickerOpen(true)} />
          </PanelSection>

          <PanelSection
            label="Your assets"
            hint={referenceHint(reference, isImage)}
          >
            <div className="grid grid-cols-2 gap-3">
              <AssetSlot
                icon={Package}
                label="Product"
                asset={product}
                onFile={(file) => handleFile("product", file)}
                onRemove={() => clearAsset("product")}
              />
              <AssetSlot
                icon={User}
                label="Talent"
                asset={talent}
                onFile={(file) => handleFile("talent", file)}
                onRemove={() => clearAsset("talent")}
              />
            </div>

            {/* Video can only carry one of the two, so which one is a real
                choice rather than something to decide silently. */}
            {product && talent && !isImage && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-caption text-muted">Opening frame</p>
                <SegmentedTabs
                  value={preferred}
                  options={["product", "talent"] as const}
                  onChange={setPreferred}
                  renderLabel={(v) => (v === "product" ? "Product" : "Talent")}
                />
              </div>
            )}
          </PanelSection>

          {/* The style's direction and the reference rule are appended on
              submit (see buildMarketingPrompt), not shown here — so they can't
              be mistaken for your own text and can't survive switching style. */}
          <PanelSection label="Prompt">
            <PanelPromptField
              value={description}
              onChange={setDescription}
              onSubmit={submit}
              maxLength={1200}
              placeholder="Nord Coffee Roasters — a matte black 340g bag of single-origin beans, held by a woman in her 30s"
            />
          </PanelSection>

          <PanelSection label="Output">
            <ProviderModelPicker
              models={pickerModels}
              value={modelId}
              onChange={selectModel}
              fullWidth
              lockReason={(id) => modelLockReason(id, tierInfo)}
            />
            <PanelFieldList>
              {pillFields.map((field) =>
                field.key === durationField?.key ? (
                  <div key={field.key} className="border-b border-line py-3.5 last:border-0">
                    <div className="flex items-center justify-between gap-4 text-label text-ink-soft">
                      <p>{field.label}</p>
                      <span>{durationValue}s</span>
                    </div>
                    <div className="mt-3">
                      <Slider
                        min={field.min!}
                        max={durationCap}
                        step={1}
                        value={[durationValue]}
                        onValueChange={([v]) => setPicked((p) => ({ ...p, duration: v }))}
                      />
                      {durationCap < durationModelMax && (
                        <p className="mt-1.5 text-caption text-muted">
                          {upgradeHint(
                            minTierForDuration(durationModelMax),
                            `up to ${durationModelMax}s`,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <FieldRow key={field.key} label={composerFieldLabel(field, isImage)}>
                    <PillSelect
                      icon={fieldIcon(field.key, isImage)}
                      label={composerFieldLabel(field, isImage)}
                      value={(params[field.key] as string) ?? choicesFor(field)[0] ?? ""}
                      options={choicesFor(field)}
                      renderHint={valueHint}
                      onChange={(v) => setPicked((p) => ({ ...p, [field.key]: v }))}
                      isOptionLocked={optionLock(field.key)}
                      lockedHint={optionLockHint(field.key)}
                    />
                  </FieldRow>
                ),
              )}
            </PanelFieldList>
          </PanelSection>
        </div>

        <div className="shrink-0 border-t border-line p-4 sm:p-5">
          <CreditsSubmitPill
            fullWidth
            credits={credits}
            loading={mutation.isPending || busy || uploading}
            balance={usageQuery.data?.credit_balance}
            blockedReason={blockedReason}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/my-gallery"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-label text-muted transition-colors hover:border-border-strong hover:text-ink-soft"
          >
            <FolderOpen className="size-3.5" aria-hidden="true" />
            Creations
          </Link>
          {usageQuery.data && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-body-sm text-ink-soft">
              <Zap className="size-4 text-accent-amber" aria-hidden="true" />
              <span className="font-semibold text-accent-amber">
                {formatCredits(usageQuery.data.credit_balance)}
              </span>
              <span className="text-muted">credits remaining</span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1">
          {activeJobId ? (
            <div className="h-full min-h-[24rem] w-full">
              <JobStatusCard
                generation={generation}
                jobId={activeJobId}
                hasJob
                isVideo={activeIsVideo}
                onReset={() => setActiveJobId(null)}
              />
            </div>
          ) : (
            <StyleCanvas style={style} />
          )}
        </div>
      </div>

      <StylePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={style}
        onSelect={selectStyle}
      />
    </form>
  );
}

/** What the panel says under the two upload slots — the reference rule is the
 *  one piece of studio behaviour a user cannot infer from the UI. */
function referenceHint(reference: ReferenceUse, isImage: boolean): string {
  if (reference === "sheet") {
    return "Both are merged into one reference sheet and sent together — the prompt tells the model which is which.";
  }
  if (reference === "none") {
    return "Optional. Without a photo the model invents the product from your prompt.";
  }
  if (!isImage) {
    return "Video carries one reference image — it becomes the opening frame of the clip.";
  }
  return "Sent as the reference the model has to keep faithful.";
}

function StyleChip({ style, onChange }: { style: MarketingStyle; onChange: () => void }) {
  const category = MARKETING_CATEGORIES.find((c) => c.id === style.category);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-dark p-2.5">
      <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-line">
        <StylePreview style={style} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-label font-semibold text-ink">{style.name}</p>
        <p className="truncate text-caption text-muted">
          {category?.label} · {category?.kind === "video" ? "Video" : "Image"}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 rounded-full border border-line px-3 py-1.5 text-caption font-semibold text-ink-soft transition-colors hover:border-border-strong hover:bg-white/5"
      >
        Change
      </button>
    </div>
  );
}

function AssetSlot({
  icon: Icon,
  label,
  asset,
  onFile,
  onRemove,
}: {
  icon: LucideIcon;
  label: string;
  asset: Asset | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-caption font-medium text-ink-soft">
        <Icon className="size-3.5 text-muted" aria-hidden="true" />
        {label}
      </p>
      <PanelDropzone
        compact
        label={`Add ${label.toLowerCase()}`}
        previewUrl={asset?.previewUrl}
        uploading={Boolean(asset && !asset.url)}
        onFile={onFile}
        onRemove={onRemove}
      />
    </div>
  );
}

/** Idle canvas — the picked style's own artwork blown up, so the right side
 *  says something before there is a result to show. */
function StyleCanvas({ style }: { style: MarketingStyle }) {
  return (
    <div className="flex h-full min-h-[24rem] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-brand/15 bg-surface-2/20 p-10 text-center">
      <div className="w-40 overflow-hidden rounded-2xl border border-line shadow-floating">
        <div className="aspect-[3/4]">
          <StylePreview style={style} />
        </div>
      </div>
      <h2 className="mt-6 font-display text-subheading font-bold text-ink">{style.name}</h2>
      <p className="mt-2 max-w-sm text-body-sm text-muted">{style.blurb}</p>
      <p className="mt-6 flex items-center gap-1.5 text-caption text-muted">
        <Info className="size-3" aria-hidden="true" />
        Attach your product, write your prompt, and generate.
      </p>
    </div>
  );
}
