import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

type TxType = "income" | "expense";

export type BudgetRow = {
  categoryId: string;
  categoryName: string;
  budget: number; // ARS
  spent: number; // ARS (gasto real del mes)
  remaining: number; // budget - spent
  percent: number; // 0..(puede ser >100)
  status: "none" | "ok" | "warn" | "over"; // none si budget=0
};

export type BudgetMonthly = {
  month: string; // YYYY-MM
  rows: BudgetRow[];
  totals: {
    budget: number;
    spent: number;
    remaining: number;
    percent: number; // spent / budget
  };
};

type CategoryDoc = { _id: ObjectId; name?: unknown; type?: unknown };
type BudgetDoc = { _id: ObjectId; month?: unknown; categoryId?: unknown; amount?: unknown };
type SpendAggRow = { _id: ObjectId; spent: number };

function parseMonth(month: string): { year: number; monthIndex: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error("month inválido. Formato esperado: YYYY-MM");
  const year = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(mm) || mm < 1 || mm > 12) {
    throw new Error("month inválido. Rango esperado: 01..12");
  }
  return { year, monthIndex: mm - 1 };
}

function monthRangeUTC(month: string): { start: Date; end: Date } {
  const { year, monthIndex } = parseMonth(month);
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function categoryName(c: CategoryDoc): string {
  return typeof c.name === "string" ? c.name : String(c.name ?? "—");
}

function statusFor(budget: number, spent: number): BudgetRow["status"] {
  if (budget <= 0) return "none";
  if (spent > budget) return "over";
  const pct = spent / budget;
  if (pct >= 0.8) return "warn";
  return "ok";
}

export async function getMonthlyBudgets(month: string): Promise<BudgetMonthly> {
  const db = await getDb();
  const { start, end } = monthRangeUTC(month);

  // Categorías expense
  const categories = (await db
    .collection("categories")
    .find({ type: "expense" })
    .sort({ name: 1 })
    .toArray()) as unknown as CategoryDoc[];

  // Presupuestos del mes
  const budgets = (await db
    .collection("budgets")
    .find({ month })
    .toArray()) as unknown as BudgetDoc[];

  const budgetMap = new Map<string, number>();
  for (const b of budgets) {
    const cid = b.categoryId;
    if (cid instanceof ObjectId) {
      budgetMap.set(cid.toString(), toNumber(b.amount));
    }
  }

  // Gastos reales por categoría (expense) del mes
  const spendAgg = (await db
    .collection("transactions")
    .aggregate([
      {
        $match: {
          deletedAt: { $exists: false },
          type: "expense" as TxType,
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: "$categoryId", spent: { $sum: "$amount" } } },
    ])
    .toArray()) as unknown as SpendAggRow[];

  const spentMap = new Map<string, number>();
  for (const row of spendAgg) {
    if (row._id instanceof ObjectId) spentMap.set(row._id.toString(), toNumber(row.spent));
  }

  const rows: BudgetRow[] = categories.map((c) => {
    const id = c._id.toString();
    const budget = budgetMap.get(id) ?? 0;
    const spent = spentMap.get(id) ?? 0;
    const remaining = budget - spent;
    const percent = budget > 0 ? (spent / budget) * 100 : 0;

    return {
      categoryId: id,
      categoryName: categoryName(c),
      budget,
      spent,
      remaining,
      percent,
      status: statusFor(budget, spent),
    };
  });

  const totalBudget = rows.reduce((acc, r) => acc + (r.budget > 0 ? r.budget : 0), 0);
  const totalSpent = rows.reduce((acc, r) => acc + r.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return {
    month,
    rows,
    totals: {
      budget: totalBudget,
      spent: totalSpent,
      remaining: totalRemaining,
      percent: totalPercent,
    },
  };
}

export async function upsertBudget(params: {
  month: string;
  categoryId: string;
  amount: number;
}): Promise<void> {
  const { month, categoryId, amount } = params;

  if (!/^(\d{4})-(\d{2})$/.test(month)) throw new Error("month inválido");
  if (!ObjectId.isValid(categoryId)) throw new Error("categoryId inválido");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("amount inválido");

  const db = await getDb();
  const cid = new ObjectId(categoryId);

  // Solo permitimos presupuestos para categorías expense
  const cat = await db.collection("categories").findOne({ _id: cid });
  const catType = (cat as { type?: unknown } | null)?.type;
  if (catType !== "expense") throw new Error("Solo categorías de gasto (expense)");

  await db.collection("budgets").updateOne(
    { month, categoryId: cid },
    {
      $set: {
        amount,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        month,
        categoryId: cid,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}
