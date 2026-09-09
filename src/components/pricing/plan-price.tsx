import { formatMoney } from "@/lib/currency";

/** Renders a plan's monthly price in US dollars. */
export function PlanPrice({
  priceMonthly,
  className,
  suffixClassName,
  showSuffix = true,
}: {
  priceMonthly: number;
  className?: string;
  suffixClassName?: string;
  showSuffix?: boolean;
}) {
  return (
    <>
      <span className={className}>{formatMoney(priceMonthly)}</span>
      {showSuffix && <span className={suffixClassName}>/month</span>}
    </>
  );
}
