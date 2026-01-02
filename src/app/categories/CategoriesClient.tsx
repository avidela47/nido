"use client";

import { useState } from "react";
import { Trash2, Pencil } from "lucide-react";
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
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-start bg-gray-50">
  <div className="w-full px-0 pt-0 pb-10">
        <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Categorías</h2>
          <p className="text-gray-500 text-sm mb-6">Gestioná tus categorías de gastos e ingresos.</p>
          <form
            onSubmit={e => {
              e.preventDefault();
              // Aquí podrías agregar la lógica para crear una categoría
            }}
            className="flex gap-3 items-center mb-6"
          >
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nombre de la categoría"
              className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              disabled={busy}
            />
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as Category["type"])}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              disabled={busy}
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
            <button
              type="submit"
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60 transition"
              disabled={busy}
            >Agregar</button>
          </form>
          {items.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No hay categorías.</div>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((c) => (
                <li key={c._id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0 flex-1">
                    <span className={`inline-block w-2 h-2 rounded-full mt-1 sm:mt-0 ${c.type === "income" ? "bg-emerald-400" : "bg-blue-400"}`}></span>
                    <span className="font-semibold text-gray-900 text-base truncate">{c.name}</span>
                    <span className="text-xs text-gray-500 ml-0 sm:ml-2">Tipo: {c.type === "income" ? "Ingreso" : "Gasto"}</span>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                      title="Editar"
                      disabled={busy}
                    >
                      <Pencil size={15} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(c)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition"
                      title="Borrar"
                    >
                      <Trash2 size={15} />
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
