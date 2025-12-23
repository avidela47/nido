"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ArrowDownCircle, ArrowUpCircle, CalendarDays, WalletCards } from "lucide-react";
import { currentMonthYYYYMM, parseMonthRangeUTC } from "../../lib/dateRanges";
import { formatCurrencyARS } from "../../lib/format";

type TxType = "income" | "expense";

type Person = {
  _id: string;
  name: string;
  txCount?: number;
};

type Summary = {
  personId: string;
  month: string;
  prevMonth?: string;
  totalsAllTime: {
    income: number;
    expense: number;
    net: number;
  };
  totalsMonth: {
    income: number;
    expense: number;
    net: number;
  };
  totalsPrevMonth?: {
    income: number;
    expense: number;
    net: number;
  };
  changeVsPrevMonth?: {
    incomeDelta: number;
    incomePct: number | null;
    expenseDelta: number;
    expensePct: number | null;
    netDelta: number;
    netPct: number | null;
  };
  lastTxDate: string | null;
  topCategoriesMonth: Array<{ categoryId: string; categoryName: string; type: TxType; amount: number }>;
};

function formatPct(v: number | null | undefined): string {
  if (v === null) return "Nuevo";
  if (v === undefined || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`;
}

export default function PersonSummaryModal({
  person,
  open,
  onClose,
}: {
  person: Person | null;
  open: boolean;
  onClose: () => void;
}) {
  const [month, setMonth] = useState<string>(() => currentMonthYYYYMM());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Summary | null>(null);

  const title = person?.name ?? "Persona";

  useEffect(() => {
    if (!open || !person?._id) return;

    const personId = person._id;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/people/summary?id=${encodeURIComponent(personId)}&month=${encodeURIComponent(month)}`
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? "No se pudo cargar el resumen.");
        }
        if (!cancelled) setData(json.data as Summary);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo cargar el resumen.";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, person?._id, month]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const monthLabel = useMemo(() => {
    try {
      const { start } = parseMonthRangeUTC(month);
      return start.toLocaleDateString("es-AR", { year: "numeric", month: "long" });
    } catch {
      return month;
    }
  }, [month]);

  if (!open || !person) return null;

  const allIncome = data?.totalsAllTime.income ?? 0;
  const allExpense = data?.totalsAllTime.expense ?? 0;
  const allNet = data?.totalsAllTime.net ?? allIncome - allExpense;

  const mIncome = data?.totalsMonth.income ?? 0;
  const mExpense = data?.totalsMonth.expense ?? 0;
  const mNet = data?.totalsMonth.net ?? mIncome - mExpense;

  const ch = data?.changeVsPrevMonth;
  const prevLabel = data?.prevMonth ? `vs ${data.prevMonth}` : "vs mes anterior";

  return (
  <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Cerrar"
      />

      <div className="relative w-full max-w-xl">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_12px_44px_rgba(0,0,0,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Resumen de</div>
              <div className="truncate text-lg font-semibold">{title}</div>
              <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                Movimientos totales: <span className="font-semibold tabular-nums">{Number(person.txCount) || 0}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-white"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tarjeta estilo crédito */}
          <div className="mt-4 rounded-3xl bg-linear-to-br from-[rgb(var(--brand))] via-[rgb(var(--brand-2))] to-slate-900 p-4 text-white shadow-[0_18px_50px_rgba(2,6,23,0.4)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <WalletCards size={20} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{title}</div>
                  <div className="text-xs text-white/80">Nido • Perfil</div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                <div className="text-[10px] font-semibold text-white/80">Balance histórico</div>
                <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(allNet)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-white/80">
                  <ArrowUpCircle size={14} /> Ingresos históricos
                </div>
                <div className="mt-1 font-semibold tabular-nums">{formatCurrencyARS(allIncome)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-white/80">
                  <ArrowDownCircle size={14} /> Egresos históricos
                </div>
                <div className="mt-1 font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(allExpense))}</div>
              </div>
            </div>
          </div>

          {/* Controles mes */}
          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--subtext))]">
                <CalendarDays size={16} /> Mes
              </div>
              <div className="mt-1 text-xs text-[rgb(var(--subtext))]">{monthLabel}</div>
            </div>

            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>

          {/* Stats del mes */}
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2">
              <div className="text-xs text-[rgb(var(--subtext))]">Ingresos del mes</div>
              <div className="font-semibold tabular-nums">{formatCurrencyARS(mIncome)}</div>
              <div className="mt-1 text-[11px] text-[rgb(var(--subtext))]">
                <span className={`font-semibold ${Number(ch?.incomeDelta) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {formatCurrencyARS(Number(ch?.incomeDelta) || 0)}
                </span>
                {" · "}
                <span className="font-semibold">{formatPct(ch?.incomePct)}</span>
                {" "}
                <span className="opacity-80">{prevLabel}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2">
              <div className="text-xs text-[rgb(var(--subtext))]">Gastos del mes</div>
              <div className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(mExpense))}</div>
              <div className="mt-1 text-[11px] text-[rgb(var(--subtext))]">
                <span className={`font-semibold ${Number(ch?.expenseDelta) <= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {formatCurrencyARS(-Math.abs(Number(ch?.expenseDelta) || 0))}
                </span>
                {" · "}
                <span className="font-semibold">{formatPct(ch?.expensePct)}</span>
                {" "}
                <span className="opacity-80">{prevLabel}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2">
              <div className="text-xs text-[rgb(var(--subtext))]">Balance del mes</div>
              <div className="font-semibold tabular-nums">{formatCurrencyARS(mNet)}</div>
              <div className="mt-1 text-[11px] text-[rgb(var(--subtext))]">
                <span className={`font-semibold ${Number(ch?.netDelta) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {formatCurrencyARS(Number(ch?.netDelta) || 0)}
                </span>
                {" · "}
                <span className="font-semibold">{formatPct(ch?.netPct)}</span>
                {" "}
                <span className="opacity-80">{prevLabel}</span>
              </div>
            </div>
          </div>

          {/* Extras útiles */}
          <div className="mt-3 rounded-2xl border border-[rgb(var(--border))] bg-white p-3">
            <div className="text-sm font-semibold">Extras</div>

            {loading ? (
              <div className="mt-2 text-sm text-[rgb(var(--subtext))]">Cargando…</div>
            ) : error ? (
              <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {error}
              </div>
            ) : (
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2">
                  <div className="text-xs text-[rgb(var(--subtext))]">Último movimiento</div>
                  <div className="text-sm font-semibold">
                    {data?.lastTxDate ? new Date(data.lastTxDate).toLocaleDateString("es-AR") : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2">
                  <div className="text-xs text-[rgb(var(--subtext))]">Top categorías del mes</div>
                  <div className="mt-1 space-y-1 text-sm">
                    {(data?.topCategoriesMonth ?? []).slice(0, 3).map((c) => (
                      <div key={c.categoryId} className="flex items-center justify-between gap-2">
                        <span className="truncate">{c.categoryName}</span>
                        <span className="font-semibold tabular-nums">{formatCurrencyARS(c.type === "expense" ? -Math.abs(c.amount) : c.amount)}</span>
                      </div>
                    ))}
                    {(data?.topCategoriesMonth ?? []).length === 0 ? (
                      <div className="text-xs text-[rgb(var(--subtext))]">Sin datos en este mes.</div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
