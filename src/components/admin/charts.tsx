"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

/**
 * Charts for the admin panel, deliberately reusing the customer dashboard's
 * chart language (see dashboard/usage-chart.tsx): same lime stroke, same
 * translucent grid, same dark tooltip card. An operator moving between the
 * two products shouldn't have to re-learn how to read a graph.
 *
 * Colours are hard-coded hex rather than CSS variables because recharts
 * renders SVG attributes, not classes, and can't resolve var(--color-brand).
 * They mirror globals.css — keep them in step if the palette moves.
 */
const BRAND = "#bbdc12";
const AMBER = "#ffd400";
const RED = "#e8404f";
const INFO = "#56a8e8";
const MUTED = "#979ca6";
const GRID = "rgba(255,255,255,0.1)";

/** Series arrive as "MM-DD" (see the backend's to_char). `new Date("09-02")`
 *  is not a spec-conformant date string — V8 guesses, WebKit returns Invalid
 *  Date and then throws on format — so build from explicit parts instead.
 *  Same fix as the customer dashboard's chart. */
function formatTick(date: ReactNode) {
  if (typeof date !== "string") return "";
  const [month, day] = date.split("-").map(Number);
  if (!month || !day) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, month - 1, day)));
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
}

const tooltipProps = {
  contentStyle: {
    background: "#17171a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: "#f7f8fa" },
} as const;

export function ChartCard({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface-2 p-5 shadow-card sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-feature-title font-bold text-ink">{title}</h3>
          {hint && <p className="mt-1 text-caption text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Volume over time with failures stacked underneath in red — one glance
 *  answers both "how busy" and "how healthy", which are the two questions
 *  that always get asked together. */
export function TrendChart({
  data,
  showFailed,
  color = BRAND,
  height = 240,
}: {
  data: { date: string; count: number; failed?: number }[];
  showFailed?: boolean;
  color?: string;
  height?: number;
}) {
  const isMobile = useIsMobile();
  const gradientId = `trend-${color.replace("#", "")}`;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            stroke={MUTED}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval={isMobile ? 6 : 4}
            minTickGap={isMobile ? 16 : 8}
          />
          <YAxis
            stroke={MUTED}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={34}
          />
          <Tooltip labelFormatter={formatTick} {...tooltipProps} />
          <Area
            type="monotone"
            dataKey="count"
            name="total"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
          {showFailed && (
            <Area
              type="monotone"
              dataKey="failed"
              name="failed"
              stroke={RED}
              strokeWidth={2}
              fill="transparent"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  completed: BRAND,
  failed: RED,
  processing: INFO,
  queued: AMBER,
  pending: AMBER,
};

/** Donut rather than a pie: the hole carries the total, so the chart answers
 *  "how many altogether" as well as "in what proportion". */
export function BreakdownDonut({
  data,
  total,
  totalLabel,
  colors,
  height = 220,
}: {
  data: { name: string; value: number }[];
  total: number;
  totalLabel: string;
  colors?: Record<string, string>;
  height?: number;
}) {
  const palette = colors ?? STATUS_COLORS;
  const fallback = [BRAND, AMBER, INFO, RED, MUTED];

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div style={{ height, width: height }} className="relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={palette[d.name] ?? fallback[i % fallback.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipProps} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centred inside the ring, pointer-events-none so it never steals
            the hover from the segments underneath. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-subheading font-bold text-ink">
            {total.toLocaleString()}
          </span>
          <span className="text-caption text-muted">{totalLabel}</span>
        </div>
      </div>

      <ul className="min-w-40 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-body-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: palette[d.name] ?? fallback[i % fallback.length] }}
                aria-hidden="true"
              />
              <span className="truncate text-muted capitalize">{d.name}</span>
            </span>
            <span className="shrink-0 font-medium text-ink-soft">{d.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars — the right shape when the category labels are long
 *  (model ids run to 30+ characters and would be unreadable rotated). */
export function RankedBars({
  data,
  height = 240,
  color = RED,
}: {
  data: { label: string; value: number; secondary?: number }[];
  height?: number;
  color?: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke={MUTED} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={150}
          />
          <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
