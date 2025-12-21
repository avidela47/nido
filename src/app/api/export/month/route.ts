import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

type TxRow = {
  _id: ObjectId;
  type: "income" | "expense";
  amount: number;
  date: Date;
  note?: string;
  person?: { _id: ObjectId; name?: unknown } | null;
  category?: { _id: ObjectId; name?: unknown } | null;
};

function parseMonth(month: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error("month inválido. Formato esperado: YYYY-MM");
  const year = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(mm) || mm < 1 || mm > 12) throw new Error("month inválido");
  const start = new Date(Date.UTC(year, mm - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mm, 1, 0, 0, 0, 0));
  return { start, end };
}

function escCsv(v: string): string {
  if (v.includes('"') || v.includes(",") || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    if (!month) return NextResponse.json({ ok: false, error: "month requerido" }, { status: 400 });

    const { start, end } = parseMonth(month);
    const db = await getDb();

    const rows = (await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            deletedAt: { $exists: false },
            date: { $gte: start, $lt: end },
          },
        },
        { $sort: { date: 1, type: 1, amount: -1 } },
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
            type: 1,
            amount: 1,
            date: 1,
            note: 1,
            person: { $arrayElemAt: ["$person", 0] },
            category: { $arrayElemAt: ["$category", 0] },
          },
        },
      ])
      .toArray()) as unknown as TxRow[];

    const header = [
      "id",
      "month",
      "date",
      "type",
      "amount",
      "person",
      "category",
      "note",
    ].join(",");

    const lines = rows.map((r) => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : "";
      const personName = r.person ? toStr(r.person.name) : "";
      const categoryName = r.category ? toStr(r.category.name) : "";
      const note = toStr(r.note ?? "");

      return [
        escCsv(r._id.toString()),
        escCsv(month),
        escCsv(dateStr),
        escCsv(r.type),
        escCsv(String(r.amount)),
        escCsv(personName),
        escCsv(categoryName),
        escCsv(note),
      ].join(",");
    });

    const csv = [header, ...lines].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nido-transactions-${month}.csv"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
