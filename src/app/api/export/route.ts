import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";
import { toCSV } from "../../../lib/csv";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

function isMonthYYYYMM(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v);
}

function isYearYYYY(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}$/.test(v);
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

function parseYearRange(year: string): { start: Date; end: Date } {
  const y = Number(year);
  const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope"); // "month" | "year"
    const month = url.searchParams.get("month") ?? "";
    const year = url.searchParams.get("year") ?? "";
    const personId = url.searchParams.get("personId") ?? "";

    let start: Date;
    let end: Date;
    let filenameBase = "nido-export";

    if (scope === "month") {
      if (!isMonthYYYYMM(month)) {
        return NextResponse.json({ ok: false, error: "month inválido (YYYY-MM)" }, { status: 400 });
      }
      ({ start, end } = parseMonthRange(month));
      filenameBase = `nido-${month}`;
    } else if (scope === "year") {
      if (!isYearYYYY(year)) {
        return NextResponse.json({ ok: false, error: "year inválido (YYYY)" }, { status: 400 });
      }
      ({ start, end } = parseYearRange(year));
      filenameBase = `nido-${year}`;
    } else {
      return NextResponse.json({ ok: false, error: "scope inválido (month|year)" }, { status: 400 });
    }

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
      filenameBase += `-person-${personId.slice(-6)}`;
    }

    const rows = await db
      .collection("transactions")
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "people",
            localField: "personId",
            foreignField: "_id",
            as: "person",
          },
        },
        { $unwind: { path: "$person", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: 1,
            date: 1,
            amount: 1,
            note: 1,
            personName: "$person.name",
            categoryName: "$category.name",
          },
        },
        { $sort: { date: 1, _id: 1 } },
      ])
      .toArray();

    const out = rows.map((r: any) => ({
      id: r._id?.toString?.() ?? "",
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date ?? ""),
      type: String(r.type ?? ""),
      amount: Number(r.amount ?? 0),
      person: String(r.personName ?? ""),
      category: String(r.categoryName ?? ""),
      note: String(r.note ?? ""),
    }));

    const headers = ["id", "date", "type", "amount", "person", "category", "note"];
    const csv = toCSV(out, headers);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
