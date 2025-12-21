import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

type ExpenseItem = {
  _id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  person: { _id: string; name: string } | null;
  category: { _id: string; name: string } | null;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

function parseMonth(month: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error("month inválido. Formato esperado: YYYY-MM");
  const year = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(mm) || mm < 1 || mm > 12) {
    throw new Error("month inválido");
  }
  const start = new Date(Date.UTC(year, mm - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mm, 1, 0, 0, 0, 0));
  return { start, end };
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    if (!month) return NextResponse.json({ ok: false, error: "month requerido" }, { status: 400 });

    const q = (url.searchParams.get("q") ?? "").trim();
    const personId = (url.searchParams.get("personId") ?? "").trim();
    const categoryId = (url.searchParams.get("categoryId") ?? "").trim();
    const limitParam = url.searchParams.get("limit") ?? "10";

    const limit = Math.max(1, Math.min(50, Number(limitParam) || 10));

    const { start, end } = parseMonth(month);
    const db = await getDb();

    const match: Record<string, unknown> = {
      deletedAt: { $exists: false },
      type: "expense",
      date: { $gte: start, $lt: end },
    };

    if (q) match.note = { $regex: q, $options: "i" };
    if (personId) {
      if (!ObjectId.isValid(personId)) throw new Error("personId inválido");
      match.personId = new ObjectId(personId);
    }
    if (categoryId) {
      if (!ObjectId.isValid(categoryId)) throw new Error("categoryId inválido");
      match.categoryId = new ObjectId(categoryId);
    }

    const rows = await db
      .collection("transactions")
      .aggregate([
        { $match: match },
        { $sort: { amount: -1, date: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "people",
            localField: "personId",
            foreignField: "_id",
            as: "person",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $project: {
            _id: 1,
            amount: 1,
            date: 1,
            note: 1,
            person: { $arrayElemAt: ["$person", 0] },
            category: { $arrayElemAt: ["$category", 0] },
          },
        },
      ])
      .toArray();

    const items: ExpenseItem[] = rows.map((r: any) => {
      const id = String(r._id);
      const amount = toNumber(r.amount);
      const d = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date ?? "");
      const note = typeof r.note === "string" ? r.note : "";

      const p = r.person && r.person._id
        ? { _id: String(r.person._id), name: String(r.person.name ?? "—") }
        : null;

      const c = r.category && r.category._id
        ? { _id: String(r.category._id), name: String(r.category.name ?? "—") }
        : null;

      return { _id: id, amount, date: d, note, person: p, category: c };
    });

    return NextResponse.json({ ok: true, data: { month, items } });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
