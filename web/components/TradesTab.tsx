"use client";

import { useState } from "react";
import { fmtDateShort, fmtPct, fmtPrice, fmtSigned } from "@/lib/format";
import { Trade } from "@/lib/types";
import { pctColorClass } from "./ui";

type Filter = "all" | "productive" | "unproductive" | "missed";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "productive", label: "Productive" },
  { id: "unproductive", label: "Unproductive" },
  { id: "missed", label: "Missed" },
];

const PAGE_SIZE = 20;

export default function TradesTab({ trades }: { trades: Trade[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = trades.filter((t) => {
    if (filter === "all") return true;
    if (filter === "missed") return t.kind === "missed";
    return t.kind === "trade" && t.rating === filter;
  });
  const shown = filtered.slice(0, visible);

  const changeFilter = (f: Filter): void => {
    setFilter(f);
    setVisible(PAGE_SIZE);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => changeFilter(f.id)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              filter === f.id
                ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]"
                : "border-[#1c242d] text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#8b949e]">
          No trades here yet — log a day to start the tape.
        </p>
      ) : (
        <div>
          {shown.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-3 border-t border-[#1c242d] py-2.5 first:border-t-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#e6edf3]">{t.activity}</span>
                  {t.category && (
                    <span className="rounded border border-[#1c242d] px-1.5 py-0.5 text-[10px] text-[#8b949e]">
                      {t.category}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-[#8b949e]">
                  {fmtDateShort(t.date)}
                  {t.minutes > 0 ? ` · ${t.minutes} min` : ""} · {fmtPrice(t.priceBefore)} →{" "}
                  {fmtPrice(t.priceAfter)}
                </div>
              </div>
              <div className="shrink-0 text-right font-mono text-xs">
                {t.kind === "trade" ? (
                  <>
                    <div
                      className={
                        t.points > 0
                          ? "text-[#16c784]"
                          : t.points < 0
                            ? "text-[#ea3943]"
                            : "text-[#8b949e]"
                      }
                    >
                      {fmtSigned(t.points)} pts
                    </div>
                    <div className={pctColorClass(t.pct)}>{fmtPct(t.pct)}</div>
                  </>
                ) : (
                  <div className="text-[#f59e0b]">{fmtPct(t.pct)}</div>
                )}
              </div>
            </div>
          ))}
          {filtered.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="mt-3 w-full rounded-md border border-[#1c242d] py-2 text-xs text-[#8b949e] transition-colors hover:border-[#3b82f6] hover:text-[#3b82f6]"
            >
              Load more ({filtered.length - visible} left)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
