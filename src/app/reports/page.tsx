import { SectionCard } from "../../components/ui/SectionCard";
import ReportsClient from "./ReportsClient";
import { getDb } from "../../lib/mongodb";

type PersonRow = { _id: string; name: string };

export default async function ReportsPage() {
  const db = await getDb();

  const peopleRaw = await db
    .collection("people")
    .find({ active: true })
    .sort({ createdAt: 1 })
    .toArray();

  const people: PersonRow[] = peopleRaw.map((p) => ({
    _id: p._id.toString(),
    name: String(p.name ?? "—"),
  }));

  return (
    <SectionCard title="Reportes" subtitle="Ingresos, gastos y balance con gráficos y top categorías.">
      <ReportsClient people={people} />
    </SectionCard>
  );
}

