import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";

type TxType = "income" | "expense";

export type YearlySummary = {
  year: number;
  totals: { income: number; expense: number; balance: number };
  byMonth: Array<{
    month: string; // YYYY-MM
    income: number;
    expense: number;
    balance: number;
  }>;
  byPerson: Array<{
    personId: string;
    personName: string;
    income: number;
    expense: number;
    balance: number;
  }>;
};

function yearRangeUTC(year: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
  return { start, end };
}

type TotalsRow = { _id: TxType; total: number };
type ByMonthRow = { _id: { m: number; type: TxType }; total: number };
type ByPersonRow = { _id: { personId: ObjectId; type: TxType }; total: number };

export async function getYearlySummary(year: number): Promise<YearlySummary> {
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    throw new Error("Año inválido");
  }

  const db = await getDb();
  const { start, end } = yearRangeUTC(year);

  const totalsAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ])
    .toArray()) as unknown as TotalsRow[];

  const income = totalsAgg.find((r) => r._id === "income")?.total ?? 0;
  const expense = totalsAgg.find((r) => r._id === "expense")?.total ?? 0;

  const byMonthAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { m: { $month: "$date" }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ])
    .toArray()) as unknown as ByMonthRow[];

  // 12 meses siempre
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const month = `${year}-${String(m).padStart(2, "0")}`;

    const inc = byMonthAgg.find((r) => r._id.m === m && r._id.type === "income")?.total ?? 0;
    const exp = byMonthAgg.find((r) => r._id.m === m && r._id.type === "expense")?.total ?? 0;

    return { month, income: inc, expense: exp, balance: inc - exp };
  });

  const byPersonAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { personId: "$personId", type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ])
    .toArray()) as unknown as ByPersonRow[];

  const personIds = Array.from(new Set(byPersonAgg.map((r) => r._id.personId.toString())));

  const peopleDocs = await db
    .collection("people")
    .find({ _id: { $in: personIds.map((id) => new ObjectId(id)) }, active: true })
    .toArray();

  const peopleMap = new Map<string, string>(
    peopleDocs.map((p) => [p._id.toString(), String((p as { name?: unknown }).name ?? "—")])
  );

  const personAcc = new Map<
    string,
    { personId: string; personName: string; income: number; expense: number }
  >();

  for (const row of byPersonAgg) {
    const pid = row._id.personId.toString();
    const type = row._id.type;
    const total = Number(row.total) || 0;

    const cur = personAcc.get(pid) ?? {
      personId: pid,
      personName: peopleMap.get(pid) ?? "—",
      income: 0,
      expense: 0,
    };

    if (type === "income") cur.income += total;
    else cur.expense += total;

    personAcc.set(pid, cur);
  }

  const byPerson = Array.from(personAcc.values())
    .map((p) => ({ ...p, balance: p.income - p.expense }))
    .sort((a, b) => b.balance - a.balance);

  return {
    year,
    totals: { income, expense, balance: income - expense },
    byMonth,
    byPerson,
  };
}
