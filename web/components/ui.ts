export const PANEL_CLASS = "rounded-lg border border-[#1c242d] bg-[#0f141a]";

export const MUTED_CLASS = "text-[#8b949e]";

export function pctColorClass(pct: number): string {
  if (pct > 0) return "text-[#16c784]";
  if (pct < 0) return "text-[#ea3943]";
  return "text-[#8b949e]";
}

export function ratingColorClass(rating: "productive" | "neutral" | "unproductive"): string {
  if (rating === "productive") return "text-[#16c784]";
  if (rating === "unproductive") return "text-[#ea3943]";
  return "text-[#8b949e]";
}

export function ratingBarColor(rating: "productive" | "neutral" | "unproductive"): string {
  if (rating === "productive") return "#16c784";
  if (rating === "unproductive") return "#ea3943";
  return "#6b7683";
}
