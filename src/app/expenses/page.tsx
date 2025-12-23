import { SectionCard } from "../../components/ui/SectionCard";
import ExpensesClient from "./ExpensesClient";
import { getDb } from "../../lib/mongodb";
import { currentMonthYYYYMM } from "../../lib/budgets";
import { Suspense } from "react";

type Person = { _id: string; name: string };
type Category = { _id: string; name: string; type: "expense" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const db = await getDb();

  const peopleRaw = await db.collection("people").find({ active: true }).sort({ createdAt: 1 }).toArray();
  const categoriesRaw = await db.collection("categories").find({ type: "expense" }).sort({ name: 1 }).toArray();

  const people: Person[] = peopleRaw.map((p) => ({ _id: p._id.toString(), name: String(p.name) }));
  const categories: Category[] = categoriesRaw.map((c) => ({
    _id: c._id.toString(),
    name: String(c.name),
    type: "expense",
  }));

  return (
    <SectionCard
      title="Top gastos"
      subtitle="Filtrá y encontrá rápidamente los gastos más grandes del mes."
    >
      <Suspense>
        <ExpensesClient month={month} people={people} categories={categories} />
      </Suspense>
    </SectionCard>
  );
}
