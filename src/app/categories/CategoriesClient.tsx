"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useToast } from "../../components/ui/Toast";

type Category = {
  _id: string;
  name: string;
  type: "income" | "expense";
};

type Props = { initial: Category[] };

export default function CategoriesClient({ initial }: Props) {
  const toast = useToast();
  const [items, setItems] = useState<Category[]>(initial);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Category["type"]>("expense");
  const [busy, setBusy] = useState(false);

  async function deleteCategory(c: Category) {
    setBusy(true);
    try {
      const res = await fetch(`/api/categories?id=${encodeURIComponent(c._id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.push({ title: "Error al borrar categoría", description: json?.error ?? "No se pudo borrar.", variant: "error" });
        return;
      }
      setItems((p) => p.filter((x) => x._id !== c._id));
      toast.push({ title: "Categoría borrada", description: "La categoría fue eliminada correctamente.", variant: "ok" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-center w-full py-8 bg-gray-50 min-h-[80vh]">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-md border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Categorías</h2>
        <p className="text-gray-500 text-sm mb-6">Gestioná tus categorías de gastos e ingresos.</p>
        <form
          onSubmit={e => {
            e.preventDefault();
            // Aquí podrías agregar la lógica para crear una categoría
          }}
          className="flex flex-col sm:flex-row gap-2 items-center mb-6"
        >
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
            disabled={busy}
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as Category["type"])}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
            disabled={busy}
          >
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60 transition"
            disabled={busy}
          >Agregar</button>
        </form>
        {items.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No hay categorías.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((c) => (
              <li key={c._id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-block w-2 h-2 rounded-full ${c.type === "income" ? "bg-emerald-400" : "bg-blue-400"}`}></span>
                  <span className="font-medium text-gray-900 text-base truncate">{c.name}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.type === "income" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                    {c.type === "income" ? "Ingreso" : "Gasto"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCategory(c)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-60 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition"
                  title="Borrar"
                >
                  <Trash2 size={16} />
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}