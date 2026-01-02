
"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrencyARS } from "../../lib/format";

type CategoryRow = { _id: string; name: string };
type SpentRow = { categoryId: string; spent: number };
type Row = { categoryId: string; categoryName: string; spent: number };

export default function BudgetsClient({
  month,
  categories,
  spentByCategory,
}: {
  month: string;
  categories: CategoryRow[];
  spentByCategory: SpentRow[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const initialRows = useMemo<Row[]>(() => {
    const spentMap = new Map<string, number>();
    for (const s of spentByCategory) spentMap.set(s.categoryId, Number(s.spent) || 0);
    return categories.map((c) => ({
      categoryId: c._id,
      categoryName: c.name,
      spent: spentMap.get(c._id) ?? 0,
    }));
  }, [categories, spentByCategory]);

  const totals = useMemo(() => {
    let spentTotal = 0;
    for (const r of initialRows) {
      spentTotal += r.spent;
    }
    return { spentTotal };
  }, [initialRows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)] md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
          <input
            type="month"
            value={month}
            onChange={e => {
              const sp = new URLSearchParams(params.toString());
              sp.set("month", e.target.value);
              router.push(`/budgets?${sp.toString()}`);
            }}
            className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2">
            <div className="text-xs text-[rgb(var(--subtext))]">Total gastado</div>
            <div className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(totals.spentTotal))}</div>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-3">
          <div className="text-sm font-semibold">Gasto real por categoría</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            El monto mostrado es la suma de los pagos/gastos realizados en cada categoría este mes.
          </div>
        </div>
        {initialRows.length === 0 ? (
          <div className="text-sm text-[rgb(var(--subtext))]">No hay categorías de gasto.</div>
        ) : (
          <div className="space-y-2">
            {initialRows.map((r) => (
              <div key={r.categoryId} className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="truncate text-sm font-semibold">{r.categoryName}</div>
                <div className="mt-1 text-xs text-[rgb(var(--subtext))] md:mt-0">
                  Gastado: <span className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(r.spent))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


