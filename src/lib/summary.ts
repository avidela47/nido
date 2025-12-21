import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

type TxType = "income" | "expense";

export type MonthlySummary = {
  month: string; // YYYY-MM
  range: { start: string; end: string }; // ISO
  totals: {
    income: number;
    expense: number;
    balance: number;
  };
  byPerson: Array<{
    personId: string;
    personName: string;
    income: number;
    expense: number;
    balance: number;
  }>;
};

function parseMonth(month: string): { year: number; monthIndex: number } {
  // month: YYYY-MM
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

type TxAggRow = {
  _id: { personId: ObjectId; type: TxType };
  total: number;
};

type TotalsAggRow = {
  _id: TxType;
  total: number;
};

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
  const db = await getDb();
  const { start, end } = monthRangeUTC(month);

  // Totales (income/expense)
  const totalsAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ])
    .toArray()) as unknown as TotalsAggRow[];

  const income = totalsAgg.find((r) => r._id === "income")?.total ?? 0;
  const expense = totalsAgg.find((r) => r._id === "expense")?.total ?? 0;

  // Por persona + tipo
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
    .toArray()) as unknown as TxAggRow[];

  const personIds = Array.from(
    new Set(byPersonAgg.map((r) => r._id.personId.toString()))
  );

  const peopleDocs = await db
    .collection("people")
    .find({ _id: { $in: personIds.map((id) => new ObjectId(id)) }, active: true })
    .toArray();

  const peopleMap = new Map<string, string>(
    peopleDocs.map((p) => [p._id.toString(), String((p as { name?: unknown }).name ?? "—")])
  );

  // Construimos tabla por persona
  const personAcc = new Map<
    string,
    { personId: string; personName: string; income: number; expense: number }
  >();

  for (const row of byPersonAgg) {
    const pid = row._id.personId.toString();
    const type = row._id.type;
    const total = Number(row.total) || 0;

    const current = personAcc.get(pid) ?? {
      personId: pid,
      personName: peopleMap.get(pid) ?? "—",
      income: 0,
      expense: 0,
    };

    if (type === "income") current.income += total;
    else current.expense += total;

    personAcc.set(pid, current);
  }

  const byPerson = Array.from(personAcc.values())
    .map((p) => ({
      ...p,
      balance: p.income - p.expense,
    }))
    .sort((a, b) => a.personName.localeCompare(b.personName));

  return {
    month,
    range: { start: start.toISOString(), end: end.toISOString() },
    totals: {
      income,
      expense,
      balance: income - expense,
    },
    byPerson,
  };
}
