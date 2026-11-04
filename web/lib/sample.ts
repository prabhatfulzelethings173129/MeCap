import { addDays, DEFAULT_RATINGS } from "./engine";
import { Block, Category, Profile } from "./types";

/** Deterministic PRNG (mulberry32) so the same seed always yields the same story. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ACTIVITIES: Record<Category, readonly string[]> = {
  Study: ["DSA practice", "OS lecture notes", "LeetCode grind", "DBMS revision"],
  "Work & Projects": ["MeCap build session", "Resume revamp", "Internship applications", "Club project meeting"],
  "Skills & Hobbies": ["Guitar practice", "Spanish flashcards", "Sketching", "Typing drills"],
  "Health & Fitness": ["Gym - push day", "Morning run", "Yoga session", "Football with the crew"],
  "Rest & Chores": ["Laundry & room cleanup", "Cooking lunch", "Nap", "Grocery run"],
  "Screens & Scrolling": ["Instagram Reels", "YouTube Shorts", "Twitter doomscroll", "Random wiki rabbit hole"],
  "Social & Leisure": ["Movie night", "Gaming session", "Hangout at the cafe", "Long call with a friend"],
  Other: ["Commute", "Random errand", "Waiting around"],
};

const SAMPLE_PROFILE: Profile = {
  name: "Aarav",
  ticker: "AARA",
  goal: "Get a software internship",
  vice: "Instagram Reels",
};

const DAYS = 45;
/** Day indexes (0 = oldest) with no blocks at all -> missed days. Never today. */
const MISSED_AT = new Set([15, 31]);

export interface SampleData {
  profile: Profile;
  blocks: Block[];
  startDate: string;
}

type DayKind = "grind" | "mixed" | "scroll" | "light";

export function generateSample(today: string): SampleData {
  const rand = mulberry32(1337);
  const start = addDays(today, -(DAYS - 1));
  const blocks: Block[] = [];

  const pick = (arr: readonly string[]): string => arr[Math.floor(rand() * arr.length) % arr.length];
  const minutes = (lo: number, hi: number): number =>
    Math.max(5, Math.round((lo + rand() * (hi - lo)) / 5) * 5);
  const add = (day: number, slot: number, category: Category, mins: number): void => {
    blocks.push({
      id: `s${day}-${slot}`,
      date: addDays(start, day),
      activity: pick(ACTIVITIES[category]),
      category,
      minutes: mins,
      rating: DEFAULT_RATINGS[category],
    });
  };

  for (let i = 0; i < DAYS; i++) {
    if (MISSED_AT.has(i)) continue; // skipped entirely -> missed day
    const isToday = i === DAYS - 1;
    let kind: DayKind;
    if (isToday) {
      kind = "grind"; // today closes green
    } else {
      const r = rand();
      kind = r < 0.62 ? "grind" : r < 0.85 ? "mixed" : r < 0.94 ? "scroll" : "light";
    }

    if (kind === "grind") {
      add(i, 0, "Study", minutes(110, 170));
      add(i, 1, "Work & Projects", minutes(100, 160));
      add(i, 2, "Health & Fitness", minutes(45, 75));
      if (rand() < 0.4) add(i, 3, "Skills & Hobbies", minutes(30, 60));
      if (rand() < 0.35) add(i, 4, "Rest & Chores", minutes(15, 35));
    } else if (kind === "mixed") {
      add(i, 0, "Study", minutes(60, 120));
      add(i, 1, "Work & Projects", minutes(60, 120));
      add(i, 2, "Screens & Scrolling", minutes(45, 90));
      if (rand() < 0.4) add(i, 3, "Rest & Chores", minutes(15, 30));
    } else if (kind === "scroll") {
      add(i, 0, "Study", minutes(45, 90));
      add(i, 1, "Screens & Scrolling", minutes(120, 210));
      if (rand() < 0.5) add(i, 2, "Social & Leisure", minutes(30, 60));
    } else {
      add(i, 0, "Skills & Hobbies", minutes(60, 100));
      add(i, 1, "Health & Fitness", minutes(30, 60));
      add(i, 2, "Rest & Chores", minutes(20, 40));
    }
  }

  return { profile: SAMPLE_PROFILE, blocks, startDate: start };
}
