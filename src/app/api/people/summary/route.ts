import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { currentMonthYYYYMM, parseMonthRangeUTC, isMonthYYYYMM } from "../../../../lib/dateRanges";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

type TxType = "income" | "expense";

function prevMonthYYYYMM(month: string): string {
  const [y, m] = month.split("-").map((x) => Number(x));
  const year = Number.isFinite(y) ? y : 1970;
  const mon = Number.isFinite(m) ? m : 1;
  const prev = new Date(Date.UTC(year, mon - 1 - 1, 1)); // mon is 1-based
  const yy = prev.getUTCFullYear();
  const mm = String(prev.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function pctChange(current: number, previous: number): number | null {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c === 0 ? 0 : null;
  return (c - p) / Math.abs(p);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const month = url.searchParams.get("month") ?? currentMonthYYYYMM();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }
    if (!isMonthYYYYMM(month)) {
      return NextResponse.json({ ok: false, error: "month inválido (YYYY-MM)" }, { status: 400 });
    }

    const db = await getDb();
    const personId = new ObjectId(id);

    const person = await db.collection("people").findOne({ _id: personId, active: true });
    if (!person) {
      return NextResponse.json({ ok: false, error: "La persona no existe" }, { status: 404 });
    }

    // Totales históricos (income/expense)
    const allAgg = (await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            personId,
            type: { $in: ["income", "expense"] },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            lastDate: { $max: "$date" },
          },
        },
      ])
      .toArray()) as unknown as Array<{ _id: unknown; total: number; lastDate?: Date }>;

    let allIncome = 0;
    let allExpense = 0;
    let lastTxDate: Date | null = null;

    for (const r of allAgg) {
      const t = r._id === "income" ? "income" : r._id === "expense" ? "expense" : null;
      if (!t) continue;
      if (t === "income") allIncome = Number(r.total) || 0;
      if (t === "expense") allExpense = Number(r.total) || 0;
      if (r.lastDate instanceof Date) {
        if (!lastTxDate || r.lastDate > lastTxDate) lastTxDate = r.lastDate;
      }
    }

    // Totales del mes
    const { start, end } = parseMonthRangeUTC(month);
    const monthAgg = (await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            personId,
            date: { $gte: start, $lt: end },
            type: { $in: ["income", "expense"] },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ])
      .toArray()) as unknown as Array<{ _id: unknown; total: number }>;

    let mIncome = 0;
    let mExpense = 0;
    for (const r of monthAgg) {
      const t = r._id === "income" ? "income" : r._id === "expense" ? "expense" : null;
      if (!t) continue;
      if (t === "income") mIncome = Number(r.total) || 0;
      if (t === "expense") mExpense = Number(r.total) || 0;
    }

    // Totales del mes anterior (para variación vs mes anterior)
    const prevMonth = prevMonthYYYYMM(month);
    const { start: prevStart, end: prevEnd } = parseMonthRangeUTC(prevMonth);

    const prevAgg = (await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            personId,
            date: { $gte: prevStart, $lt: prevEnd },
            type: { $in: ["income", "expense"] },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ])
      .toArray()) as unknown as Array<{ _id: unknown; total: number }>;

    let pIncome = 0;
    let pExpense = 0;
    for (const r of prevAgg) {
      const t = r._id === "income" ? "income" : r._id === "expense" ? "expense" : null;
      if (!t) continue;
      if (t === "income") pIncome = Number(r.total) || 0;
      if (t === "expense") pExpense = Number(r.total) || 0;
    }

    const mNet2 = mIncome - mExpense;
    const pNet = pIncome - pExpense;

    // Top categorías del mes (por importe, dentro del mes)
    const topCats = (await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            personId,
            date: { $gte: start, $lt: end },
            type: { $in: ["income", "expense"] },
          },
        },
        {
          $group: {
            _id: { categoryId: "$categoryId", type: "$type" },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "categories",
            localField: "_id.categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $project: {
            _id: 0,
            categoryId: "$_id.categoryId",
            type: "$_id.type",
            amount: 1,
            categoryName: { $arrayElemAt: ["$category.name", 0] },
          },
        },
      ])
      .toArray()) as unknown as Array<{ categoryId: ObjectId; type: TxType; amount: number; categoryName?: unknown }>;

    return NextResponse.json({
      ok: true,
      data: {
        personId: id,
        month,
        prevMonth,
        totalsAllTime: {
          income: allIncome,
          expense: allExpense,
          net: allIncome - allExpense,
        },
        totalsMonth: {
          income: mIncome,
          expense: mExpense,
          net: mNet2,
        },
        totalsPrevMonth: {
          income: pIncome,
          expense: pExpense,
          net: pNet,
        },
        changeVsPrevMonth: {
          incomeDelta: mIncome - pIncome,
          incomePct: pctChange(mIncome, pIncome),
          expenseDelta: mExpense - pExpense,
          expensePct: pctChange(mExpense, pExpense),
          netDelta: mNet2 - pNet,
          netPct: pctChange(mNet2, pNet),
        },
        lastTxDate: lastTxDate ? lastTxDate.toISOString() : null,
        topCategoriesMonth: topCats.map((c) => ({
          categoryId: c.categoryId.toString(),
          categoryName: typeof c.categoryName === "string" ? c.categoryName : "—",
          type: c.type === "income" ? "income" : "expense",
          amount: Number(c.amount) || 0,
        })),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
