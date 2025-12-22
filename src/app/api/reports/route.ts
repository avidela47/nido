import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

function isMonthYYYYMM(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v);
}

function parseMonthRange(month: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return { start: new Date(Date.UTC(1970, 0, 1)), end: new Date(Date.UTC(1970, 0, 2)) };
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const start = new Date(Date.UTC(y, mm - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, mm, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? "";
    const personId = url.searchParams.get("personId") ?? "";

    if (!isMonthYYYYMM(month)) {
      return NextResponse.json({ ok: false, error: "month inválido (YYYY-MM)" }, { status: 400 });
    }

    const { start, end } = parseMonthRange(month);

    const db = await getDb();

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

    // Totales income/expense
    const totalsAgg = await db
      .collection("transactions")
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ])
      .toArray();

    let income = 0;
    let expense = 0;
    for (const r of totalsAgg as Array<{ _id: string; total: number }>) {
      if (r._id === "income") income = Number(r.total) || 0;
      if (r._id === "expense") expense = Number(r.total) || 0;
    }

    // Serie diaria
    const dailyAgg = await db
      .collection("transactions")
      .aggregate([
        { $match: match },
        {
          $addFields: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          },
        },
        {
          $group: {
            _id: { day: "$day", type: "$type" },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.day": 1 } },
      ])
      .toArray();

    const dayMap = new Map<string, { day: string; income: number; expense: number }>();
    for (const r of dailyAgg as Array<{ _id: { day: string; type: string }; total: number }>) {
      const day = r._id.day;
      const type = r._id.type;
      const cur = dayMap.get(day) ?? { day, income: 0, expense: 0 };
      if (type === "income") cur.income += Number(r.total) || 0;
      if (type === "expense") cur.expense += Number(r.total) || 0;
      dayMap.set(day, cur);
    }

    const series = Array.from(dayMap.values()).map((d) => ({
      day: d.day,
      income: d.income,
      expense: d.expense,
      balance: d.income - d.expense,
    }));

    // Top categorías de gasto
    const topCatsAgg = await db
      .collection("transactions")
      .aggregate([
        { $match: { ...match, type: "expense" } },
        {
          $group: {
            _id: "$categoryId",
            spent: { $sum: "$amount" },
          },
        },
        { $sort: { spent: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            categoryId: { $toString: "$_id" },
            categoryName: "$category.name",
            spent: 1,
          },
        },
      ])
      .toArray();

    const topCategories = (topCatsAgg as Array<{ categoryId: string; categoryName?: string; spent: number }>).map(
      (r) => ({
        categoryId: r.categoryId,
        categoryName: String(r.categoryName ?? "—"),
        spent: Number(r.spent) || 0,
      })
    );

    return NextResponse.json({
      ok: true,
      data: {
        month,
        totals: { income, expense, balance: income - expense },
        series,
        topCategories,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
