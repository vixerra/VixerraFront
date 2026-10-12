"use client";

import { createElement, useRef, useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronDown,
  Clapperboard,
  Film,
  FolderOpen,
  Package,
  Play,
  Plus,
  Shirt,
  Sparkles,
  Trash2,
  User,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { estimateCreditsForRequest } from "@/lib/credit-estimate";
import { formatMediaDuration, measureMediaDuration } from "@/lib/media-duration";
import { isDurationLocked, isResolutionLocked, minTierForDuration, minTierForResolution, upgradeHint } from "@/lib/tier-limits";
import { fetchVideoFile, uploadVideoToLibrary, type PickedVideo } from "@/lib/video-library";
import {
  GENJUTSU_KINDS,
  GENJUTSU_MAX_REFERENCES,
  GENJUTSU_MAX_SECONDS,
  GENJUTSU_MIN_SECONDS,
  GENJUTSU_MODEL_ID,
  GENJUTSU_MODES,
  GENJUTSU_NAME,
  GENJUTSU_NOTE_MAX,
  GENJUTSU_PROMPT_MAX,
  GENJUTSU_RESOLUTIONS,
  genjutsuKind,
  type GenjutsuMode,
  type GenjutsuReferenceKind,
} from "@/lib/genjutsu";
import { useGeneration } from "@/hooks/use-generation";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useMe } from "@/hooks/use-me";
import { usePresets } from "@/hooks/use-presets";
import { useVideoLibrary } from "@/hooks/use-video-library";
import { useCanGenerate, useWorkspace, workspaceQuery } from "@/components/providers/workspace-provider";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DropdownContent, DropdownItem, DropdownRoot, DropdownTrigger } from "@/components/ui/dropdown";
import { CreditsSubmitPill } from "@/components/generate/composer";
import { JobStatusCard } from "@/components/generate/job-status-card";
import { VideoSourceField } from "@/components/video-library/video-source-field";
import { VideoEditModal } from "@/components/video-library/video-edit-modal";

/** The clip on the hero cards, bundled so it plays with no API call. Cut
 *  for the job: 960x540 (the largest it is ever shown), no audio track,
 *  ~830 kb/s, 1.5MB down from the 3.5MB source. The poster is its frame at
 *  1s, painted before the clip has loaded. */
const HERO_CLIP = "/media/videos/genjutsu-hero.mp4";
const HERO_POSTER = "/media/videos/genjutsu-hero.jpg";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Upload failed.");
  return json.url as string;
}

type Clip = { preview: string; url: string | null; uploading: boolean; seconds?: number };

type Reference = {
  key: number;
  kind: GenjutsuReferenceKind;
  note: string;
  preview: string;
  url: string | null;
  uploading: boolean;
};

type Panel = "history" | "library" | "how";

let nextKey = 1;

/**
 * Vixlens Genjutsu: a clip and reference images in, the clip recast out.
 *
 * Two columns, like the rest of the studio pages but quieter: the left one
 * holds only what a run needs (mode, clip, references, Generate) and puts
 * every detail behind a click; the right one is where clips come from
 * (Motion Library), where results land (History) and how it works.
 *
 * The API writes the instruction (aiVideo-backend's lib/genjutsu.ts); this
 * page only collects the clip, the references and an optional direction.
 */
