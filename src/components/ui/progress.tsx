import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-line", className)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-brand transition-[width] duration-300",
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
