import { SectionCard } from "../../components/ui/SectionCard";
import BudgetsClient from "./BudgetsClient";
import { getDb } from "../../lib/mongodb";
import { currentMonthYYYYMM } from "../../lib/budgets";
import { parseMonthRangeUTC } from "../../lib/dateRanges";
import { ObjectId } from "mongodb";
import { Suspense } from "react";

type CategoryRow = { _id: string; name: string };
type SpentRow = { categoryId: string; spent: number };

// Usa helper compartido para obtener el rango UTC del mes (YYYY-MM)
const parseMonth = parseMonthRangeUTC;

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const { start, end } = parseMonth(month);

  const db = await getDb();

  // 1) Categorías de gasto
  const categoriesRaw = await db
    .collection("categories")
    .find({ type: "expense" })
    .sort({ name: 1 })
    .toArray();

  const categories: CategoryRow[] = categoriesRaw.map((c) => ({
    _id: c._id.toString(),
    name: String(c.name ?? "—"),
  }));

  // 2) Gastado por categoría (transactions)
  const spentAgg = (await db
    .collection("transactions")
    .aggregate([
      {
        $match: {
          deletedAt: { $exists: false },
          type: "expense",
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          spent: { $sum: "$amount" },
        },
      },
    ])
    .toArray()) as unknown as Array<{ _id: ObjectId; spent: number }>;

  const spentByCategory: SpentRow[] = spentAgg
    .filter((r) => r._id)
    .map((r) => ({
      categoryId: r._id.toString(),
      spent: Number(r.spent) || 0,
    }));

  return (
    <SectionCard
      title="Presupuestos"
      subtitle="Definí presupuesto por categoría y mes. Semáforo automático según consumo."
    >
      <Suspense>
        <BudgetsClient month={month} categories={categories} spentByCategory={spentByCategory} />
      </Suspense>
    </SectionCard>
  );
}
