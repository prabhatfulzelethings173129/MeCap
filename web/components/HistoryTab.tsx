"use client";

import { useMemo } from "react";
import { fmtPct, fmtPrice } from "@/lib/format";
import { DayResult } from "@/lib/types";

function cellColor(day: DayResult): string {
  if (day.missed) return "#262c34";
  if (day.blocks === 0) return "#161c23";
  const strength = 0.3 + 0.7 * Math.min(1, Math.abs(day.pct) / 3);
  if (day.pct > 0) return `rgba(22, 199, 132, ${strength.toFixed(2)})`;
  if (day.pct < 0) return `rgba(234, 57, 67, ${strength.toFixed(2)})`;
  return "#161c23";
}

export default function HistoryTab({ history, today }: { history: DayResult[]; today: string }) {
  const weeks = useMemo(() => {
    if (history.length === 0) return [];
    const [y, m, d] = history[0].date.split("-").map(Number);
    const pad = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay(); // 0 = Sunday
    const cells: (DayResult | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (const day of history) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    const out: (DayResult | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [history]);

  return (
    <div>
      {weeks.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#8b949e]">No history yet.</p>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) =>
                  day ? (
                    <div
                      key={day.date}
                      className={`h-3.5 w-3.5 rounded-[3px] ${
                        day.date === today ? "ring-1 ring-[#3b82f6] ring-offset-1 ring-offset-[#0f141a]" : ""
                      }`}
                      style={{ backgroundColor: cellColor(day) }}
                      title={`${day.date} · ${fmtPrice(day.close)} · ${fmtPct(day.pct)}${
                        day.missed ? " · missed" : day.blocks > 0 ? ` · ${day.blocks} blocks` : " · no blocks"
                      }`}
                    />
                  ) : (
                    <div key={`pad-${wi}-${di}`} className="h-3.5 w-3.5" />
                  ),
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[#8b949e]">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] bg-[#16c784]" /> Up day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] bg-[#ea3943]" /> Down day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] bg-[#262c34]" /> Missed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] bg-[#161c23]" /> No blocks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] ring-1 ring-[#3b82f6] ring-offset-1 ring-offset-[#0f141a]" />{" "}
              Today
            </span>
          </div>
        </>
      )}
    </div>
  );
}
