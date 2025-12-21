"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";

function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type TxType = "income" | "expense";

export type TxItem = {
  _id: string;
  type: TxType;
  amount: number;
  date: string | null;
  note: string;
  person: { id: string; name: string };
  category: { id: string; name: string; type: TxType };
};

export default function TransactionsClient({
  month,
  items,
}: {
  month: string;
  items: TxItem[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [busyId, setBusyId] = useState<string>("");

  const monthValue = useMemo(() => month || currentMonthYYYYMM(), [month]);

  function setMonth(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    router.push(`/transactions?${sp.toString()}`);
  }

  async function remove(id: string) {
    setBusyId(id);
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setBusyId("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
          <input
            type="month"
            value={monthValue}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
          />
        </div>

        <Link
          href={`/transactions/new?month=${encodeURIComponent(monthValue)}`}
          className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
        >
          + Nueva
        </Link>
      </div>

      <div className="space-y-2">
        {items.map((t) => {
          const isExpense = t.type === "expense";
          const amount = isExpense ? -Math.abs(t.amount) : Math.abs(t.amount);

          return (
            <div
              key={t._id}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {t.note || t.category.name}
                  </div>
                  <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                    {t.date ? new Date(t.date).toLocaleDateString("es-AR") : "—"} ·{" "}
                    {t.person.name} · {t.category.name}
                  </div>
                </div>

                <div className={`text-sm font-semibold tabular-nums ${!isExpense ? "text-emerald-600" : ""}`}>
                  {amount.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Link
                  href={`/transactions/${t._id}/edit?month=${encodeURIComponent(monthValue)}`}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-xs font-semibold"
                >
                  Editar
                </Link>

                <button
                  type="button"
                  onClick={() => remove(t._id)}
                  disabled={busyId === t._id}
                  className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-70"
                >
                  {busyId === t._id ? "Borrando…" : "Borrar"}
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-sm text-[rgb(var(--subtext))]">
            No hay movimientos en {monthValue}.
          </div>
        )}
      </div>
    </div>
  );
}

