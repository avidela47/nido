export function formatCurrencyARS(value: number): string {
  const v = Number(value ?? 0);
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    // fallback simple
    const sign = v < 0 ? "-" : "";
    const n = Math.abs(v);
    return `${sign}$ ${Math.round(n).toLocaleString("es-AR")}`;
  }
}

