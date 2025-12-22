import { SectionCard } from "../../../components/ui/SectionCard";
import AdvancedReportsClient from "./AdvancedReportsClient";
import { getDb } from "../../../lib/mongodb";

type PersonRow = { _id: string; name: string };
type CategoryRow = { _id: string; name: string };

export default async function AdvancedReportsPage() {
  const db = await getDb();

  const [peopleRaw, categoriesRaw] = await Promise.all([
    db.collection("people").find({ active: true }).sort({ createdAt: 1 }).toArray(),
    db.collection("categories").find({ active: { $ne: false } }).sort({ createdAt: 1 }).toArray(),
  ]);

  const people: PersonRow[] = peopleRaw.map((p) => ({ _id: p._id.toString(), name: String(p.name ?? "—") }));
  const categories: CategoryRow[] = categoriesRaw.map((c) => ({ _id: c._id.toString(), name: String(c.name ?? "—") }));

  return (
    <SectionCard
      title="Reportes avanzados"
      subtitle="Comparar meses, tendencia por categoría, balance anual y export de gráficos."
    >
      <AdvancedReportsClient people={people} categories={categories} />
    </SectionCard>
  );
}
