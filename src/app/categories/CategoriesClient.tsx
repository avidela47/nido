"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";

type Category = {
  _id: string;
  name: string;
  type: "income" | "expense";
};

type Props = {
  initial: Category[];
};

function normalizeName(v: string): string {
  return v.trim();
}

export default function CategoriesClient({ initial }: Props) {
  const [items, setItems] = useState<Category[]>(initial);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Category["type"]>("expense");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<Category["type"]>("expense");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const grouped = useMemo(() => {
    const income = items.filter((c) => c.type === "income");
    const expense = items.filter((c) => c.type === "expense");
    return { income, expense };
  }, [items]);

  function startEdit(c: Category) {
    setError("");
    setEditingId(c._id);
    setEditName(c.name);
    setEditType(c.type);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditType("expense");
  }

  async function createCategory() {
    setError("");
    const name = normalizeName(newName);
    if (name.length < 2) {
      setError("Poné un nombre (mínimo 2 caracteres).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: newType }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "No se pudo crear.");
        return;
      }

      const created = json.category as { _id: unknown; name: unknown; type: unknown };
      const next: Category = {
        _id: String(created._id),
        name: String(created.name),
        type: created.type === "income" ? "income" : "expense",
      };

      setItems((p) => [...p, next].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type.localeCompare(b.type))));
      setNewName("");
      setNewType("expense");
      setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    setError("");

    const name = normalizeName(editName);
    if (name.length < 2) {
      setError("Poné un nombre (mínimo 2 caracteres).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name, type: editType }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "No se pudo guardar.");
        return;
      }

      setItems((p) =>
        p
          .map((c) => (c._id === editingId ? { ...c, name, type: editType } : c))
          .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type.localeCompare(b.type)))
      );
      cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(c: Category) {
    setError("");
    const ok = window.confirm(
      `¿Borrar la categoría "${c.name}"?\n\nSi está usada en movimientos o presupuestos, el sistema no la va a dejar borrar.`
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/categories?id=${encodeURIComponent(c._id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "No se pudo borrar.");
        return;
      }
      setItems((p) => p.filter((x) => x._id !== c._id));
    } finally {
      setBusy(false);
    }
  }

  function CategoryList({ title, items }: { title: string; items: Category[] }) {
    return (
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
              {title === "Gastos" ? "Ej: Transporte, Cine, Viajes" : "Ej: Sueldo"}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-[rgb(var(--subtext))]">No hay categorías.</div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => {
              const editing = editingId === c._id;
              return (
                <div
                  key={c._id}
                  className="flex flex-col gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.name}</div>
                      <div className="text-xs text-[rgb(var(--subtext))]">{c.type === "income" ? "Ingreso" : "Gasto"}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
                        title="Editar"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(c)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                        title="Borrar"
                      >
                        <Trash2 size={16} />
                        Borrar
                      </button>
                    </div>
                  </div>

                  {editing ? (
                    <div className="grid gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-3 md:grid-cols-[1fr_160px_auto] md:items-center">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
                        placeholder="Nombre"
                      />

                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value === "income" ? "income" : "expense")}
                        className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
                      >
                        <option value="expense">Gasto</option>
                        <option value="income">Ingreso</option>
                      </select>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                        >
                          <Save size={16} />
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                          <X size={16} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold">Administrar categorías</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
              Acá podés agregar “Cine”, “Viajes” o editar “Transporte”.
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError("");
              setCreating((p) => !p);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            <Plus size={16} />
            Nueva categoría
          </button>
        </div>

        {creating ? (
          <div className="mt-3 grid gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-3 md:grid-cols-[1fr_160px_auto] md:items-center">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
              placeholder="Ej: Cine"
            />

            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value === "income" ? "income" : "expense")}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={createCategory}
                className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                <Save size={16} />
                Crear
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                  setNewType("expense");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CategoryList title="Gastos" items={grouped.expense} />
        <CategoryList title="Ingresos" items={grouped.income} />
      </div>
    </div>
  );
}
