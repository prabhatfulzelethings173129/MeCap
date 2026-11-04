export function fmtPrice(n: number): string {
  return `₹${n.toFixed(2)}`;
}

export function fmtPct(n: number, digits = 2): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function fmtSigned(n: number, digits = 1): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${MONTHS[m - 1]} ${d}`;
}
