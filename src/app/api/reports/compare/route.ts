import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { isMonthYYYYMM, parseMonthRangeUTC } from "../../../../lib/dateRanges";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const monthA = url.searchParams.get("monthA") ?? "";
    const monthB = url.searchParams.get("monthB") ?? "";
    const personId = url.searchParams.get("personId") ?? "";

    if (!isMonthYYYYMM(monthA) || !isMonthYYYYMM(monthB)) {
      return NextResponse.json({ ok: false, error: "monthA/monthB inválidos (YYYY-MM)" }, { status: 400 });
    }

    const db = await getDb();

    const baseMatch: Record<string, unknown> = { deletedAt: { $exists: false } };
    if (personId) {
      if (!ObjectId.isValid(personId)) {
        return NextResponse.json({ ok: false, error: "personId inválido" }, { status: 400 });
      }
      baseMatch.personId = new ObjectId(personId);
    }

    async function summarizeMonth(month: string) {
      const { start, end } = parseMonthRangeUTC(month);
      const match = { ...baseMatch, date: { $gte: start, $lt: end } };

      // Totales
      const totalsAgg = await db
        .collection("transactions")
        .aggregate([
          { $match: match },
          { $group: { _id: "$type", total: { $sum: "$amount" } } },
        ])
        .toArray();

      let income = 0;
      let expense = 0;
      for (const r of totalsAgg as Array<{ _id: string; total: number }>) {
        if (r._id === "income") income = Number(r.total) || 0;
        if (r._id === "expense") expense = Number(r.total) || 0;
      }

      // Top categorías (solo gastos)
      const topCatsAgg = await db
        .collection("transactions")
        .aggregate([
          { $match: { ...match, type: "expense" } },
          { $group: { _id: "$categoryId", spent: { $sum: "$amount" } } },
          { $sort: { spent: -1 } },
          { $limit: 10 },
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

      return {
        month,
        totals: { income, expense, balance: income - expense },
        topCategories,
      };
    }

    const [a, b] = await Promise.all([summarizeMonth(monthA), summarizeMonth(monthB)]);

    return NextResponse.json({ ok: true, data: { monthA: a, monthB: b } });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
