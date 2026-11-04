"use client";

import { IPO_PRICE } from "@/lib/engine";
import { fmtPct, fmtPrice } from "@/lib/format";

interface HeaderProps {
  name: string;
  ticker: string;
  currentPrice: number;
  todayPct: number;
  isSample: boolean;
}

export default function Header({ name, ticker, currentPrice, todayPct, isSample }: HeaderProps) {
  const up = todayPct > 0;
  const down = todayPct < 0;
  const color = up ? "text-[#16c784]" : down ? "text-[#ea3943]" : "text-[#e6edf3]";
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-[#e6edf3]">{name}</h1>
          <span className="font-mono text-xs text-[#8b949e]">{ticker} LTD</span>
          {isSample && (
            <span className="rounded border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f59e0b]">
              Sample data
            </span>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className={`font-mono text-4xl font-bold ${color}`}>{fmtPrice(currentPrice)}</span>
          <span className={`font-mono text-sm ${color}`}>
            {up ? "▲" : down ? "▼" : "•"} {fmtPct(todayPct)}
          </span>
        </div>
      </div>
      <div className="text-right font-mono text-sm text-[#8b949e]">IPO {fmtPrice(IPO_PRICE)}</div>
    </div>
  );
}
