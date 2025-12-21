import { SectionCard } from "../../components/ui/SectionCard";
import { getDb } from "../../lib/mongodb";

type Category = {
  _id: string;
  name: string;
  type: "income" | "expense";
};

export default async function CategoriesPage() {
  const db = await getDb();

  const raw = await db
    .collection("categories")
    .find({})
    .sort({ type: 1, name: 1 })
    .toArray();

  const categories: Category[] = raw.map((c) => ({
    _id: c._id.toString(),
    name: String(c.name),
    type: c.type === "income" ? "income" : "expense",
  }));

  return (
    <SectionCard title="Categorías" subtitle="Clasificación de ingresos y gastos">
      <div className="space-y-3">
        {categories.map((c) => (
          <div
            key={c._id}
            className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm font-semibold"
          >
            <span>{c.name}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                c.type === "income"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {c.type === "income" ? "Ingreso" : "Gasto"}
            </span>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-sm text-[rgb(var(--subtext))]">
            No hay categorías cargadas.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

