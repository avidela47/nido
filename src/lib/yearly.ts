import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";
import { TxType, PersonSummaryRow } from "./types";

export type YearlySummary = {
  year: number;
  totals: { income: number; expense: number; balance: number };
  byMonth: Array<{
    month: string; // YYYY-MM
    income: number;
    expense: number;
    balance: number;
  }>;
  byPerson: PersonSummaryRow[];
};

function yearRangeUTC(year: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
  return { start, end };
}

type TotalsRow = { _id: TxType; total: number };
type ByMonthRow = { _id: { m: number; type: TxType }; total: number };
type ByPersonRow = { _id: { personId?: ObjectId | null; type: TxType }; total: number };

export async function getYearlySummary(year: number): Promise<YearlySummary> {
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    throw new Error("Año inválido");
  }
  const db = await getDb();
  const { start, end } = yearRangeUTC(year);

  // Totales año
  const totalsAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { deletedAt: { $exists: false }, type: { $in: ["income", "expense"] }, date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ])
    .toArray()) as unknown as TotalsRow[];

  const income = Math.abs(totalsAgg.find((r) => r._id === "income")?.total ?? 0);
  const expense = Math.abs(totalsAgg.find((r) => r._id === "expense")?.total ?? 0);

  // Por mes
  const byMonthAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { deletedAt: { $exists: false }, type: { $in: ["income", "expense"] }, date: { $gte: start, $lt: end } } },
      { $project: { m: { $month: "$date" }, type: "$type", amount: "$amount" } },
      { $group: { _id: { m: "$m", type: "$type" }, total: { $sum: "$amount" } } },
    ])
    .toArray()) as unknown as ByMonthRow[];

  const byMonth = Array.from({ length: 12 }).map((_, idx) => {
    const m = idx + 1; // $month returns 1..12
    const month = `${year}-${String(m).padStart(2, "0")}`;
    const inc = Math.abs(byMonthAgg.find((r) => r._id.m === m && r._id.type === "income")?.total ?? 0);
    const exp = Math.abs(byMonthAgg.find((r) => r._id.m === m && r._id.type === "expense")?.total ?? 0);
    return { month, income: inc, expense: exp, balance: inc - exp };
  });

  // Por persona: resolvemos person por tx.personId o por la cuenta
  // y convertimos transfer + transferSide a income/expense según corresponda.
  const byPersonAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { deletedAt: { $exists: false }, date: { $gte: start, $lt: end } } },
      {
        $lookup: {
          from: "accounts",
          localField: "accountId",
          foreignField: "_id",
          as: "_acc",
        },
      },
      { $unwind: { path: "$_acc", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          resolvedPersonId: { $cond: [{ $ifNull: ["$personId", false] }, "$personId", "$_acc.person"] },
          resolvedType: {
            $cond: [
              { $eq: ["$type", "transfer"] },
              {
                $cond: [
                  { $eq: ["$transferSide", "in"] },
                  "income",
                  {
                    $cond: [{ $eq: ["$transferSide", "out"] }, "expense", "$type"]
                  }
                ]
              },
              "$type",
            ],
          },
        },
      },
      { $match: { resolvedPersonId: { $exists: true, $ne: null } } },
      { $group: { _id: { personId: "$resolvedPersonId", type: "$resolvedType" }, total: { $sum: "$amount" } } },
    ])
    .toArray()) as unknown as ByPersonRow[];

  const personIds = Array.from(
    new Set(
      byPersonAgg
        .map((r) => (r._id.personId instanceof ObjectId ? r._id.personId.toString() : ""))
        .filter(Boolean)
    )
  );

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
    if (!(row._id.personId instanceof ObjectId)) continue;
    const pid = row._id.personId.toString();
    const type = row._id.type;
    const total = Math.abs(Number(row.total) || 0);

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
