import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

type TxType = "income" | "expense";

function parseMonth(month: string): { year: number; monthIndex: number } {
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

function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? currentMonthYYYYMM();
    const { start, end } = monthRangeUTC(month);

    const db = await getDb();

    // Cuentas activas
    const accountsRaw = await db
      .collection("accounts")
      .find({ active: { $ne: false } })
      .sort({ createdAt: 1 })
      .toArray();

    const accounts = accountsRaw.map((a) => {
      const doc = a as unknown as {
        _id: ObjectId;
        name?: unknown;
        type?: unknown;
      };

      return {
        _id: doc._id.toString(),
        name: typeof doc.name === "string" ? doc.name : "—",
        type:
          doc.type === "cash" || doc.type === "bank" || doc.type === "wallet" || doc.type === "credit"
            ? (doc.type as "cash" | "bank" | "wallet" | "credit")
            : "cash",
      };
    });

    // Agregación por accountId (incluye null/ausente como "sin cuenta")
    const rows = (await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            date: { $gte: start, $lt: end },
          },
        },
        {
          $project: {
            type: 1,
            amount: 1,
            date: 1,
            note: 1,
            accountId: { $ifNull: ["$accountId", null] },
          },
        },
        {
          $group: {
            _id: "$accountId",
            income: {
              $sum: {
                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
              },
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray()) as unknown as Array<{
      _id: ObjectId | null;
      income?: number;
      expense?: number;
      count?: number;
    }>;

    // Últimos movimientos por cuenta (top 3) para “vista pro” rápida
    const lastTxRaw = (await db
      .collection("transactions")
      .find({
        deletedAt: { $exists: false },
        date: { $gte: start, $lt: end },
      })
      .project({ type: 1, amount: 1, date: 1, note: 1, accountId: 1 })
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .toArray()) as unknown as Array<{
      _id: ObjectId;
      type?: unknown;
      amount?: unknown;
      date?: unknown;
      note?: unknown;
      accountId?: unknown;
    }>;

    const lastByKey = new Map<string, Array<{ _id: string; type: TxType; amount: number; date: string; note: string }>>();
    for (const t of lastTxRaw) {
      const key = t.accountId instanceof ObjectId ? t.accountId.toString() : "__none__";
      const arr = lastByKey.get(key) ?? [];
      if (arr.length >= 3) continue;

      const type: TxType = t.type === "income" ? "income" : "expense";
      const amount = typeof t.amount === "number" ? t.amount : Number(t.amount);
      const d = t.date instanceof Date ? t.date : typeof t.date === "string" ? new Date(t.date) : null;
      if (!d || Number.isNaN(d.getTime())) continue;

      arr.push({
        _id: t._id.toString(),
        type,
        amount: Number.isFinite(amount) ? amount : 0,
        date: d.toISOString(),
        note: typeof t.note === "string" ? t.note : "",
      });
      lastByKey.set(key, arr);
    }

    const sumMap = new Map<string, { income: number; expense: number; count: number }>();
    for (const r of rows) {
      const key = r._id instanceof ObjectId ? r._id.toString() : "__none__";
      sumMap.set(key, {
        income: Number(r.income ?? 0),
        expense: Number(r.expense ?? 0),
        count: Number(r.count ?? 0),
      });
    }

    const items = [
      {
        key: "__none__",
        account: null,
        ...(
          sumMap.get("__none__") ?? {
            income: 0,
            expense: 0,
            count: 0,
          }
        ),
        net: (sumMap.get("__none__")?.income ?? 0) - (sumMap.get("__none__")?.expense ?? 0),
        last: lastByKey.get("__none__") ?? [],
      },
      ...accounts.map((a) => {
        const s = sumMap.get(a._id) ?? { income: 0, expense: 0, count: 0 };
        return {
          key: a._id,
          account: a,
          income: s.income,
          expense: s.expense,
          count: s.count,
          net: s.income - s.expense,
          last: lastByKey.get(a._id) ?? [],
        };
      }),
    ];

    return NextResponse.json({ ok: true, month, items });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
