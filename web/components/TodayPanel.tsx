"use client";

import { useState } from "react";
import { CATEGORIES, Category, ParsedBlock, Rating } from "@/lib/types";
import { ratingBarColor, ratingColorClass } from "./ui";

export interface SectorBar {
  category: Category;
  minutes: number;
  rating: Rating;
}

interface TodayPanelProps {
  today: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onParsedBlocks: (blocks: ParsedBlock[], date: string) => void;
  onManualBlock: (block: { activity: string; category: Category; minutes: number }, date: string) => void;
  sectors: SectorBar[];
}

interface ApiPayload {
  blocks?: unknown;
  error?: unknown;
  model?: unknown;
}

function coerceParsed(list: unknown[]): ParsedBlock[] {
  const out: ParsedBlock[] = [];
  for (const raw of list) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const activity = typeof rec.activity === "string" ? rec.activity.trim().slice(0, 80) : "";
    if (activity === "") continue;
    const category: Category = CATEGORIES.includes(rec.category as Category)
      ? (rec.category as Category)
      : "Other";
    const minutesRaw = Number(rec.minutes);
    const minutes = Number.isFinite(minutesRaw)
      ? Math.round(Math.min(720, Math.max(5, minutesRaw)))
      : 30;
    const rating: Rating =
      rec.rating === "productive" || rec.rating === "neutral" || rec.rating === "unproductive"
        ? rec.rating
        : category === "Screens & Scrolling" || category === "Social & Leisure"
          ? "unproductive"
          : category === "Study" ||
              category === "Work & Projects" ||
              category === "Skills & Hobbies" ||
              category === "Health & Fitness"
            ? "productive"
            : "neutral";
    out.push({ activity, category, minutes, rating });
  }
  return out;
}

export default function TodayPanel({
  today,
  selectedDate,
  onDateChange,
  onParsedBlocks,
  onManualBlock,
  sectors,
}: TodayPanelProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [manualActivity, setManualActivity] = useState("");
  const [manualCategory, setManualCategory] = useState<Category>("Study");
  const [manualMinutes, setManualMinutes] = useState("30");
  const [manualError, setManualError] = useState<string | null>(null);

  async function logDay(): Promise<void> {
    const trimmed = text.trim();
    if (trimmed === "") {
      setError("Write a line or two about what you did.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      let data: ApiPayload | null = null;
      try {
        data = (await res.json()) as ApiPayload;
      } catch {
        data = null;
      }
      const rec = data as Record<string, unknown> | null;
      if (!res.ok || !rec || !Array.isArray(rec.blocks)) {
        const msg =
          rec && typeof rec.error === "string"
            ? rec.error
            : `Parsing failed (HTTP ${res.status}).`;
        setError(msg);
        return;
      }
      const parsed = coerceParsed(rec.blocks);
      if (parsed.length === 0) {
        setError("The model found nothing to log for that. Add blocks manually below.");
        return;
      }
      onParsedBlocks(parsed, selectedDate);
      setSuccess(`Logged ${parsed.length} block${parsed.length === 1 ? "" : "s"} for ${selectedDate}.`);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error ? `Could not reach the server: ${err.message}` : "Could not reach the server.",
      );
    } finally {
      setLoading(false);
    }
  }

  function addManual(): void {
    const activity = manualActivity.trim();
    const minutes = Number(manualMinutes);
    if (activity === "") {
      setManualError("Give the activity a name.");
      return;
    }
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 720) {
      setManualError("Minutes must be between 5 and 720.");
      return;
    }
    onManualBlock({ activity, category: manualCategory, minutes: Math.round(minutes) }, selectedDate);
    setManualError(null);
    setManualActivity("");
    setManualMinutes("30");
    setSuccess(null);
  }

  const maxSector = Math.max(1, ...sectors.map((s) => s.minutes));

  return (
    <div className="rounded-lg border border-[#1c242d] bg-[#0f141a] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">Today</span>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => {
            if (e.target.value) onDateChange(e.target.value);
          }}
          className="rounded-md border border-[#1c242d] bg-[#0a0e12] px-2 py-1 font-mono text-xs text-[#e6edf3] outline-none focus:border-[#3b82f6]"
          aria-label="Log date"
        />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="studied DSA 2 hrs, gym 1 hr, 90 min reels"
        className="w-full resize-y rounded-md border border-[#1c242d] bg-[#0a0e12] px-3 py-2 text-sm text-[#e6edf3] placeholder:text-[#4d5866] outline-none focus:border-[#3b82f6]"
      />
      <button
        type="button"
        onClick={() => void logDay()}
        disabled={loading}
        className="mt-2 w-full rounded-md bg-[#16c784] py-2 text-sm font-semibold text-[#04120c] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <span className="animate-pulse">Llama is thinking, this can take up to a minute on this laptop</span>
        ) : (
          "Log my day"
        )}
      </button>

      {error && (
        <p className="mt-2 rounded-md border border-[#ea3943]/40 bg-[#ea3943]/10 px-3 py-2 text-xs leading-relaxed text-[#ea3943]">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 rounded-md border border-[#16c784]/40 bg-[#16c784]/10 px-3 py-2 text-xs text-[#16c784]">
          {success}
        </p>
      )}

      <div className="mt-4 border-t border-[#1c242d] pt-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">
          Manual entry
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={manualActivity}
            onChange={(e) => setManualActivity(e.target.value)}
            placeholder="Activity"
            className="w-full rounded-md border border-[#1c242d] bg-[#0a0e12] px-2.5 py-1.5 text-sm text-[#e6edf3] placeholder:text-[#4d5866] outline-none focus:border-[#3b82f6]"
          />
          <div className="flex gap-2">
            <select
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value as Category)}
              className="min-w-0 flex-1 rounded-md border border-[#1c242d] bg-[#0a0e12] px-2 py-1.5 text-xs text-[#e6edf3] outline-none focus:border-[#3b82f6]"
              aria-label="Category"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={5}
              max={720}
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              className="w-20 rounded-md border border-[#1c242d] bg-[#0a0e12] px-2 py-1.5 font-mono text-xs text-[#e6edf3] outline-none focus:border-[#3b82f6]"
              aria-label="Minutes"
            />
          </div>
          {manualError && <p className="text-xs text-[#ea3943]">{manualError}</p>}
          <button
            type="button"
            onClick={addManual}
            className="w-full rounded-md border border-[#1c242d] py-1.5 text-xs font-medium text-[#e6edf3] transition-colors hover:border-[#16c784] hover:text-[#16c784]"
          >
            Add block
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-[#1c242d] pt-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">
          {selectedDate === today ? "Today" : selectedDate} by sector
        </div>
        {sectors.length === 0 ? (
          <p className="text-xs text-[#8b949e]">No blocks logged for this date yet.</p>
        ) : (
          <div className="space-y-1.5">
            {sectors.map((s) => (
              <div key={s.category} className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-[11px] text-[#8b949e]" title={s.category}>
                  {s.category}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#161c23]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (s.minutes / maxSector) * 100)}%`,
                      backgroundColor: ratingBarColor(s.rating),
                    }}
                  />
                </div>
                <span className={`w-12 shrink-0 text-right font-mono text-[11px] ${ratingColorClass(s.rating)}`}>
                  {s.minutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
