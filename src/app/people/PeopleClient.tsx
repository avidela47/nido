"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, Trash2, X } from "lucide-react";
import PersonSummaryModal from "./PersonSummaryModal";

type Person = {
  _id: string;
  name: string;
  txCount?: number;
};

export default function PeopleClient({ initialPeople }: { initialPeople: Person[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [openSummaryId, setOpenSummaryId] = useState<string | null>(null);

  async function addPerson() {
    setError("");
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setLoading(false);
      setError(json?.error ?? "No se pudo agregar.");
      return;
    }

    setLoading(false);
    setName("");
    router.refresh();
  }

  function startEdit(p: Person) {
    setError("");
    setEditingId(p._id);
    setEditName(p.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit() {
    if (!editingId) return;
    setError("");
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Nombre inválido.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/people", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name: trimmed }),
    });
    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !json?.ok) {
      setError(json?.error ?? "No se pudo guardar.");
      return;
    }

    cancelEdit();
    router.refresh();
  }

  async function deletePerson(p: Person) {
    setError("");

    const tx = Number(p.txCount) || 0;
    const ok = window.confirm(
      tx > 0
        ? `"${p.name}" tiene ${tx} movimiento(s).\n\nNo se recomienda borrar personas con movimientos; el sistema probablemente lo bloquee. ¿Querés intentar igual?`
        : `¿Borrar a "${p.name}"?`
    );
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/people?id=${encodeURIComponent(p._id)}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !json?.ok) {
      setError(json?.error ?? "No se pudo borrar.");
      return;
    }

    if (editingId === p._id) cancelEdit();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PersonSummaryModal
        person={initialPeople.find((p) => p._id === openSummaryId) ?? null}
        open={!!openSummaryId}
        onClose={() => setOpenSummaryId(null)}
      />

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la persona"
          className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={addPerson}
          disabled={loading}
          className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
        >
          Agregar
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        {initialPeople.map((p) => (
          <div
            key={p._id}
            className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setOpenSummaryId(p._id)}
                  className="truncate text-left font-semibold hover:underline"
                  title="Ver resumen"
                >
                  {p.name}
                </button>
                <div className="mt-0.5 text-xs text-[rgb(var(--subtext))]">
                  Movimientos: <span className="font-semibold tabular-nums">{Number(p.txCount) || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  <Pencil size={16} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deletePerson(p)}
                  disabled={loading || (Number(p.txCount) || 0) > 0}
                  className={[
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold disabled:opacity-60",
                    (Number(p.txCount) || 0) > 0
                      ? "border-[rgb(var(--border))] bg-[rgb(var(--muted))] text-[rgb(var(--subtext))]"
                      : "border-red-200 bg-red-50 text-red-700",
                  ].join(" ")}
                  title={(Number(p.txCount) || 0) > 0 ? "No se puede borrar: tiene movimientos" : "Borrar"}
                >
                  <Trash2 size={16} />
                  {(Number(p.txCount) || 0) > 0 ? "No se puede borrar" : "Borrar"}
                </button>
              </div>
            </div>

            {(Number(p.txCount) || 0) > 0 ? (
              <div className="mt-2 text-xs text-[rgb(var(--subtext))]">
                Para borrar esta persona, primero reasigná o eliminá sus movimientos.
              </div>
            ) : null}

            {editingId === p._id ? (
              <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-3 md:flex-row md:items-center">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
                  placeholder="Nombre"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                  >
                    <Save size={16} />
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {initialPeople.length === 0 && (
          <div className="text-sm text-[rgb(var(--subtext))]">
            No hay personas cargadas.
          </div>
        )}
      </div>
    </div>
  );
}
