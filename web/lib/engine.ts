import {
  Block,
  Category,
  DayResult,
  Profile,
  Rating,
  Stats,
  Trade,
  TradeSummary,
  WeeklyStats,
} from "./types";

// ---- Market constants --------------------------------------------------

export const IPO_PRICE = 10;
export const FLOOR = 1;
export const MISSED_DAY_MULT = 0.9;
export const MAX_MINUTES_PER_DAY = 1440;
export const PCT_PER_POINT = 0.054;
export const MAX_DAY_PCT = 3;

export const DEFAULT_RATINGS: Record<Category, Rating> = {
  Study: "productive",
  "Work & Projects": "productive",
  "Skills & Hobbies": "productive",
  "Health & Fitness": "productive",
  "Rest & Chores": "neutral",
  Other: "neutral",
  "Screens & Scrolling": "unproductive",
  "Social & Leisure": "unproductive",
};

export const DEFAULT_PROFILE: Profile = {
  name: "You",
  ticker: "YOU",
  goal: "Set a goal",
  vice: "None yet",
};

// ---- Small helpers ------------------------------------------------------

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Local-calendar date helpers working on YYYY-MM-DD strings. */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  base.setDate(base.getDate() + delta);
  return formatDate(base);
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00`).getTime());
}

// ---- Points ---------------------------------------------------------------

export function points(block: Pick<Block, "minutes" | "rating">): number {
  const m = Math.max(0, block.minutes);
  if (block.rating === "productive") return m / 10;
  if (block.rating === "unproductive") return -m / 10;
  return 0;
}

/** Scales a day's blocks so no more than MAX_MINUTES_PER_DAY minutes ever count. */
function dayScale(totalMinutes: number): number {
  const total = Math.max(0, totalMinutes);
  return total > MAX_MINUTES_PER_DAY ? MAX_MINUTES_PER_DAY / total : 1;
}

// ---- History ----------------------------------------------------------------

export function buildHistory(blocks: Block[], startDate: string, today: string): DayResult[] {
  if (!isValidDateStr(startDate) || !isValidDateStr(today)) return [];
  const start = startDate <= today ? startDate : today;

  const byDate = new Map<string, Block[]>();
  for (const b of blocks) {
    if (!isValidDateStr(b.date) || b.date < start || b.date > today) continue;
    const list = byDate.get(b.date);
    if (list) list.push(b);
    else byDate.set(b.date, [b]);
  }

  const out: DayResult[] = [];
  let prevClose = IPO_PRICE;
  for (let date = start; date <= today; date = addDays(date, 1)) {
    const open = prevClose;
    const dayBlocks = byDate.get(date) ?? [];

    if (dayBlocks.length === 0) {
      const isToday = date === today;
      const close = isToday ? open : Math.max(FLOOR, round2(open * MISSED_DAY_MULT));
      const pct = isToday ? 0 : round2(((close - open) / open) * 100);
      out.push({
        date, open, close, pct,
        netPoints: 0, productive: 0, unproductive: 0, neutral: 0,
        missed: !isToday, blocks: 0,
      });
      prevClose = close;
      continue;
    }

    const rawTotal = dayBlocks.reduce((sum, b) => sum + Math.max(0, b.minutes), 0);
    const scale = dayScale(rawTotal);
    let productive = 0;
    let unproductive = 0;
    let neutral = 0;
    let net = 0;
    for (const b of dayBlocks) {
      const m = Math.max(0, b.minutes) * scale;
      if (b.rating === "productive") {
        productive += m;
        net += m / 10;
      } else if (b.rating === "unproductive") {
        unproductive += m;
        net -= m / 10;
      } else {
        neutral += m;
      }
    }
    const pct = clamp(net * PCT_PER_POINT, -MAX_DAY_PCT, MAX_DAY_PCT);
    const close = Math.max(FLOOR, round2(open * (1 + pct / 100)));
    out.push({
      date, open, close,
      pct: round2(pct),
      netPoints: round2(net),
      productive: Math.round(productive),
      unproductive: Math.round(unproductive),
      neutral: Math.round(neutral),
      missed: false,
      blocks: dayBlocks.length,
    });
    prevClose = close;
  }
  return out;
}

// ---- Stats ----------------------------------------------------------------

/** Consecutive up days counting back from the latest CLOSED day (today only counts once it has blocks). */
function bullRunFrom(history: DayResult[]): number {
  if (history.length === 0) return 0;
  let startIdx = history.length - 1;
  const last = history[history.length - 1];
  if (last && last.blocks === 0 && !last.missed) startIdx -= 1; // today is still open
  let run = 0;
  for (let i = startIdx; i >= 0; i--) {
    if (history[i].pct > 0) run += 1;
    else break;
  }
  return run;
}

export function stats(history: DayResult[], blocks: Block[] = []): Stats {
  const last = history.length > 0 ? history[history.length - 1] : null;
  const currentPrice = last ? last.close : IPO_PRICE;
  const todayPct = last ? last.pct : 0;
  const sinceIpoPct = round2(((currentPrice - IPO_PRICE) / IPO_PRICE) * 100);

  let bestDay: DayResult | null = null;
  let worstDay: DayResult | null = null;
  let mostProductiveDay: DayResult | null = null;
  let highestPrice = IPO_PRICE;
  let longestBullRun = 0;
  let run = 0;
  for (const d of history) {
    if (d.blocks > 0) {
      if (!bestDay || d.pct > bestDay.pct) bestDay = d;
      if (!worstDay || d.pct < worstDay.pct) worstDay = d;
      if (!mostProductiveDay || d.productive > mostProductiveDay.productive) mostProductiveDay = d;
    }
    if (d.close > highestPrice) highestPrice = d.close;
    if (d.pct > 0) {
      run += 1;
      if (run > longestBullRun) longestBullRun = run;
    } else {
      run = 0;
    }
  }

  // Biggest single trade, using the same per-day minute cap as the engine.
  const totals = new Map<string, number>();
  for (const b of blocks) totals.set(b.date, (totals.get(b.date) ?? 0) + Math.max(0, b.minutes));
  let biggestTrade: TradeSummary | null = null;
  for (const b of blocks) {
    const scale = dayScale(totals.get(b.date) ?? 0);
    const p = points({ minutes: Math.max(0, b.minutes) * scale, rating: b.rating });
    if (!biggestTrade || Math.abs(p) > Math.abs(biggestTrade.points)) {
      biggestTrade = {
        date: b.date,
        activity: b.activity,
        category: b.category,
        minutes: Math.round(Math.max(0, b.minutes) * scale),
        rating: b.rating,
        points: round2(p),
      };
    }
  }

  const focusToday =
    last && last.blocks > 0 && last.productive + last.unproductive + last.neutral > 0
      ? round2((last.productive / (last.productive + last.unproductive + last.neutral)) * 100)
      : 0;

  return {
    currentPrice,
    todayPct,
    sinceIpoPct,
    bullRun: bullRunFrom(history),
    bestDay,
    worstDay,
    highestPrice: round2(highestPrice),
    longestBullRun,
    mostProductiveDay,
    biggestTrade,
    focusToday,
    blocksToday: last ? last.blocks : 0,
  };
}

// ---- SMA -------------------------------------------------------------------

export function sma(values: number[], n: number): (number | null)[] {
  if (n <= 0) return values.map(() => null);
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    out.push(i >= n - 1 ? round2(sum / n) : null);
  }
  return out;
}

// ---- Trade log ----------------------------------------------------------------

export function tradeLog(blocks: Block[], history: DayResult[]): Trade[] {
  const dayByDate = new Map(history.map((d) => [d.date, d]));
  const totals = new Map<string, number>();
  for (const b of blocks) totals.set(b.date, (totals.get(b.date) ?? 0) + Math.max(0, b.minutes));

  const trades: Trade[] = [];
  const withIndex = blocks.map((b, i) => ({ b, i }));
  withIndex.sort((a, z) => {
    if (a.b.date !== z.b.date) return a.b.date < z.b.date ? 1 : -1; // newest day first
    return z.i - a.i; // latest logged first within a day
  });
  for (const { b } of withIndex) {
    const day = dayByDate.get(b.date);
    const scale = dayScale(totals.get(b.date) ?? 0);
    const minutes = Math.max(0, b.minutes) * scale;
    trades.push({
      id: `t-${b.id}`,
      date: b.date,
      kind: "trade",
      activity: b.activity,
      category: b.category,
      minutes: Math.round(minutes),
      rating: b.rating,
      points: round2(points({ minutes, rating: b.rating })),
      priceBefore: day ? day.open : IPO_PRICE,
      priceAfter: day ? day.close : IPO_PRICE,
      pct: day ? day.pct : 0,
    });
  }

  // Consecutive missed days collapse into ONE event, newest first.
  const missedTrades: Trade[] = [];
  let i = history.length - 1;
  while (i >= 0) {
    if (!history[i].missed) {
      i -= 1;
      continue;
    }
    let j = i;
    while (j - 1 >= 0 && history[j - 1].missed && history[j - 1].date === addDays(history[j].date, -1)) {
      j -= 1;
    }
    const first = history[j];
    const last = history[i];
    const n = i - j + 1;
    missedTrades.push({
      id: `missed-${last.date}`,
      date: last.date,
      kind: "missed",
      activity: `${n} missed day${n === 1 ? "" : "s"}, x0.90 each`,
      category: null,
      minutes: 0,
      rating: null,
      points: 0,
      priceBefore: first.open,
      priceAfter: last.close,
      pct: first.open > 0 ? round2(((last.close - first.open) / first.open) * 100) : 0,
    });
    i = j - 1;
  }

  return [...trades, ...missedTrades].sort((a, z) =>
    a.date < z.date ? 1 : a.date > z.date ? -1 : 0,
  );
}

// ---- Weekly summary ---------------------------------------------------------------

export function weeklyStats(history: DayResult[], blocks: Block[] = []): WeeklyStats {
  const last = history.length > 0 ? history[history.length - 1] : null;
  const price = last ? last.close : IPO_PRICE;
  const refClose =
    history.length > 7
      ? history[history.length - 8].close
      : history.length > 0
        ? history[0].open
        : IPO_PRICE;
  const change7dPct = refClose > 0 ? round2(((price - refClose) / refClose) * 100) : 0;

  const last7 = history.slice(-7);
  const productive7dMinutes = last7.reduce((s, d) => s + d.productive, 0);
  const unproductive7dMinutes = last7.reduce((s, d) => s + d.unproductive, 0);
  const missed14d = history.slice(-14).filter((d) => d.missed).length;

  const dates7 = new Set(last7.map((d) => d.date));
  const perCategory = new Map<Category, number>();
  for (const b of blocks) {
    if (!dates7.has(b.date)) continue;
    perCategory.set(b.category, (perCategory.get(b.category) ?? 0) + Math.max(0, b.minutes));
  }
  let topCategory: Category | null = null;
  let topCategoryMinutes = 0;
  for (const [category, minutes] of perCategory) {
    if (minutes > topCategoryMinutes) {
      topCategory = category;
      topCategoryMinutes = minutes;
    }
  }

  return {
    price,
    change7dPct,
    todayPct: last ? last.pct : 0,
    streak: bullRunFrom(history),
    topCategory,
    topCategoryMinutes,
    productive7dMinutes,
    unproductive7dMinutes,
    missed14d,
  };
}
