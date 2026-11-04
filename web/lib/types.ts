export type Category =
  | "Study"
  | "Work & Projects"
  | "Skills & Hobbies"
  | "Health & Fitness"
  | "Rest & Chores"
  | "Screens & Scrolling"
  | "Social & Leisure"
  | "Other";

export const CATEGORIES: readonly Category[] = [
  "Study",
  "Work & Projects",
  "Skills & Hobbies",
  "Health & Fitness",
  "Rest & Chores",
  "Screens & Scrolling",
  "Social & Leisure",
  "Other",
];

export type Rating = "productive" | "neutral" | "unproductive";

export const RATINGS: readonly Rating[] = ["productive", "neutral", "unproductive"];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

export function isRating(value: unknown): value is Rating {
  return typeof value === "string" && (RATINGS as readonly string[]).includes(value);
}

export interface Block {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  activity: string;
  category: Category;
  minutes: number;
  rating: Rating;
}

/** A block as returned by /api/parse, before it gets an id and a date. */
export type ParsedBlock = Omit<Block, "id" | "date">;

export interface DayResult {
  date: string;
  open: number;
  close: number;
  pct: number;
  netPoints: number;
  productive: number;
  unproductive: number;
  neutral: number;
  missed: boolean;
  blocks: number;
}

export interface Profile {
  name: string;
  ticker: string;
  goal: string;
  vice: string;
}

export interface TradeSummary {
  date: string;
  activity: string;
  category: Category;
  minutes: number;
  rating: Rating;
  points: number;
}

export interface Stats {
  currentPrice: number;
  todayPct: number;
  sinceIpoPct: number;
  bullRun: number;
  bestDay: DayResult | null;
  worstDay: DayResult | null;
  highestPrice: number;
  longestBullRun: number;
  mostProductiveDay: DayResult | null;
  biggestTrade: TradeSummary | null;
  focusToday: number;
  blocksToday: number;
}

export interface Trade {
  id: string;
  date: string;
  kind: "trade" | "missed";
  activity: string;
  category: Category | null;
  minutes: number;
  rating: Rating | null;
  points: number;
  priceBefore: number;
  priceAfter: number;
  pct: number;
}

export interface WeeklyStats {
  price: number;
  change7dPct: number;
  todayPct: number;
  streak: number;
  /** Top category by minutes over the last 7 days (string is kept so the analyst can name it). */
  topCategory: Category | null;
  topCategoryMinutes: number;
  productive7dMinutes: number;
  unproductive7dMinutes: number;
  missed14d: number;
}
