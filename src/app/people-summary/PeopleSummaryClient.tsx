"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrencyARS } from "../../lib/format";

type Row = {
  personId: string;
  name: string;
  income: number;
  expense: number;
  balance: number;
};

function pct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

export default function PeopleSummaryClient({ month, rows }: { month: string; rows: Row[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of rows) {
      income += r.income;
      expense += r.expense;
    }
    return { income, expense, balance: income - expense };
  }, [rows]);

  const ranked = useMemo(() => {
    const totalExpense = totals.expense || 0;
    const sorted = [...rows].sort((a, b) => b.expense - a.expense);
    return sorted.map((r, idx) => {
      const share = totalExpense > 0 ? (r.expense / totalExpense) * 100 : 0;
      return { ...r, rank: idx + 1, share };
    });
  }, [rows, totals.expense]);

  function setMonth(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    router.push(`/people-summary?${sp.toString()}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Controls + totals */}
      <div className="flex flex-col gap-3 rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)] md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2">
            <div className="text-xs text-[rgb(var(--subtext))]">Ingresos</div>
            <div className="font-semibold tabular-nums">{formatCurrencyARS(totals.income)}</div>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2">
            <div className="text-xs text-[rgb(var(--subtext))]">Gastos</div>
            <div className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(totals.expense))}</div>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2">
            <div className="text-xs text-[rgb(var(--subtext))]">Balance</div>
            <div className="font-semibold tabular-nums">{formatCurrencyARS(totals.balance)}</div>
          </div>
        </div>
      </div>

      {/* Ranking list */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-3">
          <div className="text-sm font-semibold">Ranking de gasto</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            Ordenado por gastos del mes (mayor a menor). Incluye % del gasto total.
          </div>
        </div>

        {ranked.length === 0 ? (
          <div className="text-sm text-[rgb(var(--subtext))]">No hay personas activas.</div>
        ) : (
          <div className="space-y-2">
            {ranked.map((r) => {
              const badge =
                r.balance < 0
                  ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-green-100 text-green-700 border-green-200";

              const width = `${Math.min(100, Math.max(0, r.share))}%`;

              return (
                <div
                  key={r.personId}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-0.5 text-xs font-semibold">
                          #{r.rank}
                        </div>
                        <div className="truncate text-sm font-semibold">{r.name}</div>
                      </div>

                      <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                        Ingresos: <span className="font-semibold tabular-nums">{formatCurrencyARS(r.income)}</span>
                        {" · "}
                        Gastos: <span className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(r.expense))}</span>
                        {" · "}
                        Balance: <span className="font-semibold tabular-nums">{formatCurrencyARS(r.balance)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badge}`}>
                        <span>{r.balance < 0 ? "Déficit" : "OK"}</span>
                      </div>
                      <div className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-1 text-xs font-semibold tabular-nums">
                        {pct(r.share)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--muted))]">
                      <div className="h-full bg-[rgb(var(--brand))]" style={{ width }} />
                    </div>
                    <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                      Participación del gasto total: <span className="font-semibold tabular-nums">{pct(r.share)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
