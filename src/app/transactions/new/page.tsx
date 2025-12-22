import { SectionCard } from "../../../components/ui/SectionCard";
import NewTransactionClient from "./NewTransactionClient";
import { getDb } from "../../../lib/mongodb";

type PersonRow = { _id: string; name: string };
type CategoryRow = { _id: string; name: string; type: "income" | "expense" };

export default async function NewTransactionPage() {
  const db = await getDb();

  const peopleRaw = await db.collection("people").find({ active: true }).sort({ createdAt: 1 }).toArray();
  const people: PersonRow[] = peopleRaw.map((p) => ({ _id: p._id.toString(), name: String(p.name ?? "—") }));

  const categoriesRaw = await db.collection("categories").find({}).sort({ type: 1, name: 1 }).toArray();
  const categories: CategoryRow[] = categoriesRaw.map((c) => ({
    _id: c._id.toString(),
    name: String(c.name ?? "—"),
    type: (c.type === "income" ? "income" : "expense") as "income" | "expense",
  }));

  return (
    <SectionCard
      title="Nuevo movimiento"
      subtitle="Registrá ingresos y gastos. MVP: imputación simple (un gasto → una persona)."
    >
      <NewTransactionClient people={people} categories={categories} />
    </SectionCard>
  );
}
