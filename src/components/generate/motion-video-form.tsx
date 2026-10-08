"use client";

import { workspaceQuery } from "@/components/providers/workspace-provider";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Monitor } from "lucide-react";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { estimateVideoCredits } from "@/lib/credit-estimate";
import { formatMediaDuration, measureMediaDuration } from "@/lib/media-duration";
import {
  MOTION_MAX_SECONDS,
  MOTION_MIN_SECONDS,
  MOTION_PROMPT_MAX_LENGTH,
  type MotionComposerModel,
} from "@/lib/motion-models";
import {
  isResolutionLocked,
  isDurationLocked,
  minTierForResolution,
  minTierForDuration,
  upgradeHint,
} from "@/lib/tier-limits";
import type { TierInfo, VideoModelId } from "@/lib/constants";
import {
  PanelSection,
  SegmentedTabs,
  PanelPromptField,
  PanelFieldList,
  PanelDropzone,
  ProviderModelPicker,
  PillSelect,
  FieldRow,
  CreditsSubmitPill,
  type PickerModel,
} from "./composer";

type Orientation = "video" | "image";

const ORIENTATION_LABEL: Record<Orientation, string> = {
  video: "Match the video",
  image: "Match the photo",
};

/** A Wan clip may come in at up to 720p; anything that already fits keeps
 *  its size and is only re-encoded when it's over the 10MB cap. */
const WAN_PIXELS = { min: 1, max: 1280 * 720 };

type Clip = {
  url?: string;
  preview: string;
  seconds?: number;
  bytes: number;
  uploading: boolean;
};

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Upload failed.");
  return json.url as string;
}

/**
 * The composer for the motion-transfer models (Kling Motion Control, Wan 2.2
 * Animate): a character image, a reference clip, and only the settings the
 * chosen model takes. Priced on the clip's length — the output is as long as
 * the clip — which the API re-reads from the file and bills on.
 */
