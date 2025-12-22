import { SectionCard } from "../../components/ui/SectionCard";
import ExportClient from "./ExportClient";
import BackupClient from "./BackupClient";
import { getDb } from "../../lib/mongodb";

type PersonRow = { _id: string; name: string };

export default async function ExportPage() {
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
    <div className="space-y-4">
      <SectionCard
        title="Exportar CSV"
        subtitle="Descargá tus movimientos en CSV (mensual, anual y por persona)."
      >
        <ExportClient people={people} />
      </SectionCard>

      <SectionCard
        title="Backup / Restore"
        subtitle="Descargá un backup JSON completo y restauralo cuando lo necesites."
      >
        <BackupClient />
      </SectionCard>
    </div>
  );
}

