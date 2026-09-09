"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easing } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { GuideArt as GuideArtKind } from "@/lib/page-guides";

/**
 * The animated diagram beside a guide's steps.
 *
 * It is not decoration and it is not a screenshot: it is a diagram of the
 * screen's SHAPE that follows along with the walkthrough. Each scene is
 * built from ordered parts, and the part matching the current step lights
 * up while the rest dim back — so the picture answers "which bit of the
 * screen is this step talking about?" without a single label.
 *
 * A screenshot would go stale the first time a button moves and quietly
 * start lying. A shape stays true, and it survives being 200px wide.
 *
 * Everything is drawn from the app's own surfaces and the signal set (see
 * globals.css). Ambient motion loops while the panel is open; under
 * prefers-reduced-motion every loop stops and every scene still reads as a
 * finished, static composition with the active part clearly marked.
 */

type SceneProps = { step: number; still: boolean };

// ------------------------------------------------------------- primitives

function Plate({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-center gap-2 overflow-hidden rounded-xl border border-line bg-surface-dark p-3.5">
      {children}
    </div>
  );
}

/**
 * One addressable region of a scene. `on` is what makes the diagram track
 * the walkthrough: the active part lifts and gets a lime ring, everything
 * else drops back so the eye has one place to land.
 */
function Part({
  on,
  still,
  className,
  children,
}: {
  on: boolean;
  still: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={false}
      animate={
        still
          ? { opacity: on ? 1 : 0.5 }
          : { opacity: on ? 1 : 0.42, scale: on ? 1.035 : 0.985, y: on ? -1 : 0 }
      }
      transition={{ duration: 0.42, ease: easing.elegant }}
      className={cn(
        "relative rounded-lg",
        on && "ring-1 shadow-[0_0_18px_-4px_rgb(187_220_18_/_0.5)] ring-brand/70",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function Bar({ w, tone = "line" }: { w: string; tone?: "line" | "ink" | "brand" | "amber" }) {
  const tones = {
    line: "bg-white/12",
    ink: "bg-white/30",
    brand: "bg-brand",
    amber: "bg-accent-amber",
  } as const;
  return <span className={`block h-1.5 rounded-full ${tones[tone]}`} style={{ width: w }} />;
}

function Chip({ children, on = false }: { children: React.ReactNode; on?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[8px] leading-none",
        on ? "bg-brand font-semibold text-on-brand" : "border border-line text-muted",
      )}
    >
      {children}
    </span>
  );
}

/** A light sweep across a surface — the "something is happening here" cue. */
function Shimmer({ still }: { still: boolean }) {
  if (still) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      animate={{ x: ["-120%", "420%"] }}
      transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.4, ease: easing.smooth }}
    />
  );
}

/** Caret-style typing bar for anything representing a prompt. */
function Typing({ still, w = "70%" }: { still: boolean; w?: string }) {
  if (still) return <Bar w={w} />;
  return (
    <motion.span
      className="block h-1.5 rounded-full bg-white/25"
      animate={{ width: ["8%", w, "8%"] }}
      transition={{ duration: 5, repeat: Infinity, ease: easing.smooth, times: [0, 0.55, 1] }}
    />
  );
}

// ----------------------------------------------------------------- scenes

