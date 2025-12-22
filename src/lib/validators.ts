export function isValidMonthYYYYMM(v: string): boolean {
  return /^\d{4}-\d{2}$/.test(v);
}

export function isValidDateYYYYMMDD(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function parseMoney(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
