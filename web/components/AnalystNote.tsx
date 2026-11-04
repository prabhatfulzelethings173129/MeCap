"use client";

import { useState } from "react";
import { Profile, Stats, WeeklyStats } from "@/lib/types";

interface AnalystNoteProps {
  stats: Stats;
  profile: Profile;
  weekly: WeeklyStats | null;
}

interface AnalystPayload {
  note?: unknown;
  source?: unknown;
  model?: unknown;
  error?: unknown;
}

export default function AnalystNote({ stats, profile, weekly }: AnalystNoteProps) {
  const [note, setNote] = useState<string | null>(null);
  const [source, setSource] = useState<"llama" | "fallback" | null>(null);
  const [model, setModel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, profile, weekly }),
      });
      let data: AnalystPayload | null = null;
      try {
        data = (await res.json()) as AnalystPayload;
      } catch {
        data = null;
      }
      const rec = data as Record<string, unknown> | null;
      if (!rec || typeof rec.note !== "string" || rec.note.trim() === "") {
        const msg = rec && typeof rec.error === "string" ? rec.error : `Analyst failed (HTTP ${res.status}).`;
        setError(msg);
        return;
      }
      setNote(rec.note.trim());
      setSource(rec.source === "fallback" ? "fallback" : "llama");
      setModel(typeof rec.model === "string" ? rec.model : "");
    } catch (err) {
      setError(err instanceof Error ? `Could not reach the server: ${err.message}` : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-[#1c242d] bg-[#0f141a] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">
          Analyst note
        </span>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="rounded-md border border-[#1c242d] px-2.5 py-1 text-[11px] font-medium text-[#e6edf3] transition-colors hover:border-[#3b82f6] hover:text-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Writing…" : "Generate analyst note"}
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-[#ea3943]/40 bg-[#ea3943]/10 px-3 py-2 text-xs text-[#ea3943]">
          {error}
        </p>
      )}

      {note ? (
        <div>
          <p className="text-sm leading-relaxed text-[#c9d1d9]">{note}</p>
          <p className="mt-2 font-mono text-[10px] text-[#8b949e]">
            {source === "fallback"
              ? "fallback — model unavailable, built from the numbers"
              : `Written by ${model || "local model"} (local)`}
          </p>
        </div>
      ) : (
        !error && (
          <p className="text-xs leading-relaxed text-[#8b949e]">
            A witty local analyst reads your tape: one risk, one next step, zero advice.
          </p>
        )
      )}
    </div>
  );
}
