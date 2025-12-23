import { SectionCard } from "../../components/ui/SectionCard";
import { getDb } from "../../lib/mongodb";
import CategoriesClient from "./CategoriesClient";

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
      <CategoriesClient initial={categories} />
    </SectionCard>
  );
}

