import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export type PersonBudgetRow = {
  personId: string;
  personName: string;
  budget: number;
  spent: number;
  remaining: number;
  percent: number;
  status: "none" | "ok" | "warn" | "over";
};

export type PersonBudgetMonthly = {
  month: string;
  rows: PersonBudgetRow[];
  totals: {
    budget: number;
    spent: number;
    remaining: number;
    percent: number;
  };
};

type PersonDoc = { _id: ObjectId; name?: unknown; active?: unknown };
type BudgetDoc = { _id: ObjectId; month?: unknown; personId?: unknown; amount?: unknown };
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

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function personName(p: PersonDoc): string {
  return typeof p.name === "string" ? p.name : String(p.name ?? "—");
}

function statusFor(budget: number, spent: number): PersonBudgetRow["status"] {
  if (budget <= 0) return "none";
  if (spent > budget) return "over";
  const pct = spent / budget;
  if (pct >= 0.8) return "warn";
  return "ok";
}

export async function getMonthlyPersonBudgets(month: string): Promise<PersonBudgetMonthly> {
  const db = await getDb();
  const { start, end } = monthRangeUTC(month);

  const people = (await db
    .collection("people")
    .find({ active: true })
    .sort({ createdAt: 1 })
    .toArray()) as unknown as PersonDoc[];

  const budgets = (await db
    .collection("person_budgets")
    .find({ month })
    .toArray()) as unknown as BudgetDoc[];

  const budgetMap = new Map<string, number>();
  for (const b of budgets) {
    const pid = b.personId;
    if (pid instanceof ObjectId) {
      budgetMap.set(pid.toString(), toNumber(b.amount));
    }
  }

  const spendAgg = (await db
    .collection("transactions")
    .aggregate([
      {
        $match: {
          deletedAt: { $exists: false },
          type: "expense",
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: "$personId", spent: { $sum: "$amount" } } },
    ])
    .toArray()) as unknown as SpendAggRow[];

  const spentMap = new Map<string, number>();
  for (const row of spendAgg) {
    if (row._id instanceof ObjectId) spentMap.set(row._id.toString(), toNumber(row.spent));
  }

  const rows: PersonBudgetRow[] = people.map((p) => {
    const id = p._id.toString();
    const budget = budgetMap.get(id) ?? 0;
    const spent = spentMap.get(id) ?? 0;
    const remaining = budget - spent;
    const percent = budget > 0 ? (spent / budget) * 100 : 0;

    return {
      personId: id,
      personName: personName(p),
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

export async function upsertPersonBudget(params: {
  month: string;
  personId: string;
  amount: number;
}): Promise<void> {
  const { month, personId, amount } = params;

  if (!/^(\d{4})-(\d{2})$/.test(month)) throw new Error("month inválido");
  if (!ObjectId.isValid(personId)) throw new Error("personId inválido");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("amount inválido");

  const db = await getDb();
  const pid = new ObjectId(personId);

  const person = await db.collection("people").findOne({ _id: pid, active: true });
  if (!person) throw new Error("La persona no existe o no está activa");

  await db.collection("person_budgets").updateOne(
    { month, personId: pid },
    {
      $set: { amount, updatedAt: new Date() },
      $setOnInsert: { month, personId: pid, createdAt: new Date() },
    },
    { upsert: true }
  );
}
