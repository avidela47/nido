import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";

type AggRow = {
  _id: { year: number; month: number; type: "income" | "expense" };
  total: number;
};

function escCsv(v: string): string {
  if (v.includes('"') || v.includes(",") || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const yearStr = url.searchParams.get("year");
    if (!yearStr) return NextResponse.json({ ok: false, error: "year requerido" }, { status: 400 });

    const year = Number(yearStr);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ ok: false, error: "year inválido" }, { status: 400 });
    }

    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

    const db = await getDb();

    const agg = (await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            date: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              type: "$type",
            },
            total: { $sum: "$amount" },
          },
        },
      ])
      .toArray()) as unknown as AggRow[];

    const map = new Map<string, { income: number; expense: number }>();
    for (let m = 1; m <= 12; m++) map.set(monthKey(year, m), { income: 0, expense: 0 });

    for (const r of agg) {
      const k = monthKey(r._id.year, r._id.month);
      const obj = map.get(k) ?? { income: 0, expense: 0 };
      if (r._id.type === "income") obj.income += r.total;
      if (r._id.type === "expense") obj.expense += r.total;
      map.set(k, obj);
    }

    const header = ["month", "income", "expense", "balance"].join(",");

    let totalIncome = 0;
    let totalExpense = 0;

    const lines: string[] = [];
    for (let m = 1; m <= 12; m++) {
      const k = monthKey(year, m);
      const v = map.get(k) ?? { income: 0, expense: 0 };
      const balance = v.income - v.expense;

      totalIncome += v.income;
      totalExpense += v.expense;

      lines.push(
        [escCsv(k), escCsv(String(v.income)), escCsv(String(v.expense)), escCsv(String(balance))].join(",")
      );
    }

    const totalBalance = totalIncome - totalExpense;
    lines.push(
      [escCsv("TOTAL"), escCsv(String(totalIncome)), escCsv(String(totalExpense)), escCsv(String(totalBalance))].join(",")
    );

    const csv = [header, ...lines].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nido-balance-${year}.csv"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
