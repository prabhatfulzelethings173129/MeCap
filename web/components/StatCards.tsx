"use client";

import { fmtPct } from "@/lib/format";
import { Stats } from "@/lib/types";
import { pctColorClass } from "./ui";

export default function StatCards({ stats }: { stats: Stats }) {
  const cards: { label: string; value: string; className: string }[] = [
    { label: "Today", value: fmtPct(stats.todayPct), className: pctColorClass(stats.todayPct) },
    { label: "Since IPO", value: fmtPct(stats.sinceIpoPct), className: pctColorClass(stats.sinceIpoPct) },
    { label: "Blocks today", value: String(stats.blocksToday), className: "text-[#e6edf3]" },
    { label: "Focus", value: `${stats.focusToday.toFixed(0)}%`, className: "text-[#3b82f6]" },
    {
      label: "Bull run",
      value: `${stats.bullRun}d`,
      className: stats.bullRun > 0 ? "text-[#16c784]" : "text-[#8b949e]",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-[#1c242d] bg-[#0f141a] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">{c.label}</div>
          <div className={`mt-1 font-mono text-xl font-bold ${c.className}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