/** /generate and /generate/image — parts map 1:1 onto the composer steps. */
function Composer({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part on={at(0)} still={still} className="flex items-center justify-between px-1">
        <Chip on>Seedance 2.5</Chip>
        <span className="text-[8px] font-semibold text-accent-amber">113 cr</span>
      </Part>

      <Part on={at(1)} still={still} className="flex gap-1.5 p-0.5">
        {["First", "Last"].map((f) => (
          <span
            key={f}
            className="flex h-7 flex-1 items-center justify-center rounded-md border border-dashed border-line bg-surface-2 text-[8px] text-tertiary"
          >
            {f} frame
          </span>
        ))}
      </Part>

      <Part
        on={at(2)}
        still={still}
        className="relative space-y-1.5 overflow-hidden rounded-lg border border-border-subtle bg-surface-2 p-2"
      >
        <Bar w="86%" tone="ink" />
        <Typing still={still} w="58%" />
        <Shimmer still={still} />
      </Part>

      <Part on={at(3)} still={still} className="flex gap-1 p-0.5">
        <Chip>5s</Chip>
        <Chip>720p</Chip>
        <Chip>9:16</Chip>
        <Chip>audio</Chip>
      </Part>

      <Part
        on={at(4)}
        still={still}
        className="flex items-center justify-between rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-2 py-1"
      >
        <span className="text-[8px] text-muted">Cost</span>
        <span className="font-mono text-[9px] font-semibold text-accent-amber">113 credits</span>
      </Part>

      <Part on={at(5)} still={still} className="h-1.5 overflow-hidden rounded-full bg-white/8">
        {still ? (
          <span className="block h-full w-2/3 rounded-full bg-brand" />
        ) : (
          <motion.span
            className="block h-full rounded-full bg-brand"
            animate={{ width: ["6%", "100%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: easing.snappy }}
          />
        )}
      </Part>
    </Plate>
  );
}

/** /my-gallery, /collections, /gallery, /admin/content. */
function Gallery({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part on={at(0)} still={still} className="flex gap-1 p-0.5">
        <Chip on>All types</Chip>
        <Chip>Video</Chip>
        <Chip>Failed</Chip>
      </Part>

      <Part on={at(1)} still={still} className="grid grid-cols-3 gap-1.5 p-1">
        {Array.from({ length: 6 }).map((_, i) =>
          still ? (
            <span
              key={i}
              className="block aspect-[4/3] rounded-md border border-line bg-gradient-to-br from-white/14 to-transparent"
            />
          ) : (
            <motion.span
              key={i}
              className="block aspect-[4/3] rounded-md border border-line bg-gradient-to-br from-white/14 to-transparent"
              animate={{ opacity: [0.3, 1, 0.3], y: [1, -1, 1] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: easing.smooth,
                delay: i * 0.18,
              }}
            />
          ),
        )}
      </Part>

      <Part on={at(2)} still={still} className="flex justify-end gap-1 p-0.5">
        <Chip>Download</Chip>
        <Chip>Collect</Chip>
        <Chip on>Publish</Chip>
      </Part>
    </Plate>
  );
}

/** /editor — library, frame, clips, overlays, export. */
function Timeline({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <div className="flex gap-1.5">
        <Part on={at(0)} still={still} className="flex w-9 shrink-0 flex-col gap-1 p-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-4 rounded border border-line bg-gradient-to-br from-white/14 to-transparent"
            />
          ))}
        </Part>

        <div className="min-w-0 flex-1 space-y-1.5">
          <Part on={at(1)} still={still} className="flex gap-1 p-0.5">
            <Chip on>9:16</Chip>
            <Chip>1:1</Chip>
            <Chip>16:9</Chip>
          </Part>

          <Part
            on={at(2)}
            still={still}
            className="relative rounded-lg border border-border-subtle bg-surface-2 p-1.5"
          >
            <div className="flex gap-1">
              {[3, 2, 4, 2].map((flex, i) => (
                <span
                  key={i}
                  style={{ flex }}
                  className={cn(
                    "h-5 rounded border bg-gradient-to-br from-white/14 to-transparent",
                    i === 2 ? "border-brand" : "border-line",
                  )}
                />
              ))}
            </div>
            {still ? (
              <span className="absolute inset-y-1 left-1/3 w-0.5 rounded bg-brand" />
            ) : (
              <motion.span
                className="absolute inset-y-1 w-0.5 rounded bg-brand shadow-[0_0_8px_rgb(187_220_18_/_0.8)]"
                animate={{ left: ["6%", "92%"] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
              />
            )}
          </Part>

          <Part on={at(3)} still={still} className="flex gap-1 p-0.5">
            <span className="h-3 flex-[2] rounded border border-accent-hot/50 bg-accent-hot/15" />
            <span className="h-3 flex-[5] rounded border border-accent-amber/30 bg-accent-amber/10" />
          </Part>
        </div>
      </div>

      <Part
        on={at(4)}
        still={still}
        className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2 px-2 py-1"
      >
        <span className="text-[8px] text-muted">Export</span>
        <span className="rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-semibold text-on-brand">
          MP4
        </span>
      </Part>
    </Plate>
  );
}

/** /presets, /presets/[slug], /admin/presets. */
function Presets({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part on={at(0)} still={still} className="flex gap-1 p-0.5">
        <Chip on>Trending</Chip>
        <Chip>Portrait</Chip>
        <Chip>Product</Chip>
      </Part>

      <Part on={at(1)} still={still} className="grid grid-cols-2 gap-1.5 p-1">
        {Array.from({ length: 4 }).map((_, i) =>
          still ? (
            <span
              key={i}
              className="block aspect-video rounded-md border border-line bg-gradient-to-br from-white/14 to-transparent"
            />
          ) : (
            <motion.span
              key={i}
              className="block aspect-video rounded-md border border-line bg-gradient-to-br from-white/14 to-transparent"
              animate={{ scale: [1, 1.05, 1], opacity: [0.55, 1, 0.55] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: easing.smooth,
                delay: i * 0.26,
              }}
            />
          ),
        )}
      </Part>

      <Part on={at(2)} still={still} className="flex justify-end p-0.5">
        <span className="rounded-full bg-brand px-2 py-0.5 text-[8px] font-semibold text-on-brand">
          Generate
        </span>
      </Part>
    </Plate>
  );
}

/** /settings/social and the creator-tools publish panel. */
function Publish({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part on={at(0)} still={still} className="flex gap-1 p-0.5">
        {["TT", "IG", "YT", "FB"].map((p, i) =>
          still || i === 3 ? (
            <span
              key={p}
              className={cn(
                "flex h-6 flex-1 items-center justify-center rounded-md border text-[8px]",
                i < 3 ? "border-brand/50 text-brand" : "border-line text-tertiary",
              )}
            >
              {p}
            </span>
          ) : (
            <motion.span
              key={p}
              className="flex h-6 flex-1 items-center justify-center rounded-md border border-brand/50 text-[8px] text-brand"
              animate={{ borderColor: ["rgb(187 220 18 / 0.3)", "rgb(187 220 18 / 1)", "rgb(187 220 18 / 0.3)"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: easing.smooth, delay: i * 0.3 }}
            >
              {p}
            </motion.span>
          ),
        )}
      </Part>

      <Part
        on={at(1)}
        still={still}
        className="relative space-y-1.5 overflow-hidden rounded-lg border border-border-subtle bg-surface-2 p-2"
      >
        <Typing still={still} w="76%" />
        <Bar w="44%" tone="brand" />
        <Shimmer still={still} />
      </Part>

      <Part on={at(2)} still={still} className="flex items-center justify-between p-0.5">
        <Chip>Schedule</Chip>
        <span className="rounded-full bg-brand px-2 py-0.5 text-[8px] font-semibold text-on-brand">
          Publish
        </span>
      </Part>
    </Plate>
  );
}

/** /dashboard, /settings/billing, /pricing, /admin/credits. */
function Credits({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part on={at(0)} still={still} className="flex items-baseline gap-1 px-1">
        {still ? (
          <span className="font-display text-xl font-bold text-accent-amber">1,000</span>
        ) : (
          <motion.span
            className="font-display text-xl font-bold text-accent-amber"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: easing.smooth }}
          >
            1,000
          </motion.span>
        )}
        <span className="text-[8px] text-muted">credits</span>
      </Part>

      <Part on={at(1)} still={still} className="h-1.5 overflow-hidden rounded-full bg-white/8">
        {still ? (
          <span className="block h-full w-2/3 rounded-full bg-accent-amber" />
        ) : (
          <motion.span
            className="block h-full rounded-full bg-accent-amber"
            animate={{ width: ["22%", "82%", "22%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: easing.smooth }}
          />
        )}
      </Part>

      <Part on={at(2)} still={still} className="flex items-end gap-1 p-1">
        {[40, 62, 34, 78, 52, 88, 46].map((h, i) =>
          still ? (
            <span key={i} className="flex-1 rounded-sm bg-white/14" style={{ height: h * 0.28 }} />
          ) : (
            <motion.span
              key={i}
              className="flex-1 rounded-sm bg-white/14"
              animate={{ height: [h * 0.16, h * 0.32, h * 0.16] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: easing.smooth,
                delay: i * 0.12,
              }}
            />
          ),
        )}
      </Part>
    </Plate>
  );
}

/** /collections/[id] and /c/[token]. */
function Share({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part on={at(0)} still={still} className="grid grid-cols-3 gap-1.5 p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className="block aspect-square rounded-md border border-line bg-gradient-to-br from-white/14 to-transparent"
          />
        ))}
      </Part>

      <Part
        on={at(1)}
        still={still}
        className="relative flex items-center gap-1.5 overflow-hidden rounded-lg border border-brand/40 bg-brand/10 px-2 py-1.5"
      >
        <span className="size-1.5 shrink-0 rounded-full bg-brand" />
        {still ? (
          <Bar w="68%" tone="brand" />
        ) : (
          <motion.span
            className="block h-1.5 rounded-full bg-brand"
            animate={{ width: ["24%", "68%", "24%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: easing.smooth }}
          />
        )}
        <Shimmer still={still} />
      </Part>
    </Plate>
  );
}

/** /settings/team and /invite/[token]. */
function Team({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      {[0, 1, 2].map((i) => (
        <Part
          key={i}
          on={at(i)}
          still={still}
          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5"
        >
          {i === 2 && !still ? (
            <motion.span
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-muted"
              animate={{ scale: [1, 1.15, 1], backgroundColor: ["rgb(255 255 255 / 0.1)", "rgb(187 220 18 / 0.25)", "rgb(255 255 255 / 0.1)"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: easing.smooth }}
            >
              +
            </motion.span>
          ) : (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                i === 0 ? "bg-brand text-on-brand" : "bg-white/10 text-muted",
              )}
            >
              {i === 0 ? "O" : i === 1 ? "M" : "+"}
            </span>
          )}
          <Bar w={i === 0 ? "58%" : "40%"} />
        </Part>
      ))}
    </Plate>
  );
}

/** /settings/api-keys. */
function Keys({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part
        on={at(0)}
        still={still}
        className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-2 px-2 py-2"
      >
        <span className="font-mono text-[9px] text-brand">vx_</span>
        <span className="flex flex-1 gap-0.5">
          {Array.from({ length: 16 }).map((_, d) =>
            still ? (
              <span key={d} className="size-1 rounded-full bg-white/25" />
            ) : (
              <motion.span
                key={d}
                className="size-1 rounded-full bg-white/25"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: easing.smooth,
                  delay: d * 0.07,
                }}
              />
            ),
          )}
        </span>
      </Part>

      <Part on={at(1)} still={still} className="flex items-center justify-between px-1.5 py-1">
        <span className="text-[8px] text-muted">Usage</span>
        <span className="font-mono text-[9px] text-accent-amber">draws on credits</span>
      </Part>

      <Part
        on={at(2)}
        still={still}
        className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-2 py-1"
      >
        <span className="text-[8px] text-muted">Leaked?</span>
        <span className="text-[8px] font-semibold text-accent">Revoke</span>
      </Part>
    </Plate>
  );
}

/** /settings, /contact, /privacy, /terms. */
function Account({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      {["68%", "84%", "52%"].map((w, i) => (
        <Part key={i} on={at(i)} still={still} className="space-y-1 p-0.5">
          <Bar w="24%" />
          <div className="relative overflow-hidden rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5">
            <Bar w={w} tone="ink" />
            {at(i) && <Shimmer still={still} />}
          </div>
        </Part>
      ))}
    </Plate>
  );
}

/** The admin panel screens. */
function Admin({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part on={at(0)} still={still} className="flex gap-1.5 p-0.5">
        {["1.2k", "98%", "14"].map((v, i) => (
          <div key={v} className="flex-1 rounded-md border border-border-subtle bg-surface-2 p-1.5">
            <Bar w="48%" />
            {still ? (
              <span className="mt-1 block font-display text-[11px] font-bold text-ink">{v}</span>
            ) : (
              <motion.span
                className="mt-1 block font-display text-[11px] font-bold text-ink"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: easing.smooth,
                  delay: i * 0.3,
                }}
              >
                {v}
              </motion.span>
            )}
          </div>
        ))}
      </Part>

      <Part on={at(1)} still={still} className="space-y-1 p-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 border-b border-border-subtle pb-1">
            {i === 0 && !still ? (
              <motion.span
                className="size-1.5 rounded-full bg-accent-hot"
                animate={{ opacity: [0.35, 1, 0.35], scale: [1, 1.4, 1] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: easing.smooth }}
              />
            ) : (
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  i === 0 ? "bg-accent-hot" : "bg-white/25",
                )}
              />
            )}
            <Bar w={["56%", "42%", "64%", "36%"][i]} />
          </div>
        ))}
      </Part>

      <Part on={at(2)} still={still} className="flex justify-end gap-1 p-0.5">
        <Chip>Audit</Chip>
        <Chip on>Act</Chip>
      </Part>
    </Plate>
  );
}

