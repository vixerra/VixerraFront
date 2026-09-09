export default function AppLoading() {
  return (
    <div className="motion-safe:animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-xl bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-surface-2" />
        <div className="h-28 rounded-2xl bg-surface-2" />
        <div className="h-28 rounded-2xl bg-surface-2" />
      </div>
      <div className="h-64 rounded-2xl bg-surface-2" />
    </div>
  );
}
