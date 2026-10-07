import Image from "next/image";
import { Reveal } from "@/components/marketing/reveal";
import { CreateInfluencerLink, WatchFilmButton } from "@/components/landing/ai-influencer-banner-actions";

const STEPS = ["Design", "Animate", "Post"] as const;

/**
 * Launch banner for AI Influencer, after the launch creative: copy left, the
 * tilted cast grid right. The grid is one 31 KB still (a crop of that
 * creative) drifting on a transform-only loop, not a wall of live tiles, and
 * the 26s film behind "Watch the film" is the root layout's announcement
 * dialog — nothing video-sized loads until someone asks for it.
 */
export function AiInfluencerBanner() {
  return (
    <section className="container-page py-4" aria-labelledby="ai-influencer-banner-title">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[28px] border border-line bg-surface-2">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="relative z-10 p-7 sm:p-10 lg:py-14 lg:pr-4 lg:pl-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] leading-none tracking-[0.2em] text-muted uppercase">
                <span
                  className="size-1.5 rounded-full bg-brand shadow-glow-sm motion-safe:animate-status-pulse"
                  aria-hidden="true"
                />
                New · <span className="text-brand">For free</span>
              </span>

              <h2
                id="ai-influencer-banner-title"
                className="mt-5 text-[40px] leading-[0.95] font-black tracking-tight text-ink sm:text-5xl xl:text-[64px]"
              >
                Your next influencer
                <span className="text-accent-script mt-1 block text-[1.12em] tracking-normal text-brand normal-case">
                  isn’t human.
                </span>
              </h2>

              <p className="mt-5 max-w-md text-body text-muted">
                Design an AI influencer once. Face, body and style stay locked in every video
                you create.
              </p>

              <ol className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-caption tracking-wider text-text-tertiary uppercase">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    {i > 0 && <span className="h-px w-4 bg-line" aria-hidden="true" />}
                    <span>
                      <span className="text-brand">0{i + 1}</span> {step}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <CreateInfluencerLink />
                {/* Enforced by the API (firstPortraitIsFree in
                    routes/influencers.ts), not just promised here. */}
                <p className="text-body-sm text-muted">No credits needed for your first one.</p>
              </div>
            </div>

            {/* Above the copy on mobile, so the cast is the first thing seen;
                bleeds off the card's right edge from lg. */}
            <div className="relative -order-1 aspect-[16/10] overflow-hidden lg:order-none lg:aspect-auto lg:min-h-[440px]">
              <Image
                src="/marketing/influencer/cast-grid.webp"
                alt="A grid of AI influencer character sheets, each with a locked face, body and outfit"
                fill
                sizes="(min-width: 1440px) 700px, (min-width: 1024px) 50vw, 100vw"
                className="object-cover object-left motion-safe:animate-cast-drift"
              />
              {/* Lime bloom between the cards, then fades into the card so the
                  photo has no hard edge against the copy. */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 45% 55% at 35% 75%, rgb(187 220 18 / 0.14), transparent 70%)",
                }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-2 via-transparent to-transparent lg:bg-gradient-to-r lg:via-surface-2/20"
                aria-hidden="true"
              />
              <WatchFilmButton />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
