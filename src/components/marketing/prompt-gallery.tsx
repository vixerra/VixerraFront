"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clapperboard, Clock, Copy, Monitor, RectangleHorizontal, Sparkles, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Reveal } from "@/components/marketing/reveal";
import { PROMPT_TEMPLATES, buildTemplateText, buildGenerateUrl, type PromptTemplate } from "@/lib/prompt-templates";

/**
 * In-view autoplay, same lazy-load-then-pause-offscreen behavior as the
 * landing page's ShowcaseTile — kept as its own small copy rather than a
 * shared import since this card has different surrounding chrome (prompt
 * text, param chips, copy buttons) that ShowcaseTile doesn't need to know
 * about.
 */
function PromptVideo({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setHasLoadedOnce(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (inView) {
      videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
    }
  }, [inView, hasLoadedOnce]);

  return (
    <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-surface-3">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-3 to-surface-2" />}
      {hasLoadedOnce && (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
          muted
          loop
          playsInline
          preload="none"
          onLoadedData={() => setLoaded(true)}
        >
          <source src={url} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

function ParamChip({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-3 px-2.5 py-1 text-caption text-muted">
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function PromptCard({ template, index }: { template: PromptTemplate; index: number }) {
  const { toast } = useToast();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  async function copy(text: string, mark: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      mark(true);
      setTimeout(() => mark(false), 1800);
    } catch {
      toast({ title: "Couldn't copy", description: "Select and copy manually.", variant: "error" });
    }
  }

  return (
    <Reveal delayMs={(index % 3) * 80}>
      <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 transition-colors hover:border-border-strong">
        <PromptVideo url={template.videoUrl} />

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="max-h-48 overflow-y-auto rounded-lg border border-line bg-surface-3 p-3">
            <pre className="font-mono text-caption whitespace-pre-wrap text-ink-soft">{template.prompt}</pre>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <ParamChip icon={Clock} label={`${template.duration}s`} />
            <ParamChip icon={Monitor} label={template.resolution === "4k" ? "4K" : template.resolution} />
            <ParamChip icon={RectangleHorizontal} label={template.aspectRatio} />
            <ParamChip icon={Clapperboard} label={template.cameraFixed ? "Fixed cam" : "Dynamic cam"} />
            <ParamChip
              icon={template.generateAudio ? Volume2 : VolumeX}
              label={template.generateAudio ? "Audio on" : "Audio off"}
            />
          </div>
          <p className="-mt-2.5 text-caption text-muted">Suggested settings — tune to taste.</p>

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => copy(template.prompt, setCopiedPrompt)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-caption font-medium text-ink-soft transition-colors hover:border-border-strong hover:bg-white/5"
            >
              {copiedPrompt ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              {copiedPrompt ? "Copied" : "Copy prompt"}
            </button>

            <button
              type="button"
              onClick={() => copy(buildTemplateText(template), setCopiedTemplate)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-caption font-medium text-ink-soft transition-colors hover:border-border-strong hover:bg-white/5"
              title="Copy the full prompt + parameter recipe as text"
            >
              {copiedTemplate ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <Clapperboard className="size-3.5" aria-hidden="true" />
              )}
              {copiedTemplate ? "Copied" : "Copy template"}
            </button>

            <Link
              href={buildGenerateUrl(template)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-caption font-semibold text-on-brand shadow-glow-sm transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-glow-md"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              Use this template
            </Link>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function PromptGallery() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {PROMPT_TEMPLATES.map((template, index) => (
        <PromptCard key={template.id} template={template} index={index} />
      ))}
    </div>
  );
}
