import { SectionCard } from "../../components/ui/SectionCard";
import PeopleSummaryClient from "./PeopleSummaryClient";
import { getDb } from "../../lib/mongodb";
import { currentMonthYYYYMM } from "../../lib/budgets";
import { ObjectId } from "mongodb";
import { Suspense } from "react";

type PersonRow = { _id: string; name: string };

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

type AggRow = {
  _id: { personId: ObjectId; type: "income" | "expense" };
  total: number;
};

export default async function PeopleSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const { start, end } = parseMonth(month);

  const db = await getDb();

  const peopleRaw = await db.collection("people").find({ active: true }).sort({ createdAt: 1 }).toArray();
  const people: PersonRow[] = peopleRaw.map((p) => ({ _id: p._id.toString(), name: String(p.name ?? "—") }));

  const agg = (await db
    .collection("transactions")
    .aggregate([
      {
        $match: {
          deletedAt: { $exists: false },
          date: { $gte: start, $lt: end },
          personId: { $exists: true },
        },
      },
      {
        $group: {
          _id: { personId: "$personId", type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ])
    .toArray()) as unknown as AggRow[];

  // Build maps
  const map = new Map<string, { income: number; expense: number }>();
  for (const p of people) map.set(p._id, { income: 0, expense: 0 });

  for (const r of agg) {
    const pid = r._id.personId?.toString?.() ? r._id.personId.toString() : "";
    if (!pid) continue;

    const obj = map.get(pid) ?? { income: 0, expense: 0 };
    if (r._id.type === "income") obj.income += Number(r.total) || 0;
    if (r._id.type === "expense") obj.expense += Number(r.total) || 0;
    map.set(pid, obj);
  }

  const rows = people.map((p) => {
    const v = map.get(p._id) ?? { income: 0, expense: 0 };
    return { personId: p._id, name: p.name, income: v.income, expense: v.expense, balance: v.income - v.expense };
  });

  return (
    <SectionCard
      title="Resumen por persona"
      subtitle="Ingresos, gastos y balance mensual por cada integrante."
    >
      <Suspense>
        <PeopleSummaryClient month={month} rows={rows} />
      </Suspense>
    </SectionCard>
  );
}