export function MotionVideoForm({
  models,
  model,
  config,
  onModelChange,
  initialPrompt,
  onPromptChange,
  onCreated,
  busy,
  tierInfo,
}: {
  models: readonly PickerModel<VideoModelId>[];
  model: VideoModelId;
  config: MotionComposerModel;
  onModelChange: (id: VideoModelId) => void;
  initialPrompt: string;
  onPromptChange: (value: string) => void;
  onCreated: (jobId: string) => void;
  busy: boolean;
  tierInfo?: TierInfo;
}) {
  const { toast } = useToast();
  const invalidateCredits = useInvalidateCredits();
  const creditBalance = useUsage().data?.credit_balance;

  const [image, setImage] = useState<{ url?: string; preview: string; uploading: boolean } | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [resolution, setResolution] = useState<string>(
    config.resolutions.includes("720p") ? "720p" : config.resolutions[0],
  );
  const [orientation, setOrientation] = useState<Orientation>("video");

  const effectiveOrientation: Orientation = config.orientation ? orientation : "video";
  const maxSeconds = MOTION_MAX_SECONDS[effectiveOrientation];
  // Billed the way the API bills it: the clip's own length, rounded up, or
  // the longest allowed when it couldn't be measured.
  const billedSeconds =
    clip?.seconds !== undefined
      ? Math.min(maxSeconds, Math.max(MOTION_MIN_SECONDS, Math.ceil(clip.seconds - 0.05)))
      : maxSeconds;
  const credits = estimateVideoCredits(model, billedSeconds, resolution, { hasReferenceVideo: true });

  async function pickImage(file: File) {
    if (config.maxBytes && file.size > config.maxBytes) {
      toast({
        title: "Image too large",
        description: `${config.label} takes images up to ${Math.round(config.maxBytes / 1024 / 1024)}MB.`,
        variant: "error",
      });
      return;
    }
    const preview = URL.createObjectURL(file);
    setImage({ preview, uploading: true });
    try {
      const url = await uploadFile(file);
      setImage({ preview, url, uploading: false });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      setImage(null);
    }
  }

  async function pickClip(file: File) {
    const preview = URL.createObjectURL(file);
    setClip({ preview, bytes: file.size, uploading: true });
    try {
      // Wan caps the file at 10MB: a larger clip is re-encoded here, at 720p
      // at most and a bitrate that fits, before it goes up. Kling takes the
      // clip as it is. The encoder is heavy, so it loads only when needed.
      let upload = file;
      if (config.maxBytes && file.size > config.maxBytes) {
        const { fitVideoToPixels } = await import("@/lib/downscale-video");
        upload = await fitVideoToPixels(file, WAN_PIXELS, undefined, { maxBytes: config.maxBytes });
      }
      const seconds = await measureMediaDuration(upload);
      const url = await uploadFile(upload);
      setClip({ preview, url, seconds, bytes: upload.size, uploading: false });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      setClip(null);
    }
  }

  const blockedReason = isResolutionLocked(resolution, tierInfo)
    ? upgradeHint(minTierForResolution(resolution), resolution)
    : clip && isDurationLocked(billedSeconds, tierInfo)
      ? upgradeHint(minTierForDuration(billedSeconds), `${billedSeconds}s clips`)
      : undefined;
  const incompleteReason = !image?.url
    ? image?.uploading
      ? "Wait for the image to finish uploading."
      : "Upload a character image."
    : !clip?.url
      ? clip?.uploading
        ? "Wait for the clip to finish uploading."
        : "Upload a reference video."
      : clip.seconds !== undefined && clip.seconds < MOTION_MIN_SECONDS - 0.05
        ? `${config.label} needs a clip of at least ${MOTION_MIN_SECONDS}s.`
        : clip.seconds !== undefined && clip.seconds > maxSeconds + 0.05
          ? effectiveOrientation === "image"
            ? `"${ORIENTATION_LABEL.image}" takes clips up to ${maxSeconds}s. Trim it or switch to "${ORIENTATION_LABEL.video}".`
            : `${config.label} takes clips up to ${maxSeconds}s. Trim it.`
          : config.maxBytes && clip.bytes > config.maxBytes
            ? `${config.label} takes clips up to ${Math.round(config.maxBytes / 1024 / 1024)}MB. Use a shorter clip.`
            : undefined;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/generations/text-to-video${workspaceQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          image: image!.url,
          video: clip!.url,
          resolution,
          orientation: effectiveOrientation,
          prompt: config.prompt ? prompt.trim() || undefined : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json;
    },
    onSuccess: (data) => {
      onCreated(data.id);
      invalidateCredits();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't start generation", description: err.message, variant: "error" });
    },
  });

  function submit() {
    if (!incompleteReason && !blockedReason) mutation.mutate();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
      className="flex h-full min-h-0 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        <PanelSection label="Model">
          <ProviderModelPicker models={models} value={model} onChange={onModelChange} fullWidth />
        </PanelSection>

        <PanelSection
          label="Character"
          hint={
            config.kind === "replace"
              ? "The person who will appear in the clip's scene."
              : "The person to animate — the video keeps this image's scene."
          }
        >
          <PanelDropzone
            label="Upload a character image"
            sublabel={config.maxBytes ? `JPG, PNG or WEBP, up to ${Math.round(config.maxBytes / 1024 / 1024)}MB` : "JPG, PNG or WEBP"}
            previewUrl={image?.preview}
            uploading={image?.uploading}
            onFile={pickImage}
            onRemove={() => setImage(null)}
          />
        </PanelSection>

        <PanelSection
          label="Reference video"
          hint={`${MOTION_MIN_SECONDS}-${maxSeconds}s, MP4 or MOV. Your character copies the movement; the result is as long as the clip.`}
        >
          <PanelDropzone
            className="h-40"
            mediaKind="video"
            label="Upload a motion clip"
            sublabel="A dance, a walk, a gesture"
            previewUrl={clip?.preview}
            uploading={clip?.uploading}
            badge={clip?.seconds !== undefined ? formatMediaDuration(clip.seconds) : undefined}
            onFile={pickClip}
            onRemove={() => setClip(null)}
          />
        </PanelSection>

        {config.prompt && (
          <PanelSection label="Prompt" hint="Optional — extra direction for the scene or style.">
            <PanelPromptField
              value={prompt}
              onChange={(v) => {
                setPrompt(v);
                onPromptChange(v);
              }}
              onSubmit={submit}
              placeholder="Describe anything the clip doesn't show"
              maxLength={MOTION_PROMPT_MAX_LENGTH}
            />
          </PanelSection>
        )}

        <PanelSection label="Settings">
          <PanelFieldList>
            <FieldRow label="Resolution">
              <PillSelect
                icon={Monitor}
                value={resolution}
                options={config.resolutions}
                onChange={setResolution}
                isOptionLocked={(r) => isResolutionLocked(r, tierInfo)}
                lockedHint={(r) => upgradeHint(minTierForResolution(r), r)}
              />
            </FieldRow>
            {config.orientation && (
              <FieldRow
                label="Facing"
                description={
                  orientation === "image"
                    ? `Keeps the photo's pose and facing. Clips up to ${MOTION_MAX_SECONDS.image}s.`
                    : "Follows the clip's body direction."
                }
              >
                <SegmentedTabs
                  value={orientation}
                  options={["video", "image"] as const}
                  onChange={setOrientation}
                  renderLabel={(o) => ORIENTATION_LABEL[o]}
                />
              </FieldRow>
            )}
          </PanelFieldList>
        </PanelSection>
      </div>

      <div className="shrink-0 border-t border-line p-4 sm:p-5">
        <CreditsSubmitPill
          fullWidth
          credits={credits}
          loading={mutation.isPending || busy || Boolean(image?.uploading) || Boolean(clip?.uploading)}
          balance={creditBalance}
          blockedReason={blockedReason}
          incompleteReason={incompleteReason}
        />
      </div>
    </form>
  );
}
