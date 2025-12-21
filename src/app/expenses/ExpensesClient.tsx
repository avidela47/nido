"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { formatCurrencyARS } from "../../lib/format";

type Person = { _id: string; name: string };
type Category = { _id: string; name: string; type: "expense" };

type ExpenseItem = {
  _id: string;
  amount: number;
  date: string;
  note: string;
  person: { _id: string; name: string } | null;
  category: { _id: string; name: string } | null;
};

export default function ExpensesClient({
  month,
  people,
  categories,
}: {
  month: string;
  people: Person[];
  categories: Category[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState<string>(params.get("q") ?? "");
  const [personId, setPersonId] = useState<string>(params.get("personId") ?? "");
  const [categoryId, setCategoryId] = useState<string>(params.get("categoryId") ?? "");
  const [limit, setLimit] = useState<string>(params.get("limit") ?? "10");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [error, setError] = useState("");

  const monthValue = useMemo(() => month, [month]);

  function setMonth(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    router.push(`/expenses?${sp.toString()}`);
  }

  async function load() {
    setError("");
    setLoading(true);

    const sp = new URLSearchParams();
    sp.set("month", monthValue);
    if (q.trim()) sp.set("q", q.trim());
    if (personId) sp.set("personId", personId);
    if (categoryId) sp.set("categoryId", categoryId);
    sp.set("limit", limit || "10");

    const res = await fetch(`/api/expenses?${sp.toString()}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);

    setLoading(false);

    if (!res.ok || !json?.ok) {
      setError(json?.error ?? "No se pudo cargar.");
      setItems([]);
      return;
    }

    setItems((json.data?.items ?? []) as ExpenseItem[]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
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

          <button
            type="button"
            onClick={load}
            className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
          >
            Buscar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Texto (nota)</div>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2">
              <Search size={16} className="text-[rgb(var(--subtext))]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej: super, farmacia, nafta…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Persona</div>
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

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Categoría</div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Cantidad</div>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Resultados</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
              Ordenados por monto (desc). Click para editar desde la lista en la próxima etapa.
            </div>
          </div>
          <div className="text-xs text-[rgb(var(--subtext))]">
            {loading ? "Cargando…" : `${items.length} items`}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-[rgb(var(--subtext))]">
            No hay resultados. Tocá “Buscar”.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it._id}
                className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3 hover:bg-[rgb(var(--muted))] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {it.category?.name ?? "—"} · {it.person?.name ?? "—"}
                    </div>
                    <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                      {it.date}
                      {it.note ? ` · ${it.note}` : ""}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {formatCurrencyARS(-Math.abs(it.amount))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
