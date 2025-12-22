import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { isMonthYYYYMM, monthAdd, parseMonthRangeUTC } from "../../../../lib/dateRanges";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId") ?? "";
    const startMonth = url.searchParams.get("startMonth") ?? "";
    const months = Number(url.searchParams.get("months") ?? "12");
    const personId = url.searchParams.get("personId") ?? "";

    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json({ ok: false, error: "categoryId inválido" }, { status: 400 });
    }
    if (!isMonthYYYYMM(startMonth)) {
      return NextResponse.json({ ok: false, error: "startMonth inválido (YYYY-MM)" }, { status: 400 });
    }
    if (!Number.isFinite(months) || months < 1 || months > 36) {
      return NextResponse.json({ ok: false, error: "months inválido (1..36)" }, { status: 400 });
    }

    const db = await getDb();

    // rango global
    const endMonth = monthAdd(startMonth, months);
    const { start } = parseMonthRangeUTC(startMonth);
    const { start: end } = parseMonthRangeUTC(endMonth);

    const match: Record<string, unknown> = {
      deletedAt: { $exists: false },
      type: "expense",
      categoryId: new ObjectId(categoryId),
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
        { $group: { _id: "$ym", spent: { $sum: "$amount" } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const map = new Map<string, number>();
    for (const r of agg as Array<{ _id: string; spent: number }>) {
      map.set(r._id, Number(r.spent) || 0);
    }

    // completar meses faltantes con 0
    const series: Array<{ month: string; spent: number }> = [];
    for (let i = 0; i < months; i++) {
      const m = monthAdd(startMonth, i);
      series.push({ month: m, spent: map.get(m) ?? 0 });
    }

    return NextResponse.json({ ok: true, data: { categoryId, startMonth, months, series } });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
