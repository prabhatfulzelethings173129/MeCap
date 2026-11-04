import { askLLM } from "@/lib/llm";
import { WeeklyStats } from "@/lib/types";

const MAX_TOKENS = 220;

const SYSTEM_PROMPT = `You are a witty but accurate equity analyst. You cover exactly one listed company: the user's own life.
Write a plain-text market note of 80 to 110 words.
Hard rules:
- Use ONLY the numbers provided below. Never invent or transform numbers you were not given.
- Mention exactly one risk and one concrete next step.
- No markdown (no asterisks, hashes, bullets), no emojis, no headings, no sign-off.
- This is a simulation. Do not give investment advice and do not mention real stocks or real companies.
Tone: dry, sharp, a little playful — like a good sell-side note.`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function optNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function optStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

interface DayPick {
  pct: number;
  date: string;
}

function extractDay(v: unknown): DayPick | null {
  if (!isRecord(v)) return null;
  const pct = optNum(v.pct);
  const date = optStr(v.date);
  return pct !== null && date !== null ? { pct, date } : null;
}

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

function buildFallback(input: {
  ticker: string;
  price: number;
  todayPct: number;
  sinceIpoPct: number;
  blocksToday: number;
  focusToday: number;
  bullRun: number;
  longestBullRun: number;
  worst: DayPick | null;
  goal: string;
  vice: string;
}): string {
  const parts: string[] = [];
  const dir = input.todayPct > 0.005 ? "up" : input.todayPct < -0.005 ? "down" : "flat";
  parts.push(
    `${input.ticker} closed at ₹${input.price.toFixed(2)}, ${dir} ${Math.abs(input.todayPct).toFixed(2)}% on the session and ${signed(input.sinceIpoPct)}% since IPO.`,
  );
  parts.push(
    `Today's tape shows ${input.blocksToday} logged block${input.blocksToday === 1 ? "" : "s"} with ${input.focusToday.toFixed(0)}% focus.`,
  );
  if (input.bullRun > 0) {
    parts.push(`The stock is riding a ${input.bullRun}-day bull run; the all-time record stands at ${input.longestBullRun}.`);
  } else {
    parts.push(`No active bull run right now; the all-time record stands at ${input.longestBullRun} day${input.longestBullRun === 1 ? "" : "s"}.`);
  }
  if (input.worst) {
    parts.push(`Risk: that ${signed(input.worst.pct)}% session on ${input.worst.date} is a reminder that bad days compound too.`);
  } else {
    parts.push(`Risk: the tape is still thin, and thin tape cuts both ways.`);
  }
  if (input.focusToday < 60) {
    parts.push(`Next step: lift focus above 60% tomorrow before touching ${input.vice || "the feed"}.`);
  } else if (input.goal) {
    parts.push(`Next step: keep shipping toward "${input.goal}".`);
  } else {
    parts.push(`Next step: log tomorrow before noon.`);
  }
  parts.push(`Simulated market, not advice.`);
  return parts.join(" ");
}

function sanitizeNote(note: string): string {
  return note
    .replace(/[*#`_]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  if (!isRecord(body) || !isRecord(body.stats) || !isRecord(body.profile)) {
    return Response.json({ error: 'Expected JSON like {"stats": {...}, "profile": {...}}.' }, { status: 400 });
  }

  const rawStats = body.stats;
  const rawProfile = body.profile;
  const name = optStr(rawProfile.name) ?? "You";
  const ticker = (optStr(rawProfile.ticker) ?? "YOU").toUpperCase().slice(0, 6);
  const goal = optStr(rawProfile.goal) ?? "";
  const vice = optStr(rawProfile.vice) ?? "";

  const price = num(rawStats.currentPrice, 10);
  const todayPct = num(rawStats.todayPct, 0);
  const sinceIpoPct = num(rawStats.sinceIpoPct, 0);
  const bullRun = num(rawStats.bullRun, 0);
  const longestBullRun = num(rawStats.longestBullRun, 0);
  const focusToday = num(rawStats.focusToday, 0);
  const blocksToday = num(rawStats.blocksToday, 0);
  const highestPrice = num(rawStats.highestPrice, price);
  const best = extractDay(rawStats.bestDay);
  const worst = extractDay(rawStats.worstDay);
  const mostProductive = isRecord(rawStats.mostProductiveDay)
    ? { minutes: num(rawStats.mostProductiveDay.productive, 0), date: optStr(rawStats.mostProductiveDay.date) ?? "n/a" }
    : null;
  const biggest = isRecord(rawStats.biggestTrade)
    ? {
        activity: optStr(rawStats.biggestTrade.activity) ?? "n/a",
        points: num(rawStats.biggestTrade.points, 0),
        date: optStr(rawStats.biggestTrade.date) ?? "n/a",
      }
    : null;

  let weeklyLines = "";
  if (isRecord(body.weekly)) {
    const w = body.weekly as WeeklyStats & Record<string, unknown>;
    const top = optStr(w.topCategory);
    weeklyLines = `\nWeekly context: 7-day change ${signed(num(w.change7dPct, 0))}%, productive ${num(
      w.productive7dMinutes,
      0,
    )} min vs unproductive ${num(w.unproductive7dMinutes, 0)} min over 7 days, top sector ${
      top ?? "n/a"
    } (${num(w.topCategoryMinutes, 0)} min), missed days in last 14: ${num(w.missed14d, 0)}.`;
  }

  const dataLines = [
    `Company: ${name} Ltd (ticker ${ticker}). Founder's goal: ${goal || "not stated"}. Known weakness: ${vice || "none stated"}.`,
    ``,
    `Market data (simulated, prices in ₹):`,
    `- Last price: ₹${price.toFixed(2)} (today ${signed(todayPct)}%, since IPO ${signed(sinceIpoPct)}%)`,
    `- Blocks today: ${blocksToday}; focus today: ${focusToday.toFixed(0)}%`,
    `- Current bull run: ${bullRun} day(s); longest ever: ${longestBullRun}`,
    `- Best day: ${best ? signed(best.pct) : "n/a"}${best ? `% on ${best.date}` : ""}; worst day: ${worst ? signed(worst.pct) : "n/a"}${worst ? `% on ${worst.date}` : ""}`,
    `- Highest price ever: ₹${highestPrice.toFixed(2)}`,
    mostProductive
      ? `- Most productive day: ${mostProductive.minutes} min on ${mostProductive.date}`
      : `- Most productive day: none recorded yet`,
    biggest
      ? `- Biggest trade: "${biggest.activity}" (${signed(biggest.points)} pts) on ${biggest.date}`
      : `- Biggest trade: none recorded yet`,
    weeklyLines,
    ``,
    `Write the note now.`,
  ].join("\n");

  try {
    const result = await askLLM(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: dataLines },
      ],
      { maxTokens: MAX_TOKENS },
    );
    const note = sanitizeNote(result.content);
    if (wordCount(note) >= 25) {
      return Response.json({ note, source: "llama", model: result.model });
    }
    // Too short to be a real note — fall through to the code-built one.
  } catch {
    // LLM unavailable — the fallback below keeps the app working.
  }

  const fallback = buildFallback({
    ticker,
    price,
    todayPct,
    sinceIpoPct,
    blocksToday,
    focusToday,
    bullRun,
    longestBullRun,
    worst,
    goal,
    vice,
  });
  return Response.json({ note: fallback, source: "fallback", model: "rule-based" });
}
