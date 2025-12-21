"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PersonBudgetMonthly, PersonBudgetRow } from "../../lib/personBudgets";
import { formatCurrencyARS } from "../../lib/format";

function badge(status: PersonBudgetRow["status"]) {
  if (status === "over") return "border-red-200 bg-red-50 text-red-700";
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "ok") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-[rgb(var(--border))] bg-white text-[rgb(var(--subtext))]";
}

function label(status: PersonBudgetRow["status"]) {
  if (status === "over") return "Excedido";
  if (status === "warn") return "Alerta 80%";
  if (status === "ok") return "En curso";
  return "Sin presupuesto";
}

export default function PersonBudgetsClient({ initial }: { initial: PersonBudgetMonthly }) {
  const router = useRouter();
  const params = useSearchParams();

  const [data, setData] = useState<PersonBudgetMonthly>(initial);
  const [savingId, setSavingId] = useState<string>("");

  const month = useMemo(() => data.month, [data.month]);

  function setMonth(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    router.push(`/person-budgets?${sp.toString()}`);
  }

  async function refresh(nextMonth?: string) {
    const m = nextMonth ?? month;
    const res = await fetch(`/api/person-budgets?month=${encodeURIComponent(m)}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (json?.ok && json.data) setData(json.data as PersonBudgetMonthly);
  }

  async function save(personId: string, amount: number) {
    setSavingId(personId);
    await fetch("/api/person-budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, personId, amount }),
    });
    setSavingId("");
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
          <input
            type="month"
            value={month}
            onChange={async (e) => {
              const next = e.target.value;
              setMonth(next);
              await refresh(next);
            }}
            className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
          />
        </div>

        <div className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3">
          <div className="text-xs text-[rgb(var(--subtext))]">Total tope por personas</div>
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {formatCurrencyARS(data.totals.budget)}
          </div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            Gastado:{" "}
            <span className="font-semibold">
              {formatCurrencyARS(-Math.abs(data.totals.spent))}
            </span>{" "}
            · Avance: <span className="font-semibold">{Math.round(data.totals.percent)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {data.rows.map((row) => (
          <PersonBudgetCard
            key={row.personId}
            row={row}
            onSave={save}
            saving={savingId === row.personId}
          />
        ))}
      </div>
    </div>
  );
}

function PersonBudgetCard({
  row,
  onSave,
  saving,
}: {
  row: PersonBudgetRow;
  onSave: (personId: string, amount: number) => Promise<void>;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<string>(row.budget ? String(row.budget) : "");

  const pct = row.budget > 0 ? Math.min(100, Math.max(0, row.percent)) : 0;

  return (
    <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{row.personName}</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            Gastado:{" "}
            <span className="font-semibold">{formatCurrencyARS(-Math.abs(row.spent))}</span> ·
            Tope: <span className="font-semibold">{formatCurrencyARS(row.budget)}</span>
          </div>
        </div>

        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge(row.status)}`}>
          {label(row.status)}
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--muted))]">
          <div
            className="h-2 rounded-full bg-[rgb(var(--brand))]"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-[rgb(var(--subtext))]">
          <div>
            Avance:{" "}
            <span className="font-semibold">{row.budget > 0 ? Math.round(row.percent) : 0}%</span>
          </div>
          <div>
            Restante:{" "}
            <span className={`font-semibold ${row.remaining < 0 ? "text-red-700" : ""}`}>
              {formatCurrencyARS(row.remaining)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Tope (ARS)</div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputMode="numeric"
            placeholder="Ej: 250000"
            className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            const n = Number(draft);
            const amount = Number.isFinite(n) && n >= 0 ? n : 0;
            await onSave(row.personId, amount);
          }}
          className="mt-2 md:mt-6 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
