"use client";

import { fmtDateShort, fmtPct, fmtPrice, fmtSigned } from "@/lib/format";
import { Stats } from "@/lib/types";

export default function RecordsTab({ stats }: { stats: Stats }) {
  const rows: { label: string; value: string; sub: string | null; color: string }[] = [
    { label: "Highest price", value: fmtPrice(stats.highestPrice), sub: null, color: "text-[#16c784]" },
    {
      label: "Best day",
      value: stats.bestDay ? fmtPct(stats.bestDay.pct) : "—",
      sub: stats.bestDay ? fmtDateShort(stats.bestDay.date) : null,
      color: "text-[#16c784]",
    },
    {
      label: "Worst day",
      value: stats.worstDay ? fmtPct(stats.worstDay.pct) : "—",
      sub: stats.worstDay ? fmtDateShort(stats.worstDay.date) : null,
      color: "text-[#ea3943]",
    },
    {
      label: "Longest bull run",
      value: `${stats.longestBullRun} day${stats.longestBullRun === 1 ? "" : "s"}`,
      sub: null,
      color: "text-[#e6edf3]",
    },
    {
      label: "Most productive day",
      value: stats.mostProductiveDay ? `${stats.mostProductiveDay.productive} min` : "—",
      sub: stats.mostProductiveDay ? fmtDateShort(stats.mostProductiveDay.date) : null,
      color: "text-[#3b82f6]",
    },
    {
      label: "Biggest trade",
      value: stats.biggestTrade ? `${fmtSigned(stats.biggestTrade.points)} pts` : "—",
      sub: stats.biggestTrade
        ? `${stats.biggestTrade.activity} · ${fmtDateShort(stats.biggestTrade.date)}`
        : null,
      color:
        stats.biggestTrade && stats.biggestTrade.points < 0
          ? "text-[#ea3943]"
          : "text-[#16c784]",
    },
  ];

  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between gap-3 border-t border-[#1c242d] py-2.5 first:border-t-0"
        >
          <span className="text-sm text-[#8b949e]">{r.label}</span>
          <span className="text-right">
            <span className={`font-mono text-sm font-semibold ${r.color}`}>{r.value}</span>
            {r.sub && <span className="block font-mono text-[10px] text-[#8b949e]">{r.sub}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
