export default function MarketingLoading() {
  return (
    <div className="container-page motion-safe:animate-pulse py-24 sm:py-32">
      <div className="mx-auto max-w-2xl space-y-5 text-center">
        <div className="mx-auto h-6 w-56 rounded-full bg-surface-2" />
        <div className="mx-auto h-12 w-full max-w-lg rounded-xl bg-surface-2" />
        <div className="mx-auto h-4 w-full max-w-md rounded-lg bg-surface-2" />
        <div className="mx-auto h-4 w-2/3 max-w-sm rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}
