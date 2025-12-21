import { SectionCard } from "../../components/ui/SectionCard";
import { getDb } from "../../lib/mongodb";
import PeopleClient from "./PeopleClient";

type Person = {
  _id: string;
  name: string;
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
  }));

  return (
    <SectionCard title="Personas" subtitle="Quiénes participan en el hogar">
      <PeopleClient initialPeople={people} />
    </SectionCard>
  );
}
