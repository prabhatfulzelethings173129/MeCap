import { DEFAULT_RATINGS } from "./engine";
import { Block, isCategory, isRating, Profile } from "./types";

export const STORAGE_KEY = "mecap:v1";

export interface StoredData {
  profile: Profile;
  blocks: Block[];
  startDate: string;
  isSample: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function parseBlocks(v: unknown): Block[] {
  if (!Array.isArray(v)) return [];
  const out: Block[] = [];
  for (const raw of v) {
    if (!isRecord(raw)) continue;
    const date = str(raw.date, "");
    const activity = str(raw.activity, "").trim();
    const minutes =
      typeof raw.minutes === "number" && Number.isFinite(raw.minutes) ? Math.round(raw.minutes) : NaN;
    if (!DATE_RE.test(date) || activity === "" || !Number.isFinite(minutes)) continue;
    const category = isCategory(raw.category) ? raw.category : "Other";
    const rating = isRating(raw.rating) ? raw.rating : DEFAULT_RATINGS[category];
    out.push({
      id: str(raw.id, `b-${out.length}-${date}`),
      date,
      activity,
      category,
      minutes: Math.min(1440, Math.max(0, minutes)),
      rating,
    });
  }
  return out;
}

function parseStored(v: unknown): StoredData | null {
  if (!isRecord(v) || !isRecord(v.profile)) return null;
  const p = v.profile;
  const blocks = parseBlocks(v.blocks);
  const ticker = str(p.ticker, "YOU").toUpperCase().slice(0, 6);
  const profile: Profile = {
    name: str(p.name, "You"),
    ticker: ticker === "" ? "YOU" : ticker,
    goal: str(p.goal, ""),
    vice: str(p.vice, ""),
  };
  let startDate = str(v.startDate, "");
  if (!DATE_RE.test(startDate)) {
    startDate = "";
    for (const b of blocks) {
      if (startDate === "" || b.date < startDate) startDate = b.date;
    }
  }
  return { profile, blocks, startDate, isSample: v.isSample === true };
}

export function load(): StoredData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseStored(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function save(data: StoredData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be blocked or full; the app keeps working in memory.
  }
}

export function clear(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
