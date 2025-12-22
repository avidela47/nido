export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  const needsQuotes = /[",\n\r;]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCSV(rows: Array<Record<string, unknown>>, headers: string[]): string {
  const head = headers.map(csvEscape).join(",");
  const lines = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","));
  return [head, ...lines].join("\n");
}
