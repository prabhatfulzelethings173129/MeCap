import { DEFAULT_RATINGS } from "@/lib/engine";
import { askLLM, LlmMessage } from "@/lib/llm";
import { isCategory, ParsedBlock, Rating } from "@/lib/types";

const MIN_MINUTES = 5;
const MAX_MINUTES = 720;
const MAX_BLOCKS = 30;

const SYSTEM_PROMPT = `You convert a short description of someone's day into JSON time blocks for a personal stock-market simulator.

Reply with ONLY JSON, exactly this shape:
{"blocks":[{"activity":"short label","category":"<category>","minutes":<integer>,"rating":"<rating>"}]}

category must be EXACTLY one of these strings:
"Study", "Work & Projects", "Skills & Hobbies", "Health & Fitness", "Rest & Chores", "Screens & Scrolling", "Social & Leisure", "Other"

rating must be exactly one of: "productive", "neutral", "unproductive"

Rules:
- Convert hours to minutes (2 hrs = 120).
- Sleep belongs in "Rest & Chores".
- Activities the user says they skipped create NO block.
- If no duration is given, estimate sensible minutes.
- Default rating by category: Study / Work & Projects / Skills & Hobbies / Health & Fitness -> productive; Rest & Chores / Other -> neutral; Screens & Scrolling / Social & Leisure -> unproductive.

Example 1
User: "slept 7 hrs, studied DSA 2 hrs, gym 1 hr, 90 min reels"
{"blocks":[{"activity":"Sleep","category":"Rest & Chores","minutes":420,"rating":"neutral"},{"activity":"Studied DSA","category":"Study","minutes":120,"rating":"productive"},{"activity":"Gym","category":"Health & Fitness","minutes":60,"rating":"productive"},{"activity":"Reels","category":"Screens & Scrolling","minutes":90,"rating":"unproductive"}]}

Example 2
User: "classes all morning, skipped my run, 30 min chores, movie with friends"
{"blocks":[{"activity":"Classes","category":"Study","minutes":180,"rating":"productive"},{"activity":"Chores","category":"Rest & Chores","minutes":30,"rating":"neutral"},{"activity":"Movie with friends","category":"Social & Leisure","minutes":120,"rating":"unproductive"}]}`;

const STRICT_REMINDER =
  'REMINDER: reply with ONLY valid JSON matching {"blocks":[{"activity":"...","category":"...","minutes":<integer>,"rating":"..."}]}. No markdown, no code fences, no commentary, no trailing commas.';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "");
  }
  return t.trim();
}

function extractList(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed) && Array.isArray(parsed.blocks)) return parsed.blocks;
  return null;
}

function normalizeRating(v: unknown, category: ParsedBlock["category"]): Rating {
  if (typeof v === "string") {
    const lower = v.trim().toLowerCase();
    if (lower === "productive" || lower === "neutral" || lower === "unproductive") return lower;
  }
  return DEFAULT_RATINGS[category];
}

function toBlocks(rawList: unknown[]): ParsedBlock[] {
  const out: ParsedBlock[] = [];
  for (const raw of rawList) {
    if (!isRecord(raw)) continue;
    const activity = typeof raw.activity === "string" ? raw.activity.trim().slice(0, 80) : "";
    if (activity === "") continue;
    const category = isCategory(raw.category) ? raw.category : "Other";
    let minutes: number;
    if (typeof raw.minutes === "number" && Number.isFinite(raw.minutes)) {
      minutes = raw.minutes;
    } else if (
      typeof raw.minutes === "string" &&
      raw.minutes.trim() !== "" &&
      Number.isFinite(Number(raw.minutes))
    ) {
      minutes = Number(raw.minutes);
    } else {
      minutes = 30; // model omitted a duration — sensible default
    }
    minutes = Math.round(Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, minutes)));
    out.push({ activity, category, minutes, rating: normalizeRating(raw.rating, category) });
    if (out.length >= MAX_BLOCKS) break;
  }
  return out;
}

/** Returns validated blocks, or null when the reply could not be parsed at all. */
function parseModelJson(content: string): ParsedBlock[] | null {
  const stripped = stripFences(content);
  const candidates = [stripped];
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(stripped.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const list = extractList(parsed);
      if (list) return toBlocks(list);
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function messagesFor(text: string, strict: boolean): LlmMessage[] {
  return [
    { role: "system", content: strict ? `${SYSTEM_PROMPT}\n\n${STRICT_REMINDER}` : SYSTEM_PROMPT },
    { role: "user", content: text },
  ];
}

export async function POST(req: Request): Promise<Response> {
  let text = "";
  try {
    const body: unknown = await req.json();
    if (isRecord(body) && typeof body.text === "string") text = body.text;
  } catch {
    return Response.json({ error: 'Request body must be JSON like {"text": "..."}.' }, { status: 400 });
  }
  text = text.trim().slice(0, 4000);
  if (text === "") {
    return Response.json({ error: "Write a line or two about your day first." }, { status: 400 });
  }

  let lastError = "The local model could not be reached.";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await askLLM(messagesFor(text, attempt === 1), { maxTokens: 1000, json: true });
      const blocks = parseModelJson(result.content);
      if (blocks !== null) {
        return Response.json({ blocks, model: result.model });
      }
      lastError = "The model's reply could not be parsed into blocks.";
    } catch (err) {
      lastError = err instanceof Error ? err.message : "The local model could not be reached.";
    }
  }
  return Response.json(
    { error: `${lastError} Try rephrasing, or use the manual entry form below.` },
    { status: 502 },
  );
}
