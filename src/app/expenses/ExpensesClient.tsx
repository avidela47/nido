"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Pencil, X, Save } from "lucide-react";
import { formatCurrencyARS } from "../../lib/format";
import InlineLoader from "../../components/ui/InlineLoader";
import EmptyState from "../../components/ui/EmptyState";
import { parseMoney, isValidDateYYYYMMDD } from "../../lib/validators";

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

type EditDraft = {
  id: string;
  date: string;
  amount: string;
  personId: string;
  categoryId: string;
  note: string;
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

  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

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

    const next = (json.data?.items ?? []) as ExpenseItem[];
    setItems(Array.isArray(next) ? next : []);
  }

  function openEdit(it: ExpenseItem) {
    setEditError("");
    setEdit({
      id: it._id,
      date: it.date,
      amount: String(Math.abs(it.amount)),
      personId: it.person?._id ?? "",
      categoryId: it.category?._id ?? "",
      note: it.note ?? "",
    });
  }

  function validateEdit(d: EditDraft): string | null {
    if (!isValidDateYYYYMMDD(d.date)) return "Fecha inválida.";
    const amountNum = parseMoney(d.amount);
    if (amountNum === null) return "Monto inválido.";
    if (!d.personId) return "Seleccioná persona.";
    if (!d.categoryId) return "Seleccioná categoría.";
    return null;
  }

  async function saveEdit() {
    if (!edit) return;

    setEditError("");
    const msg = validateEdit(edit);
    if (msg) return setEditError(msg);

    const amountNum = parseMoney(edit.amount)!;

    setSaving(true);

    const res = await fetch(`/api/transactions/${encodeURIComponent(edit.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "expense",
        date: edit.date,
        amount: amountNum,
        personId: edit.personId,
        categoryId: edit.categoryId,
        note: edit.note ?? "",
      }),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !json?.ok) {
      setEditError(json?.error ?? "No se pudo guardar.");
      return;
    }

    setEdit(null);
    await load();
    router.refresh();
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
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Ordenados por monto (desc).</div>
          </div>
          <div className="text-xs text-[rgb(var(--subtext))]">{loading ? "…" : `${items.length} items`}</div>
        </div>

        {loading ? (
          <InlineLoader label="Cargando gastos…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description="No hay gastos para este filtro/mes. Tocá “Buscar” o cargá un movimiento nuevo."
            actionLabel="Nuevo movimiento"
            actionHref="/transactions/new"
          />
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

                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatCurrencyARS(-Math.abs(it.amount))}
                    </div>

                    <button
                      type="button"
                      onClick={() => openEdit(it)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold hover:bg-[rgb(var(--muted))]"
                      title="Editar"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {edit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Editar gasto</div>
                <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                  ID: <span className="font-mono">{edit.id}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEdit(null)}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Fecha</div>
                <input
                  type="date"
                  value={edit.date}
                  onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Monto (ARS)</div>
                <input
                  value={edit.amount}
                  onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Persona</div>
                <select
                  value={edit.personId}
                  onChange={(e) => setEdit({ ...edit, personId: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar…</option>
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
                  value={edit.categoryId}
                  onChange={(e) => setEdit({ ...edit, categoryId: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Nota</div>
                <input
                  value={edit.note}
                  onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                  placeholder="Ej: compras semanales"
                  className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            {editError ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {editError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-semibold hover:bg-[rgb(var(--muted))]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                <Save size={16} />
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
