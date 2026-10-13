import Image from "next/image";
import { TryGenjutsuLink, WatchFilmButton } from "@/components/landing/ai-influencer-banner-actions";
import { GENJUTSU_MODES } from "@/lib/genjutsu";

/**
 * Genjutsu's slide in the landing launch carousel, laid out like AI
 * Influencer's: copy left, visual right. The visual is one 18 KB still (the
 * film's own before/after split, cropped); the 15s film behind "Watch the
 * film" is the root layout's announcement dialog, so nothing video-sized
 * loads until someone asks for it.
 */
export function GenjutsuSlide() {
  return (
    <div className="relative isolate h-full overflow-hidden rounded-[28px] border border-line bg-surface-2">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative z-10 p-7 sm:p-10 lg:py-14 lg:pr-4 lg:pl-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-hot/30 bg-accent-hot/[0.08] py-1 pr-1 pl-3 font-mono text-[11px] leading-none tracking-[0.2em] text-accent-hot-ink uppercase">
            <span
              className="size-1.5 rounded-full bg-accent-hot shadow-glow-hot-sm motion-safe:animate-status-pulse"
              aria-hidden="true"
            />
            New feature
            <span className="rounded-full bg-accent-hot-strong px-2 py-1 font-semibold tracking-[0.14em] text-white">
              Live
            </span>
          </span>

          <h3 className="mt-5 text-[40px] leading-[0.95] font-black tracking-tight text-ink sm:text-5xl xl:text-[64px]">
            Swap anything.
            <span className="text-accent-script mt-1 block text-[1.12em] tracking-normal normal-case">
              <span className="mark-lime">Keep every move.</span>
            </span>
          </h3>

          <p className="mt-5 max-w-md text-body text-muted">
            Recast any clip with your own characters, outfits, products and places. Everything
            you don’t touch stays as filmed.
          </p>

          <ol className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-caption tracking-wider text-text-tertiary uppercase">
            {GENJUTSU_MODES.map((mode, i) => (
              <li key={mode.id} className="flex items-center gap-3">
                {i > 0 && <span className="h-px w-4 bg-line" aria-hidden="true" />}
                <span>
                  <span className="text-brand-ink">0{i + 1}</span> {mode.title}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <TryGenjutsuLink />
            <p className="text-body-sm text-muted">Upload a clip, add references, done.</p>
          </div>
        </div>

        {/* Above the copy on mobile, as on the influencer slide. */}
        <div className="relative -order-1 aspect-[16/10] overflow-hidden lg:order-none lg:aspect-auto lg:min-h-[440px]">
          <Image
            src="/marketing/genjutsu/compare.webp"
            alt="Before and after: the original clip on the left, the same shot recast by Genjutsu with a new outfit on the right"
            fill
            sizes="(min-width: 1440px) 700px, (min-width: 1024px) 50vw, 100vw"
            className="object-cover motion-safe:animate-cast-drift"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 45% 55% at 35% 75%, rgb(168 148 239 / 0.14), transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-2 via-transparent to-transparent lg:bg-gradient-to-r lg:via-surface-2/20"
            aria-hidden="true"
          />
          <WatchFilmButton launch="genjutsu" />
        </div>
      </div>
    </div>
  );
}
