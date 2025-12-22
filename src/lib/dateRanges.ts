export function isMonthYYYYMM(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v);
}

export function isYearYYYY(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}$/.test(v);
}

export function parseMonthRangeUTC(month: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return { start: new Date(Date.UTC(1970, 0, 1)), end: new Date(Date.UTC(1970, 0, 2)) };
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const start = new Date(Date.UTC(y, mm - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, mm, 1, 0, 0, 0, 0));
  return { start, end };
}

export function parseYearRangeUTC(year: string): { start: Date; end: Date } {
  const y = Number(year);
  const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0));
  return { start, end };
}

export function monthAdd(monthYYYYMM: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthYYYYMM);
  if (!m) return monthYYYYMM;
  let y = Number(m[1]);
  let mm = Number(m[2]) - 1; // 0-based
  mm += delta;
  y += Math.floor(mm / 12);
  mm = ((mm % 12) + 12) % 12;
  return `${y}-${String(mm + 1).padStart(2, "0")}`;
}

export function currentMonthYYYYMM(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export function currentYearYYYY(): string {
  return String(new Date().getFullYear());
}
