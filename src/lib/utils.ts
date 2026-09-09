import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCredits(n: number) {
  if (!Number.isFinite(n)) return "Unlimited";
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((d.getTime() - Date.now()) / 1000);
  const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return rtf.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return rtf.format(seconds, "second");
}

export function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