export function GenjutsuStudio() {
  const { toast } = useToast();
  const { data: me } = useMe();
  const usageQuery = useUsage();
  const invalidateCredits = useInvalidateCredits();
  const canGenerate = useCanGenerate(me?.organization);

  const [mode, setMode] = useState<GenjutsuMode>("swap");
  const [clip, setClip] = useState<Clip | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<(typeof GENJUTSU_RESOLUTIONS)[number]>("720p");
  const [keepAudio, setKeepAudio] = useState(true);
  const [panel, setPanel] = useState<Panel>("library");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  // A clip chosen from the Motion Library, opened in the editor first.
  const [libraryClip, setLibraryClip] = useState<{ file: File; seconds?: number } | null>(null);
  const [loadingLibraryClip, setLoadingLibraryClip] = useState(false);
  const imagesRef = useRef<HTMLInputElement>(null);

  const generation = useGeneration(activeJobId);
  const busy = generation.status === "queued" || generation.status === "processing";

  const updateReference = (key: number, patch: Partial<Reference>) =>
    setReferences((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function pickClip({ file, url: uploadedUrl, seconds }: PickedVideo) {
    const preview = URL.createObjectURL(file);
    // A clip from "My videos" is already uploaded and goes straight in.
    setClip({ preview, url: uploadedUrl ?? null, uploading: !uploadedUrl, seconds });
    if (uploadedUrl) return;
    try {
      const url = await uploadVideoToLibrary(file, { seconds });
      setClip({ preview, url, uploading: false, seconds });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      setClip(null);
    }
  }

  /** A Motion Library clip: downloaded, then through the editor like any
   *  other, which also cuts one longer than the limit down to size. */
  async function loadLibraryClip(url: string, name: string) {
    setLoadingLibraryClip(true);
    try {
      const file = await fetchVideoFile(url, name);
      setLibraryClip({ file, seconds: await measureMediaDuration(file) });
    } catch (err) {
      toast({ title: "Couldn't load the clip", description: (err as Error).message, variant: "error" });
    } finally {
      setLoadingLibraryClip(false);
    }
  }

  function addImages(files: FileList | null) {
    if (!files?.length) return;
    const room = GENJUTSU_MAX_REFERENCES - references.length;
    const picked = [...files].slice(0, room);
    if (files.length > room) {
      toast({ title: `Up to ${GENJUTSU_MAX_REFERENCES} references`, description: "The extra images were left out.", variant: "error" });
    }
    const added = picked.map((file, i) => ({
      file,
      ref: {
        key: nextKey++,
        // The first is usually who goes in; what follows, what they hold.
        kind: (references.length + i === 0 ? "character" : "product") as GenjutsuReferenceKind,
        note: "",
        preview: URL.createObjectURL(file),
        url: null,
        uploading: true,
      },
    }));
    setReferences((prev) => [...prev, ...added.map((a) => a.ref)]);
    for (const { file, ref } of added) {
      uploadImage(file)
        .then((url) => updateReference(ref.key, { url, uploading: false }))
        .catch((err: Error) => {
          toast({ title: "Upload failed", description: err.message, variant: "error" });
          setReferences((prev) => prev.filter((r) => r.key !== ref.key));
        });
    }
  }

  // Priced the way the API bills it: the clip's own length, rounded up, or
  // the longest allowed while it hasn't been measured.
  const billedSeconds =
    clip?.seconds !== undefined
      ? Math.min(GENJUTSU_MAX_SECONDS, Math.max(GENJUTSU_MIN_SECONDS, Math.ceil(clip.seconds - 0.05)))
      : GENJUTSU_MAX_SECONDS;
  const credits = estimateCreditsForRequest({
    type: "image-to-video",
    model: GENJUTSU_MODEL_ID,
    durationSeconds: billedSeconds,
    resolution,
    hasReferenceVideo: true,
    referenceVideoSeconds: billedSeconds,
  });

  const tierInfo = usageQuery.data?.tier_info;
  const blockedReason =
    canGenerate.reason ??
    (isResolutionLocked(resolution, tierInfo)
      ? upgradeHint(minTierForResolution(resolution), resolution)
      : clip && isDurationLocked(billedSeconds, tierInfo)
        ? upgradeHint(minTierForDuration(billedSeconds), `${billedSeconds}s clips`)
        : undefined);

  const ready = references.filter((r) => r.url);
  const incompleteReason = !clip?.url
    ? clip?.uploading
      ? "Wait for the clip to finish uploading."
      : "Add a reference video to edit."
    : references.some((r) => r.uploading)
      ? "Wait for the images to finish uploading."
      : ready.length === 0
        ? "Add at least one character, outfit or product."
        : undefined;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/generations/genjutsu${workspaceQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          video: clip!.url,
          // In the order shown: the API names them Image 1, Image 2...
          references: ready.map((r) => ({ image: r.url, kind: r.kind, note: r.note.trim() })),
          prompt: prompt.trim(),
          resolution,
          keepAudio,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json as { job_id: string };
    },
    onSuccess: (data) => {
      setActiveJobId(data.job_id);
      setPanel("history");
      invalidateCredits();
    },
    onError: (err: Error) => toast({ title: "Couldn't start", description: err.message, variant: "error" }),
  });

  const reason = blockedReason ?? incompleteReason;
  const editing = references.find((r) => r.key === editingKey) ?? null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason) mutation.mutate();
      }}
      className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:min-h-[40rem] lg:flex-row"
    >
      {/* ── Left: what a run needs, nothing more ── */}
      <aside className="flex w-full shrink-0 flex-col gap-3 rounded-[24px] border border-line bg-surface-dark p-3 lg:w-[400px]">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <HeroCard />

          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-white/[0.03] p-1" role="radiogroup" aria-label="Mode">
            {GENJUTSU_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                title={m.body}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-2.5 text-body-sm font-semibold transition-colors",
                  mode === m.id ? "bg-white/[0.09] text-ink shadow-sm" : "text-text-tertiary hover:text-ink-soft",
                )}
              >
                {createElement(m.icon, { className: "size-4", "aria-hidden": true })}
                {m.id === "swap" ? "Objects swap" : "Motion transfer"}
              </button>
            ))}
          </div>

          <VideoSourceField
            className="h-36 rounded-2xl border-white/15 bg-white/[0.02]"
            hideLibraryLink
            label={loadingLibraryClip ? "Loading the clip…" : "Add a reference video to edit"}
            sublabel={`Video duration: ${GENJUTSU_MIN_SECONDS} to ${GENJUTSU_MAX_SECONDS} seconds`}
            previewUrl={clip?.preview}
            uploading={clip?.uploading || loadingLibraryClip}
            badge={clip?.seconds !== undefined ? formatMediaDuration(clip.seconds) : undefined}
            minSeconds={GENJUTSU_MIN_SECONDS}
            maxSeconds={GENJUTSU_MAX_SECONDS}
            onPick={(picked) => void pickClip(picked)}
            onRemove={() => setClip(null)}
          />

          <input
            ref={imagesRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              addImages(e.target.files);
              e.target.value = "";
            }}
          />
          {references.length === 0 ? (
            <button
              type="button"
              onClick={() => imagesRef.current?.click()}
              className="flex h-36 w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] text-center transition-colors hover:border-white/30 hover:bg-white/[0.04]"
            >
              <span className="flex -space-x-2">
                {[User, Shirt, Package].map((Icon, i) => (
                  <span
                    key={i}
                    className="flex size-10 items-center justify-center rounded-full border-2 border-surface-dark bg-white/[0.12] text-ink"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                ))}
              </span>
              <span className="text-body-sm font-semibold text-ink">Add your characters, outfits &amp; products</span>
              <span className="text-caption text-text-tertiary">Up to {GENJUTSU_MAX_REFERENCES} images</span>
            </button>
          ) : (
            <div className="rounded-2xl border border-line bg-white/[0.02] p-2.5">
              <div className="mb-2 flex items-center justify-between px-0.5">
                <span className="text-caption font-semibold text-ink-soft">References</span>
                <span className="text-caption text-text-tertiary">Tap one to say what it replaces</span>
              </div>
              <ul className="grid grid-cols-4 gap-2">
                {references.map((ref, i) => {
                  const kind = genjutsuKind(ref.kind);
                  return (
                    <li key={ref.key}>
                      <button
                        type="button"
                        onClick={() => setEditingKey(ref.key)}
                        aria-label={`Image ${i + 1}: ${kind.label}${ref.note ? `, ${ref.note}` : ""}`}
                        className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-white/[0.05] ring-brand transition-shadow hover:ring-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ref.preview} alt="" className="h-full w-full object-cover" />
                        {ref.uploading && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Spinner size={16} />
                          </span>
                        )}
                        <span className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white">
                          {createElement(kind.icon, { className: "size-3", "aria-hidden": true })}
                        </span>
                        {ref.note && (
                          <span className="absolute top-1 right-1 size-2 rounded-full bg-brand" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
                {references.length < GENJUTSU_MAX_REFERENCES && (
                  <li>
                    <button
                      type="button"
                      onClick={() => imagesRef.current?.click()}
                      aria-label="Add more images"
                      className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-text-tertiary transition-colors hover:border-white/30 hover:text-ink"
                    >
                      <Plus className="size-5" aria-hidden="true" />
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={GENJUTSU_PROMPT_MAX}
            rows={2}
            placeholder={
              mode === "swap" ? "Describe the change (optional)" : "Describe the new scene (optional)"
            }
            className="w-full resize-none rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-body-sm text-ink placeholder:text-text-tertiary focus:border-white/25 focus:outline-none"
          />
        </div>

        <div className="shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <DropdownRoot>
              <DropdownTrigger className="flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] px-3 py-1.5 text-caption font-semibold text-ink-soft hover:text-ink">
                {resolution}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </DropdownTrigger>
              <DropdownContent align="start" side="top" className="min-w-[140px]">
                {GENJUTSU_RESOLUTIONS.map((r) => (
                  <DropdownItem key={r} onSelect={() => setResolution(r)} className="flex items-center justify-between">
                    {r}
                    {r === resolution && <Check className="size-4" aria-hidden="true" />}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </DropdownRoot>
            <button
              type="button"
              onClick={() => setKeepAudio((v) => !v)}
              aria-pressed={keepAudio}
              className="flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] px-3 py-1.5 text-caption font-semibold text-ink-soft hover:text-ink"
            >
              {keepAudio ? <Volume2 className="size-3.5" aria-hidden="true" /> : <VolumeX className="size-3.5" aria-hidden="true" />}
              {keepAudio ? "Original sound" : "No sound kept"}
            </button>
          </div>
          <CreditsSubmitPill
            fullWidth
            hideTooltip
            credits={credits}
            loading={mutation.isPending || busy}
            balance={usageQuery.data?.credit_balance}
            blockedReason={blockedReason}
            incompleteReason={incompleteReason}
            className="h-14 rounded-2xl text-body"
          />
          {reason && <p className="text-center text-caption text-text-tertiary">{reason}</p>}
        </div>
      </aside>

      {/* ── Right: where clips come from and results land ── */}
      <section className="flex min-h-[32rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-line bg-surface-dark">
        <nav className="flex shrink-0 items-center gap-1 p-3" aria-label={`${GENJUTSU_NAME} panels`}>
          {(
            [
              { id: "history", label: "History", icon: FolderOpen },
              { id: "library", label: "Motion Library", icon: Film },
              { id: "how", label: "How it works", icon: BookOpen },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPanel(p.id)}
              aria-current={panel === p.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-body-sm font-medium transition-colors",
                panel === p.id ? "bg-white/[0.08] text-ink" : "text-text-tertiary hover:text-ink-soft",
              )}
            >
              <p.icon className="size-4" aria-hidden="true" />
              {p.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-8">
          {panel === "library" && (
            <>
              <Hero />
              <MotionLibrary onPick={(url, name) => void loadLibraryClip(url, name)} />
            </>
          )}
          {panel === "history" && (
            <History
              activeJobId={activeJobId}
              generation={generation}
              onReset={() => setActiveJobId(null)}
              onRecast={(url) => void loadLibraryClip(url, "result.mp4")}
            />
          )}
          {panel === "how" && <HowItWorks mode={mode} />}
        </div>
      </section>

      <ReferenceModal
        reference={editing}
        index={editing ? references.indexOf(editing) : 0}
        mode={mode}
        onChange={(patch) => editing && updateReference(editing.key, patch)}
        onRemove={() => {
          if (editing) setReferences((prev) => prev.filter((r) => r.key !== editing.key));
          setEditingKey(null);
        }}
        onClose={() => setEditingKey(null)}
      />

      <VideoEditModal
        source={libraryClip}
        minSeconds={GENJUTSU_MIN_SECONDS}
        maxSeconds={GENJUTSU_MAX_SECONDS}
        onCancel={() => setLibraryClip(null)}
        onSkip={() => {
          const source = libraryClip;
          setLibraryClip(null);
          if (source) void pickClip(source);
        }}
        onConfirm={(file, seconds) => {
          setLibraryClip(null);
          void pickClip({ file, seconds });
        }}
      />
    </form>
  );
}

/** The feature's own card, top left: its name over a playing clip. */
function HeroCard() {
  return (
    <div className="relative h-28 overflow-hidden rounded-2xl">
      <video src={HERO_CLIP} poster={HERO_POSTER} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline autoPlay preload="auto" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" aria-hidden="true" />
      <div className="absolute bottom-3 left-4">
        <p className="font-display text-feature-title font-extrabold tracking-tight text-brand uppercase [text-shadow:0_2px_14px_rgb(0_0_0/0.6)]">
          {GENJUTSU_NAME}
        </p>
        <p className="text-caption text-white/75">Reality manipulation</p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="grid items-center gap-6 py-6 xl:grid-cols-[1fr_minmax(0,1.1fr)] xl:py-10">
      <div className="space-y-4">
        <h2 className="font-display text-heading font-extrabold tracking-tight text-balance text-ink uppercase">
          Turn one video into many
        </h2>
        <p className="max-w-md text-body text-muted">
          Take the motion and recast it with your characters, locations and products, or swap
          specific elements while keeping the rest untouched.
        </p>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
        <video src={HERO_CLIP} poster={HERO_POSTER} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline autoPlay preload="auto" />
      </div>
    </div>
  );
}

/** Clips to start from: the presets' own clips, or the user's uploads. */
function MotionLibrary({ onPick }: { onPick: (url: string, name: string) => void }) {
  const [source, setSource] = useState<"picks" | "mine">("picks");
  const presets = usePresets();
  const library = useVideoLibrary({ enabled: source === "mine" });

  const tiles =
    source === "picks"
      ? (presets.data ?? []).filter((p) => p.previewUrl).map((p) => ({ key: p.slug, src: p.previewUrl, name: `${p.slug}.mp4` }))
      : (library.data ?? []).map((v) => ({ key: v.id, src: v.playbackUrl, name: v.name }));
  const loading = source === "picks" ? presets.isLoading : library.isLoading;

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div className="flex gap-1 rounded-full border border-line bg-white/[0.03] p-1">
          {(
            [
              { id: "picks", label: "Vixlens picks", icon: Sparkles },
              { id: "mine", label: "My videos", icon: Video },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSource(s.id)}
              aria-pressed={source === s.id}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm font-semibold transition-colors",
                source === s.id ? "bg-ink text-surface" : "text-text-tertiary hover:text-ink",
              )}
            >
              <s.icon className="size-3.5" aria-hidden="true" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : tiles.length === 0 ? (
        <p className="py-12 text-center text-body-sm text-text-tertiary">
          {source === "mine" ? "The clips you upload show up here." : "No clips yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.key}>
              <HoverClip src={t.src} onClick={() => onPick(t.src, t.name)} label="Use this clip" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A clip tile that plays on hover and shows what a click does. */
function HoverClip({ src, onClick, label }: { src: string; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => void e.currentTarget.querySelector("video")?.play().catch(() => undefined)}
      onMouseLeave={(e) => {
        const v = e.currentTarget.querySelector("video");
        if (v) {
          v.pause();
          v.currentTime = 0.1;
        }
      }}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-white/[0.04]"
    >
      <video src={`${src}#t=0.1`} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline preload="metadata" />
      <span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-caption font-semibold text-black">
          <Play className="size-3 fill-current" aria-hidden="true" />
          {label}
        </span>
      </span>
    </button>
  );
}

type HistoryItem = { id: string; status: string; resultUrl: string | null };

function History({
  activeJobId,
  generation,
  onReset,
  onRecast,
}: {
  activeJobId: string | null;
  generation: ReturnType<typeof useGeneration>;
  onReset: () => void;
  onRecast: (url: string) => void;
}) {
  const { data: me } = useMe();
  const workspace = useWorkspace(Boolean(me?.organization));
  const query = useInfiniteQuery({
    queryKey: ["genjutsu-history", workspace, generation.status],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ model: GENJUTSU_MODEL_ID, status: "completed", limit: "24", workspace });
      if (pageParam) params.set("cursor", pageParam);
      const res = await apiFetch(`/api/generations?${params.toString()}`);
      if (!res.ok) throw new Error("Couldn't load your history.");
      return (await res.json()) as { items: HistoryItem[]; nextCursor: string | null };
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).filter((g) => g.resultUrl && g.id !== activeJobId);

  return (
    <div className="space-y-6 pt-2">
      {activeJobId && (
        <div className="h-[28rem]">
          <JobStatusCard generation={generation} jobId={activeJobId} hasJob isVideo onReset={onReset} />
        </div>
      )}
      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : items.length === 0 && !activeJobId ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Clapperboard className="size-7 text-text-tertiary" aria-hidden="true" />
          <p className="text-body-sm text-muted">Your recast videos show up here.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((g) => (
            <li key={g.id}>
              <HoverClip src={g.resultUrl!} onClick={() => onRecast(g.resultUrl!)} label="Recast again" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const STEPS: Record<GenjutsuMode, { title: string; body: string }[]> = {
  swap: [
    { title: "Add a video", body: `Any ${GENJUTSU_MIN_SECONDS}-${GENJUTSU_MAX_SECONDS}s clip, or one from the Motion Library. Trim it to the moment you want.` },
    { title: "Add what changes", body: "A person, an outfit, a product, a place. Tap each one to say what it replaces." },
    { title: "Generate", body: "Only what you named changes. Motion, camera, timing and sound stay as filmed." },
  ],
  motion: [
    { title: "Add a video", body: "The movement to copy: a dance, a walk, a camera move." },
    { title: "Add your references", body: "Who performs it, what they wear, where it happens." },
    { title: "Generate", body: "A new scene from your references, moving exactly like the clip." },
  ],
};

function HowItWorks({ mode }: { mode: GenjutsuMode }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-10">
      <h2 className="text-center font-display text-subheading font-extrabold tracking-tight text-ink uppercase">
        {mode === "swap" ? "Objects swap" : "Motion transfer"}
      </h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS[mode].map((step, i) => (
          <li key={step.title} className="space-y-3 rounded-2xl border border-line bg-white/[0.03] p-5">
            <span className="font-display text-heading font-extrabold text-brand">{String(i + 1).padStart(2, "0")}</span>
            <p className="text-body font-semibold text-ink">{step.title}</p>
            <p className="text-body-sm text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** One reference's details, out of the way until asked for. */
function ReferenceModal({
  reference,
  index,
  mode,
  onChange,
  onRemove,
  onClose,
}: {
  reference: Reference | null;
  index: number;
  mode: GenjutsuMode;
  onChange: (patch: Partial<Reference>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const kind = reference ? genjutsuKind(reference.kind) : null;
  return (
    <Modal open={reference !== null} onOpenChange={(open) => !open && onClose()} title={`Image ${index + 1}`} className="max-w-sm">
      {reference && kind && (
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={reference.preview} alt="" className="mx-auto max-h-48 rounded-xl object-contain" />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What this image is">
            {GENJUTSU_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={reference.kind === k.id}
                onClick={() => onChange({ kind: k.id })}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-semibold transition-colors",
                  reference.kind === k.id ? "border-brand bg-brand text-on-brand" : "border-line text-muted hover:text-ink",
                )}
              >
                {createElement(k.icon, { className: "size-3.5", "aria-hidden": true })}
                {k.label}
              </button>
            ))}
          </div>
          <Input
            value={reference.note}
            maxLength={GENJUTSU_NOTE_MAX}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder={kind.placeholder[mode]}
            aria-label={mode === "swap" ? "What it replaces" : "What it is"}
            autoFocus
          />
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-red-400"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-ink px-5 py-2 text-body-sm font-semibold text-surface hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
