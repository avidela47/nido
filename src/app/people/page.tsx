import { SectionCard } from "../../components/ui/SectionCard";
import { getDb } from "../../lib/mongodb";
import PeopleClient from "./PeopleClient";
import { ObjectId } from "mongodb";

type Person = {
  _id: string;
  name: string;
  txCount: number;
};

export default async function PeoplePage() {
  const db = await getDb();

  const peopleRaw = await db
    .collection("people")
    .find({ active: true })
    .sort({ createdAt: 1 })
    .toArray();

  const people: Person[] = peopleRaw.map((p) => ({
    _id: p._id.toString(),
    name: String(p.name),
    txCount: 0,
  }));

  // Conteo de movimientos por persona (para explicar por qué no se puede borrar)
  const ids = people.map((p) => p._id).filter((id) => ObjectId.isValid(id));
  const counts = (await db
    .collection("transactions")
    .aggregate([
      {
        $match: {
          deletedAt: { $exists: false },
          personId: { $in: ids.map((id) => new ObjectId(id)) },
        },
      },
      { $group: { _id: "$personId", count: { $sum: 1 } } },
    ])
    .toArray()) as unknown as Array<{ _id: ObjectId; count: number }>;

  const countMap = new Map<string, number>();
  for (const row of counts) countMap.set(row._id.toString(), Number(row.count) || 0);

  for (const p of people) p.txCount = countMap.get(p._id) ?? 0;

  return (
    <SectionCard title="Personas" subtitle="Quiénes participan en el hogar">
      <PeopleClient initialPeople={people} />
    </SectionCard>
  );
}
