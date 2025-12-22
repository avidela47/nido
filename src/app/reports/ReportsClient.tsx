"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useToast } from "../../components/ui/Toast";
import { formatCurrencyARS } from "../../lib/format";

type PersonRow = { _id: string; name: string };

type ReportData = {
  month: string;
  totals: { income: number; expense: number; balance: number };
  series: Array<{ day: string; income: number; expense: number; balance: number }>;
  topCategories: Array<{ categoryId: string; categoryName: string; spent: number }>;
};

function currentMonthYYYYMM(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export default function ReportsClient({ people }: { people: PersonRow[] }) {
  const toast = useToast();

  const [month, setMonth] = useState(currentMonthYYYYMM());
  const [personId, setPersonId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ReportData | null>(null);

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("month", month);
    if (personId) sp.set("personId", personId);
    return `/api/reports?${sp.toString()}`;
  }, [month, personId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");

      const res = await fetch(url);
      const json = await res.json().catch(() => null);

      if (cancelled) return;

      setLoading(false);

      if (!res.ok || !json?.ok) {
        const msg = json?.error ?? "No se pudieron cargar reportes.";
        setError(msg);
        setData(null);
        toast.push({ title: "Error", description: msg, variant: "error" });
        return;
      }

      setData(json.data as ReportData);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [url, toast]);

  const totals = data?.totals ?? { income: 0, expense: 0, balance: 0 };
  const series = data?.series ?? [];
  const topCategories = data?.topCategories ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="text-sm font-semibold">Filtros</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Persona (opcional)</div>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {people.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-xs text-[rgb(var(--subtext))] break-all">
          Endpoint: <span className="font-mono">{url}</span>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="text-xs text-[rgb(var(--subtext))]">Ingresos</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrencyARS(totals.income)}</div>
        </div>
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="text-xs text-[rgb(var(--subtext))]">Gastos</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(totals.expense))}</div>
        </div>
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="text-xs text-[rgb(var(--subtext))]">Balance</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrencyARS(totals.balance)}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Ingresos vs Gastos (diario)</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Barras por día del mes</div>
          </div>
          {loading ? <div className="text-xs text-[rgb(var(--subtext))]">Cargando…</div> : null}
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="income" />
              <Bar dataKey="expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {series.length === 0 && !loading ? (
          <div className="mt-2 text-sm text-[rgb(var(--subtext))]">No hay movimientos para este filtro.</div>
        ) : null}
      </div>

      {/* Top categories */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="text-sm font-semibold">Top categorías de gasto</div>
        <div className="mt-3 space-y-2">
          {topCategories.length === 0 ? (
            <div className="text-sm text-[rgb(var(--subtext))]">Sin gastos registrados para este filtro.</div>
          ) : (
            topCategories.map((c) => (
              <div
                key={c.categoryId}
                className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2"
              >
                <div className="text-sm font-semibold">{c.categoryName}</div>
                <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(c.spent))}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
