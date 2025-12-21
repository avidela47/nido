"use client";

import { useState } from "react";

export default function ExportClient({
  defaultMonth,
  defaultYear,
}: {
  defaultMonth: string;
  defaultYear: number;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(String(defaultYear));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="text-sm font-semibold">CSV mensual (movimientos)</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            Descarga ingresos + gastos del mes con persona y categoría.
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>

          <a
            href={`/api/export/month?month=${encodeURIComponent(month)}`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
          >
            Descargar CSV mensual
          </a>
        </div>

        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="text-sm font-semibold">CSV anual (balance por mes)</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            Descarga 12 filas (enero..diciembre) + total anual.
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Año</div>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>

          <a
            href={`/api/export/year?year=${encodeURIComponent(year)}`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
          >
            Descargar CSV anual
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--subtext))]">
        Tip: Abrí el CSV con Excel o importalo en Google Sheets.
      </div>
    </div>
  );
}

