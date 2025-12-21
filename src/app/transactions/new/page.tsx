import { SectionCard } from "../../../components/ui/SectionCard";
import { getDb } from "../../../lib/mongodb";
import NewTransactionClient from "./NewTransactionClient";

type Person = { _id: string; name: string };
type Category = { _id: string; name: string; type: "income" | "expense" };

function defaultDateFromMonth(month?: string): string {
  if (!month) return new Date().toISOString().slice(0, 10);
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return new Date().toISOString().slice(0, 10);
  return `${m[1]}-${m[2]}-01`;
}

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const month = searchParams?.month;

  const db = await getDb();

  const peopleRaw = await db
    .collection("people")
    .find({ active: true })
    .sort({ createdAt: 1 })
    .toArray();

  const categoriesRaw = await db
    .collection("categories")
    .find({})
    .sort({ type: 1, name: 1 })
    .toArray();

  const people: Person[] = peopleRaw.map((p) => ({
    _id: p._id.toString(),
    name: String(p.name),
  }));

  const categories: Category[] = categoriesRaw.map((c) => ({
    _id: c._id.toString(),
    name: String(c.name),
    type: c.type === "income" ? "income" : "expense",
  }));

  return (
    <SectionCard title="Nueva transacción" subtitle="Ingreso o gasto imputado a una persona">
      <NewTransactionClient
        people={people}
        categories={categories}
        defaultDate={defaultDateFromMonth(month)}
        backMonth={month ?? ""}
      />
    </SectionCard>
  );
}
