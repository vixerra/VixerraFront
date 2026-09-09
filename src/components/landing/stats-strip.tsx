"use client";

import { useInView } from "@/hooks/use-in-view";
import { useCountUp } from "@/hooks/use-count-up";

const STATS = [
  { target: 3, suffix: " formats", label: "Text, image & audio-guided generation" },
  { target: 60, prefix: "<", suffix: "s", label: "Typical time to a finished clip" },
  { target: 1080, suffix: "p", label: "Broadcast-ready output resolution" },
  { target: 5, suffix: " models", label: "Video & image models to choose from" },
];

function StatItem({ stat }: { stat: (typeof STATS)[number] }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.5);
  const value = useCountUp(stat.target, inView);

  return (
    <div ref={ref} className="text-center">
      <p className="text-gradient text-3xl font-bold tracking-tight sm:text-heading">
        {stat.prefix}
        {value}
        {stat.suffix}
      </p>
      <p className="mt-2 text-caption text-muted">{stat.label}</p>
    </div>
  );
}

export function StatsStrip() {
  return (
    <section className="container-page py-16">
      <div className="grid grid-cols-2 gap-8 border-y border-line py-12 sm:grid-cols-4">
        {STATS.map((stat) => (
          <StatItem key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}
