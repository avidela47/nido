"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save } from "lucide-react";

import BudgetBadge from "../../components/ui/BudgetBadge";
import { computeBudgetAlert } from "../../lib/budgetAlerts";
import { formatCurrencyARS } from "../../lib/format";

type CategoryRow = { _id: string; name: string };
type BudgetRow = { _id: string; categoryId: string; amount: number };
type SpentRow = { categoryId: string; spent: number };

type Row = {
  categoryId: string;
  categoryName: string;
  budgetId?: string;
  budget: number;
  spent: number;
};

function didChangeBudget(original: number, draftText: string | undefined): boolean {
  const parsed = parseMoneyInput(draftText ?? "");
  if (parsed === null) return false;
  return parsed !== (Number(original) || 0);
}

function toMoneyInput(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "";
  return String(Math.round(v));
}

function parseMoneyInput(v: string): number | null {
  const trimmed = v.trim();
  if (trimmed === "") return 0; // vacío = 0 (equivale a borrar)
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export default function BudgetsClient({
  month,
  categories,
  budgets,
  spentByCategory,
}: {
  month: string;
  categories: CategoryRow[];
  budgets: BudgetRow[];
  spentByCategory: SpentRow[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const initialRows = useMemo<Row[]>(() => {
    const budgetMap = new Map<string, { id: string; amount: number }>();
    for (const b of budgets) budgetMap.set(b.categoryId, { id: b._id, amount: Number(b.amount) || 0 });

    const spentMap = new Map<string, number>();
    for (const s of spentByCategory) spentMap.set(s.categoryId, Number(s.spent) || 0);

    return categories.map((c) => {
      const b = budgetMap.get(c._id);
      return {
        categoryId: c._id,
        categoryName: c.name,
        budgetId: b?.id,
        budget: b?.amount ?? 0,
        spent: spentMap.get(c._id) ?? 0,
      };
    });
  }, [categories, budgets, spentByCategory]);

  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    for (const r of initialRows) obj[r.categoryId] = toMoneyInput(r.budget);
    return obj;
  });

  const [savingByCat, setSavingByCat] = useState<Record<string, boolean>>({});
  const [errorByCat, setErrorByCat] = useState<Record<string, string>>({});

  const totals = useMemo(() => {
    // Totales “vivos”: si el usuario está editando, reflejar drafts para que entienda el impacto.
    let budgetTotal = 0;
    let spentTotal = 0;
    let pendingChanges = 0;
    for (const r of initialRows) {
      const parsed = parseMoneyInput(drafts[r.categoryId] ?? "");
      const nextBudget = parsed === null ? r.budget : parsed;
      budgetTotal += nextBudget;
      spentTotal += r.spent;
      if (didChangeBudget(r.budget, drafts[r.categoryId])) pendingChanges += 1;
    }
    return { budgetTotal, spentTotal, balance: budgetTotal - spentTotal, pendingChanges };
  }, [initialRows, drafts]);

  function setMonth(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    router.push(`/budgets?${sp.toString()}`);
    router.refresh();
  }

  async function saveCategoryBudget(categoryId: string) {
    setErrorByCat((p) => ({ ...p, [categoryId]: "" }));

    const amount = parseMoneyInput(drafts[categoryId] ?? "");
    if (amount === null) {
      setErrorByCat((p) => ({ ...p, [categoryId]: "Monto inválido." }));
      return;
    }

    // Confirmación simple para borrado, así no desaparece “sin querer”.
    if (amount === 0) {
      const ok = window.confirm(
        "Esto va a borrar el presupuesto de esta categoría para este mes (quedará en 0). ¿Confirmás?"
      );
      if (!ok) return;
    }

    setSavingByCat((p) => ({ ...p, [categoryId]: true }));

    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, categoryId, amount }),
    });

    const json = await res.json().catch(() => null);

    setSavingByCat((p) => ({ ...p, [categoryId]: false }));

    if (!res.ok || !json?.ok) {
      setErrorByCat((p) => ({ ...p, [categoryId]: json?.error ?? "No se pudo guardar." }));
      return;
    }

    // Guardado ok: refrescar server data para recalcular totales / alertas con fuente de verdad.
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
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
            <div className="text-xs text-[rgb(var(--subtext))]">Presupuesto</div>
            <div className="font-semibold tabular-nums">{formatCurrencyARS(totals.budgetTotal)}</div>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2">
            <div className="text-xs text-[rgb(var(--subtext))]">Gastado</div>
            <div className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(totals.spentTotal))}</div>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2">
            <div className="text-xs text-[rgb(var(--subtext))]">Saldo</div>
            <div className="font-semibold tabular-nums">{formatCurrencyARS(totals.balance)}</div>
          </div>
        </div>

        {totals.pendingChanges > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Tenés {totals.pendingChanges} cambio(s) sin guardar. Guardá por fila.
          </div>
        ) : null}
      </div>

      {/* Rows */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-3">
          <div className="text-sm font-semibold">Por categoría</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            Editá el presupuesto y guardá por fila. Si guardás 0 (o vacío), se borra el presupuesto.
          </div>
        </div>

        {initialRows.length === 0 ? (
          <div className="text-sm text-[rgb(var(--subtext))]">No hay categorías de gasto.</div>
        ) : (
          <div className="space-y-2">
            {initialRows.map((r) => {
              const alert = computeBudgetAlert(r.spent, r.budget);
              const pct = r.budget > 0 ? Math.round((r.spent / r.budget) * 100) : 0;
              const barWidth = `${Math.min(100, Math.max(0, pct))}%`;

              const saving = !!savingByCat[r.categoryId];
              const err = errorByCat[r.categoryId] ?? "";

              const changed = didChangeBudget(r.budget, drafts[r.categoryId]);
              const isZeroNow = (parseMoneyInput(drafts[r.categoryId] ?? "") ?? r.budget) === 0;
              const showCTA = r.budget <= 0 && !changed;

              return (
                <div key={r.categoryId} className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{r.categoryName}</div>
                      <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                        Presupuesto actual:{" "}
                        <span className="font-semibold tabular-nums">{formatCurrencyARS(r.budget)}</span>
                        {" · "}
                        Gastado:{" "}
                        <span className="font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(r.spent))}</span>
                      </div>

                      {showCTA ? (
                        <div className="mt-2 text-xs font-semibold text-[rgb(var(--subtext))]">
                          Tip: poné un monto para activar el semáforo de esta categoría.
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <BudgetBadge status={alert.status} percent={alert.percent} label={alert.label} />

                      <div className="flex w-full items-center gap-2 md:w-auto">
                        <input
                          value={drafts[r.categoryId] ?? ""}
                          onChange={(e) =>
                            setDrafts((p) => ({ ...p, [r.categoryId]: e.target.value }))
                          }
                          inputMode="numeric"
                          placeholder="Presupuesto ARS"
                          className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm md:w-48"
                        />

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => saveCategoryBudget(r.categoryId)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                          title="Guardar presupuesto"
                        >
                          <Save size={16} />
                          {saving ? "Guardando…" : changed ? "Guardar cambios" : "Guardar"}
                        </button>
                      </div>

                      {isZeroNow && changed ? (
                        <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 md:w-90">
                          Este valor va a borrar el presupuesto al guardar.
                        </div>
                      ) : null}

                      {err ? (
                        <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 md:w-90">
                          {err}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--muted))]">
                      <div className="h-full bg-[rgb(var(--brand))]" style={{ width: barWidth }} />
                    </div>
                    <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                      Uso: <span className="font-semibold tabular-nums">{alert.percent}%</span>
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


