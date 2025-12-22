import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { isYearYYYY, parseYearRangeUTC } from "../../../../lib/dateRanges";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get("year") ?? "";
    const personId = url.searchParams.get("personId") ?? "";

    if (!isYearYYYY(year)) {
      return NextResponse.json({ ok: false, error: "year inválido (YYYY)" }, { status: 400 });
    }

    const db = await getDb();
    const { start, end } = parseYearRangeUTC(year);

    const match: Record<string, unknown> = {
      deletedAt: { $exists: false },
      date: { $gte: start, $lt: end },
    };

    if (personId) {
      if (!ObjectId.isValid(personId)) {
        return NextResponse.json({ ok: false, error: "personId inválido" }, { status: 400 });
      }
      match.personId = new ObjectId(personId);
    }

    const agg = await db
      .collection("transactions")
      .aggregate([
        { $match: match },
        { $addFields: { ym: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
        { $group: { _id: { ym: "$ym", type: "$type" }, total: { $sum: "$amount" } } },
        { $sort: { "_id.ym": 1 } },
      ])
      .toArray();

    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
    const map = new Map<string, { income: number; expense: number }>();
    for (const m of months) map.set(m, { income: 0, expense: 0 });

    for (const r of agg as Array<{ _id: { ym: string; type: string }; total: number }>) {
      const ym = r._id.ym;
      const type = r._id.type;
      const cur = map.get(ym) ?? { income: 0, expense: 0 };
      if (type === "income") cur.income += Number(r.total) || 0;
      if (type === "expense") cur.expense += Number(r.total) || 0;
      map.set(ym, cur);
    }

    const series = months.map((m) => {
      const v = map.get(m) ?? { income: 0, expense: 0 };
      return { month: m, income: v.income, expense: v.expense, balance: v.income - v.expense };
    });

    const totals = series.reduce(
      (acc, x) => {
        acc.income += x.income;
        acc.expense += x.expense;
        acc.balance += x.balance;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );

    return NextResponse.json({ ok: true, data: { year, totals, series } });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