/** The landing pages. */
function Welcome({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <Part on={at(0)} still={still} className="flex items-center justify-center py-2">
        <span className="relative flex size-14 items-center justify-center">
          {!still && (
            <>
              <motion.span
                className="absolute size-14 rounded-full border border-brand/50"
                animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: easing.smooth }}
              />
              <motion.span
                className="absolute size-14 rounded-full border border-brand/50"
                animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: easing.smooth,
                  delay: 1.3,
                }}
              />
            </>
          )}
          <span className="absolute size-14 rounded-full border border-line" />
          <span className="font-display text-base font-bold tracking-tight text-ink">
            V<span className="text-brand">.</span>
          </span>
        </span>
      </Part>

      <Part on={at(1)} still={still} className="flex justify-center gap-1 p-0.5">
        <Chip>Prompt</Chip>
        <Chip>Cut</Chip>
        <Chip>Publish</Chip>
      </Part>

      <Part on={at(2)} still={still} className="flex justify-center p-0.5">
        <span className="rounded-full bg-brand px-2.5 py-0.5 text-[8px] font-semibold text-on-brand">
          Start free
        </span>
      </Part>
    </Plate>
  );
}

/** The auth screens and /settings/security. */
function Auth({ step, still }: SceneProps) {
  const at = (i: number) => step === i;
  return (
    <Plate>
      <div className="mx-auto w-full max-w-[160px] space-y-2 rounded-lg border border-border-subtle bg-surface-2 p-3">
        <Part on={at(0)} still={still} className="flex justify-center p-0.5">
          <span className="flex size-6 items-center justify-center rounded-full border border-brand/40">
            {still ? (
              <span className="size-1.5 rounded-full bg-brand" />
            ) : (
              <motion.span
                className="size-1.5 rounded-full bg-brand"
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: easing.smooth }}
              />
            )}
          </span>
        </Part>

        <Part on={at(1)} still={still} className="space-y-1.5 p-0.5">
          <div className="relative overflow-hidden rounded border border-border-subtle px-1.5 py-1">
            <Typing still={still} w="82%" />
          </div>
          <div className="rounded border border-border-subtle px-1.5 py-1">
            <Bar w="64%" />
          </div>
        </Part>

        <Part on={at(2)} still={still} className="p-0.5">
          {still ? (
            <span className="block h-4 w-full rounded-md bg-brand" />
          ) : (
            <motion.span
              className="block h-4 w-full rounded-md bg-brand"
              animate={{ opacity: [0.62, 1, 0.62] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: easing.smooth }}
            />
          )}
        </Part>
      </div>
    </Plate>
  );
}

// ----------------------------------------------------------------- export

const SCENES: Record<GuideArtKind, (p: SceneProps) => React.ReactElement> = {
  composer: Composer,
  gallery: Gallery,
  timeline: Timeline,
  presets: Presets,
  publish: Publish,
  credits: Credits,
  share: Share,
  team: Team,
  keys: Keys,
  account: Account,
  admin: Admin,
  welcome: Welcome,
  auth: Auth,
};

export function GuideArt({ kind, step }: { kind: GuideArtKind; step: number }) {
  const reduced = useReducedMotion();
  const Scene = SCENES[kind];
  return <Scene step={step} still={Boolean(reduced)} />;
}
