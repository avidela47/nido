
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrencyARS } from "../../lib/format";
import { MonthInput } from "../../components/ui/MonthInput";

type CategoryRow = { _id: string; name: string };
type SpentRow = { categoryId: string; spent: number };
type Row = { categoryId: string; categoryName: string; spent: number };

type MovementItem = {
  _id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  note?: string;
  accountId?: string;
  accountName?: string;
  personId?: string;
  personName?: string;
};

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

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [movOpen, setMovOpen] = useState(false);
  const [movLoading, setMovLoading] = useState(false);
  const [movError, setMovError] = useState<string>("");
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [movSearch, setMovSearch] = useState("");
  const initialRows = useMemo<Row[]>(() => {
    const spentMap = new Map<string, number>();
    for (const s of spentByCategory) spentMap.set(s.categoryId, Number(s.spent) || 0);
    return categories.map((c) => ({
      categoryId: c._id,
      categoryName: c.name,
      spent: spentMap.get(c._id) ?? 0,
    }));
  }, [categories, spentByCategory]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return initialRows.find((r) => r.categoryId === selectedCategoryId) ?? null;
  }, [initialRows, selectedCategoryId]);

  const filteredMovements = useMemo(() => {
    const q = movSearch.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter((m) => {
      return (
        (m.note?.toLowerCase().includes(q) ?? false) ||
        (m.accountName?.toLowerCase().includes(q) ?? false) ||
        (m.personName?.toLowerCase().includes(q) ?? false) ||
        String(m.amount).includes(q)
      );
    });
  }, [movements, movSearch]);

  const movementsTotal = useMemo(() => {
    // For budgets (expense categories), amounts should represent expense; normalize to negative display for expense.
    let sum = 0;
    for (const m of filteredMovements) sum += Number(m.amount) || 0;
    return sum;
  }, [filteredMovements]);

  function exportMovementsCSV() {
    if (!filteredMovements.length) return;
    const header = ["Fecha", "Tipo", "Monto", "Cuenta", "Persona", "Nota"]; 
    const rows = filteredMovements.map((m) => [
      String(m.date?.slice(0, 10) ?? ""),
      String(m.type),
      String(m.amount),
      m.accountName ?? "",
      m.personName ?? "",
      m.note ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimientos_${selectedCategory?.categoryName ?? "categoria"}_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  useEffect(() => {
    if (!movOpen || !selectedCategoryId) return;

    let cancelled = false;
    async function load() {
      setMovLoading(true);
      setMovError("");
      try {
        const res = await fetch(
          `/api/budgets/category-movements?month=${encodeURIComponent(month)}&categoryId=${encodeURIComponent(
            selectedCategoryId ?? ""
          )}`
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo cargar el detalle.");
        if (!cancelled) setMovements((json.items ?? []) as MovementItem[]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo cargar el detalle.";
        if (!cancelled) setMovError(msg);
      } finally {
        if (!cancelled) setMovLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [movOpen, selectedCategoryId, month]);

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
        <MonthInput
          value={month}
          onChange={e => {
            const sp = new URLSearchParams(params.toString());
            sp.set("month", e.target.value);
            router.push(`/budgets?${sp.toString()}`);
          }}
          className="w-full md:w-auto"
        />
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
              <div
                key={r.categoryId}
                className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.categoryName}</div>
                  <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                    Gastado: <span className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(r.spent))}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(r.categoryId);
                      setMovOpen(true);
                    }}
                    className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-1.5 text-xs font-semibold hover:bg-white"
                  >
                    Ver movimientos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal detalle movimientos */}
      {movOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMovOpen(false)}
            aria-label="Cerrar"
          />
          <div className="relative w-full max-w-2xl">
            <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_12px_44px_rgba(0,0,0,0.22)] max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Detalle</div>
                  <div className="truncate text-lg font-semibold">
                    {selectedCategory?.categoryName ?? "Categoría"}
                  </div>
                  <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                    Mes: <span className="font-semibold">{month}</span>
                    {selectedCategory ? (
                      <>
                        {" · "}
                        Gastado: <span className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(selectedCategory.spent))}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMovOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-white"
                  title="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <input
                    value={movSearch}
                    onChange={(e) => setMovSearch(e.target.value)}
                    placeholder="Buscar (cuenta, persona, nota, monto)…"
                    className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2 text-xs">
                      Total: <span className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(movementsTotal))}</span>
                    </div>
                    <button
                      type="button"
                      onClick={exportMovementsCSV}
                      className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--brand))] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Exportar CSV
                    </button>
                  </div>
                </div>

                {movLoading ? (
                  <div className="text-sm text-[rgb(var(--subtext))]">Cargando movimientos…</div>
                ) : movError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {movError}
                  </div>
                ) : filteredMovements.length === 0 ? (
                  <div className="text-sm text-[rgb(var(--subtext))]">No hay movimientos en esta categoría para el mes.</div>
                ) : (
                  <div className="divide-y divide-[rgb(var(--border))] rounded-2xl border border-[rgb(var(--border))] bg-white">
                    {filteredMovements.map((m) => (
                      <div key={m._id} className="flex flex-col gap-1 px-3 py-2 text-xs md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={m.type === "income" ? "text-emerald-700" : m.type === "expense" ? "text-red-700" : "text-blue-700"}>
                              {m.type === "income" ? "+" : m.type === "expense" ? "-" : "⇄"}
                            </span>
                            <span className="font-semibold tabular-nums">{formatCurrencyARS(m.type === "expense" ? -Math.abs(m.amount) : m.amount)}</span>
                            {m.accountName ? <span className="text-[rgb(var(--subtext))]">· {m.accountName}</span> : null}
                            {m.personName ? <span className="text-[rgb(var(--subtext))]">· {m.personName}</span> : null}
                          </div>
                          {m.note ? <div className="truncate text-[rgb(var(--subtext))]">{m.note}</div> : null}
                        </div>
                        <div className="shrink-0 tabular-nums text-[rgb(var(--subtext))]">{m.date?.slice(0, 10)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


