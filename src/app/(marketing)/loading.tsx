// A full screen tall, so the footer starts below the fold. This skeleton isn't
// only a navigation state: React streams a large page's content after its
// fallback, so the prerendered HTML paints this first too. When it was only a
// few lines tall, the footer sat on screen and jumped down once the page swapped
// in (a CLS of 0.3 on mobile /pricing). Below the fold, that move doesn't count.
export default function MarketingLoading() {
  return (
    <div className="container-page min-h-svh motion-safe:animate-pulse py-24 sm:py-32">
      <div className="mx-auto max-w-2xl space-y-5 text-center">
        <div className="mx-auto h-6 w-56 rounded-full bg-surface-2" />
        <div className="mx-auto h-12 w-full max-w-lg rounded-xl bg-surface-2" />
        <div className="mx-auto h-4 w-full max-w-md rounded-lg bg-surface-2" />
        <div className="mx-auto h-4 w-2/3 max-w-sm rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}
