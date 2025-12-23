import { SectionCard } from "../../components/ui/SectionCard";
import BudgetsClient from "./BudgetsClient";
import { getDb } from "../../lib/mongodb";
import { currentMonthYYYYMM } from "../../lib/budgets";
import { ObjectId } from "mongodb";
import { Suspense } from "react";

type CategoryRow = { _id: string; name: string };
type BudgetRow = { _id: string; categoryId: string; amount: number };
type SpentRow = { categoryId: string; spent: number };

function parseMonth(month: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return { start: new Date(Date.UTC(1970, 0, 1)), end: new Date(Date.UTC(1970, 0, 2)) };

  const year = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(mm) || mm < 1 || mm > 12) {
    return { start: new Date(Date.UTC(1970, 0, 1)), end: new Date(Date.UTC(1970, 0, 2)) };
  }

  const start = new Date(Date.UTC(year, mm - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mm, 1, 0, 0, 0, 0));
  return { start, end };
}

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

  // 2) Presupuestos del mes
  const budgetsRaw = await db.collection("budgets").find({ month }).toArray();

  const budgets: BudgetRow[] = budgetsRaw
    .map((b) => ({
      _id: b._id?.toString?.() ? String(b._id.toString()) : "",
      categoryId: b.categoryId?.toString?.() ? String(b.categoryId.toString()) : "",
      amount: Number(b.amount) || 0,
    }))
    .filter((b) => b._id && b.categoryId);

  // 3) Gastado por categoría (transactions)
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
        <BudgetsClient month={month} categories={categories} budgets={budgets} spentByCategory={spentByCategory} />
      </Suspense>
    </SectionCard>
  );
}
