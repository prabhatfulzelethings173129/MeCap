"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";
import { sma } from "@/lib/engine";
import { fmtDateShort, fmtPct, fmtPrice } from "@/lib/format";
import { DayResult } from "@/lib/types";

type Range = "1W" | "1M" | "ALL";

const HEIGHT = 280;
const PAD = { top: 18, right: 64, bottom: 26, left: 14 };

function useContainerWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export default function PriceChart({ history, ipoPrice }: { history: DayResult[]; ipoPrice: number }) {
  const [range, setRange] = useState<Range>("ALL");
  const [smaOn, setSmaOn] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [wrapRef, width] = useContainerWidth();

  const sliced = useMemo(() => {
    if (range === "1W") return history.slice(-7);
    if (range === "1M") return history.slice(-30);
    return history;
  }, [history, range]);

  const closes = useMemo(() => sliced.map((d) => d.close), [sliced]);
  const smaValues = useMemo(() => (smaOn ? sma(closes, 5) : null), [closes, smaOn]);

  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const domain = useMemo(() => {
    let min = ipoPrice;
    let max = ipoPrice;
    for (const c of closes) {
      if (c < min) min = c;
      if (c > max) max = c;
    }
    if (smaValues) {
      for (const v of smaValues) {
        if (v === null) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    const pad = (max - min) * 0.12 || 1;
    return { min: min - pad, max: max + pad };
  }, [closes, smaValues, ipoPrice]);

  const n = sliced.length;
  const xAt = (i: number): number =>
    n <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW;
  const yAt = (v: number): number =>
    PAD.top + innerH - ((v - domain.min) / (domain.max - domain.min)) * innerH;

  const linePath = sliced
    .map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(d.close).toFixed(2)}`)
    .join(" ");
  const areaPath =
    n > 1
      ? `${linePath} L${xAt(n - 1).toFixed(2)},${(PAD.top + innerH).toFixed(2)} L${xAt(0).toFixed(
          2,
        )},${(PAD.top + innerH).toFixed(2)} Z`
      : "";
  const smaPath = smaValues
    ? smaValues
        .map((v, i) => (v === null ? null : `${i === 0 || smaValues[i - 1] === null ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`))
        .filter((s): s is string => s !== null)
        .join(" ")
    : "";

  const up = n > 0 && closes[n - 1] >= closes[0];
  const lineColor = up ? "#16c784" : "#ea3943";

  const gridLevels: { v: number; y: number }[] = [];
  for (let k = 0; k <= 4; k++) {
    const v = domain.min + ((domain.max - domain.min) * k) / 4;
    gridLevels.push({ v, y: yAt(v) });
  }

  const xTicks = useMemo(() => {
    if (n === 0) return [] as { i: number; label: string }[];
    const idxs = new Set<number>();
    for (let k = 0; k <= 4; k++) idxs.add(Math.round((k * (n - 1)) / 4));
    return [...idxs].map((i) => ({ i, label: fmtDateShort(sliced[i].date) }));
  }, [sliced, n]);

  const onMove = (e: MouseEvent<SVGSVGElement>): void => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const step = n > 1 ? innerW / (n - 1) : 0;
    const idx = step === 0 ? 0 : Math.round(px / step);
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
  };

  const hoverDay = hoverIdx !== null && hoverIdx < n ? sliced[hoverIdx] : null;

  const rangeButtons: Range[] = ["1W", "1M", "ALL"];

  return (
    <div className="rounded-lg border border-[#1c242d] bg-[#0f141a] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">Price</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSmaOn((s) => !s)}
            aria-pressed={smaOn}
            className={`rounded px-2 py-1 font-mono text-[11px] transition-colors ${
              smaOn
                ? "bg-[#3b82f6]/15 text-[#3b82f6]"
                : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            SMA(5)
          </button>
          <div className="flex overflow-hidden rounded-md border border-[#1c242d]">
            {rangeButtons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  range === r ? "bg-[#1c242d] text-[#e6edf3]" : "text-[#8b949e] hover:text-[#e6edf3]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={wrapRef} className="relative">
        {n === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-[#8b949e]">
            No price history yet.
          </div>
        ) : (
          width > 0 && (
            <>
              <svg
                width={width}
                height={HEIGHT}
                role="img"
                aria-label="Share price chart"
                onMouseMove={onMove}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <defs>
                  <linearGradient id="mecapFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {gridLevels.map((g, k) => (
                  <g key={k}>
                    <line
                      x1={PAD.left}
                      x2={PAD.left + innerW}
                      y1={g.y}
                      y2={g.y}
                      stroke="#1c242d"
                      strokeWidth="1"
                    />
                    <text
                      x={width - PAD.right + 8}
                      y={g.y + 3}
                      fill="#8b949e"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {g.v.toFixed(2)}
                    </text>
                  </g>
                ))}

                <line
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={yAt(ipoPrice)}
                  y2={yAt(ipoPrice)}
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <text
                  x={PAD.left + 4}
                  y={yAt(ipoPrice) - 5}
                  fill="#f59e0b"
                  fontSize="10"
                  fontFamily="monospace"
                  opacity="0.9"
                >
                  IPO {fmtPrice(ipoPrice)}
                </text>

                {n > 1 && <path d={areaPath} fill="url(#mecapFill)" stroke="none" />}
                {n > 1 && <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" />}
                {smaPath !== "" && (
                  <path d={smaPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.9" />
                )}

                <circle
                  cx={xAt(n - 1)}
                  cy={yAt(closes[n - 1])}
                  r="3.5"
                  fill={lineColor}
                  stroke="#0a0e12"
                  strokeWidth="1.5"
                />

                {xTicks.map((t) => (
                  <text
                    key={t.i}
                    x={Math.min(Math.max(xAt(t.i), 18), width - PAD.right - 10)}
                    y={HEIGHT - 8}
                    fill="#8b949e"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {t.label}
                  </text>
                ))}

                {hoverDay && hoverIdx !== null && (
                  <g>
                    <line
                      x1={xAt(hoverIdx)}
                      x2={xAt(hoverIdx)}
                      y1={PAD.top}
                      y2={PAD.top + innerH}
                      stroke="#3b82f6"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                    <circle
                      cx={xAt(hoverIdx)}
                      cy={yAt(hoverDay.close)}
                      r="4"
                      fill="#0a0e12"
                      stroke={lineColor}
                      strokeWidth="2"
                    />
                  </g>
                )}

                <rect
                  x={PAD.left}
                  y={PAD.top}
                  width={innerW}
                  height={innerH}
                  fill="transparent"
                />
              </svg>

              {hoverDay && hoverIdx !== null && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-[#1c242d] bg-[#0a0e12] px-2.5 py-1.5 text-center"
                  style={{
                    left: Math.min(Math.max(xAt(hoverIdx), 70), width - 70),
                    top: Math.max(yAt(hoverDay.close) - 10, 44),
                  }}
                >
                  <div className="font-mono text-[11px] text-[#8b949e]">{hoverDay.date}</div>
                  <div className="font-mono text-xs font-semibold text-[#e6edf3]">
                    {fmtPrice(hoverDay.close)}{" "}
                    <span className={hoverDay.pct >= 0 ? "text-[#16c784]" : "text-[#ea3943]"}>
                      {fmtPct(hoverDay.pct)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
