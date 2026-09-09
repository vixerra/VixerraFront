"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// The API sends dates pre-sliced to "MM-DD" (no year — see buildDailyCounts
// in the backend's dashboard route). `new Date("08-23")` is NOT a spec-
// conformant date string, so parsing it is implementation-defined: V8
// (desktop Chrome) leniently guesses a date and never throws, but Safari/
// WebKit (real iPhones) returns Invalid Date, and formatting an Invalid
// Date with Intl.DateTimeFormat throws — crashing the whole page since
// there's no error boundary. Building the Date from explicit numeric parts
// via Date.UTC sidesteps string-parsing entirely, so it's consistent across
// every engine.
function formatTick(date: ReactNode) {
  if (typeof date !== "string") return "";
  const [month, day] = date.split("-").map(Number);
  if (!month || !day) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month - 1, day)),
  );
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

export function UsageChart({ data }: { data: { date: string; count: number }[] }) {
  const isMobile = useIsMobile();

  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bbdc12" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#bbdc12" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            stroke="#979ca6"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval={isMobile ? 6 : 4}
            minTickGap={isMobile ? 16 : 8}
          />
          <YAxis
            stroke="#979ca6"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            labelFormatter={formatTick}
            contentStyle={{
              background: "#17171a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#f7f8fa" }}
            itemStyle={{ color: "#bbdc12" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#bbdc12"
            strokeWidth={2}
            fill="url(#usageFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
