"use client";

import { useState } from "react";
import { SeedanceVideoForm } from "./seedance-video-form";
import { Seedance2VideoForm } from "./seedance2-video-form";
import { DynamicModelForm } from "./dynamic-model-form";
import { UnsupportedModelNotice } from "./unsupported-model-notice";
import { getCloudflareModel } from "@/lib/cloudflare-models";
import {
  VIDEO_MODELS,
  SEEDANCE_MODEL_ID,
  SEEDANCE2_MODEL_ID,
  SEEDANCE2_RESOLUTIONS,
  SEEDANCE2_ASPECT_RATIOS,
  type VideoModelId,
  type TierInfo,
} from "@/lib/constants";

type Seedance2InitialParams = {
  duration?: number;
  resolution?: (typeof SEEDANCE2_RESOLUTIONS)[number];
  aspectRatio?: (typeof SEEDANCE2_ASPECT_RATIOS)[number];
};

export function TextToVideoForm({
  onCreated,
  busy,
  initialModel,
  initialPrompt: initialPromptProp,
  initialParams,
  tierInfo,
}: {
  onCreated: (jobId: string) => void;
  busy: boolean;
  /** Deep-link support (e.g. "Use this template" from the prompt gallery). */
  initialModel?: VideoModelId;
  initialPrompt?: string;
  /** Only applied to Seedance 2.0 — the only model the prompt gallery targets. */
  initialParams?: Seedance2InitialParams;
  /** Current plan's limits — undefined while still loading. */
  tierInfo?: TierInfo;
}) {
  const [model, setModel] = useState<VideoModelId>(
    initialModel && VIDEO_MODELS.some((m) => m.id === initialModel) ? initialModel : VIDEO_MODELS[0].id,
  );
  // Shared across model switches so re-picking a model doesn't lose what
  // you've already typed — each sub-form owns everything else itself.
  const [prompt, setPrompt] = useState(initialPromptProp ?? "");
  const dynamicConfig = getCloudflareModel(model);

  if (model === SEEDANCE_MODEL_ID) {
    return (
      <SeedanceVideoForm
        key="seedance-2.5"
        models={VIDEO_MODELS}
        model={model}
        onModelChange={setModel}
        initialPrompt={prompt}
        onPromptChange={setPrompt}
        onCreated={onCreated}
        busy={busy}
        tierInfo={tierInfo}
      />
    );
  }

  if (model === SEEDANCE2_MODEL_ID) {
    return (
      <Seedance2VideoForm
        key="seedance-2.0"
        models={VIDEO_MODELS}
        model={model}
        onModelChange={setModel}
        initialPrompt={prompt}
        onPromptChange={setPrompt}
        initialParams={initialParams}
        onCreated={onCreated}
        busy={busy}
        tierInfo={tierInfo}
      />
    );
  }

  if (dynamicConfig && dynamicConfig.category === "text-to-video") {
    return (
      <DynamicModelForm
        key={model}
        config={dynamicConfig}
        mode="text-to-video"
        models={VIDEO_MODELS}
        model={model}
        onModelChange={setModel}
        initialPrompt={prompt}
        onPromptChange={setPrompt}
        onCreated={onCreated}
        busy={busy}
        tierInfo={tierInfo}
      />
    );
  }

  // Alibaba's image-to-video-only models (hh1.1-i2v, wan-2.7-i2v) still live
  // in this merged "Video" tab now that the dedicated Image to Video tab is
  // gone — they just need their own required-image mode.
  if (dynamicConfig && dynamicConfig.category === "image-to-video") {
    return (
      <DynamicModelForm
        key={model}
        config={dynamicConfig}
        mode="image-to-video"
        models={VIDEO_MODELS}
        model={model}
        onModelChange={setModel}
        initialPrompt={prompt}
        onPromptChange={setPrompt}
        onCreated={onCreated}
        busy={busy}
        tierInfo={tierInfo}
      />
    );
  }

  // Unreachable today: VIDEO_MODELS is the two Seedance ids plus the
  // registry itself, so every id it can hold is caught above. It stays as a
  // visible dead end rather than a crash in case an id is ever added to that
  // list without a matching registry entry.
  return <UnsupportedModelNotice modelId={model} />;
}
