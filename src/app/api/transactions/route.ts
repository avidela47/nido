import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

type TxType = "income" | "expense";

type PersonDoc = { _id: ObjectId; name?: unknown; active?: unknown };
type CategoryDoc = { _id: ObjectId; name?: unknown; type?: unknown };

type TxDoc = {
  _id: ObjectId;
  type?: unknown;
  amount?: unknown;
  personId?: unknown;
  categoryId?: unknown;
  date?: unknown;
  note?: unknown;
  createdAt?: unknown;
  deletedAt?: unknown;
};

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

    const txRaw = (await db
      .collection("transactions")
      .find({
        deletedAt: { $exists: false },
        date: { $gte: start, $lt: end },
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .toArray()) as unknown as TxDoc[];

    const personIds = Array.from(
      new Set(
        txRaw
          .map((t) => (t.personId instanceof ObjectId ? t.personId.toString() : ""))
          .filter(Boolean)
      )
    );

    const categoryIds = Array.from(
      new Set(
        txRaw
          .map((t) => (t.categoryId instanceof ObjectId ? t.categoryId.toString() : ""))
          .filter(Boolean)
      )
    );

    const people = (await db
      .collection("people")
      .find({ _id: { $in: personIds.map((id) => new ObjectId(id)) } })
      .toArray()) as unknown as PersonDoc[];

    const categories = (await db
      .collection("categories")
      .find({ _id: { $in: categoryIds.map((id) => new ObjectId(id)) } })
      .toArray()) as unknown as CategoryDoc[];

    const peopleMap = new Map(
      people.map((p) => [p._id.toString(), typeof p.name === "string" ? p.name : "—"])
    );

    const catMap = new Map(
      categories.map((c) => [
        c._id.toString(),
        {
          name: typeof c.name === "string" ? c.name : "—",
          type: c.type === "income" ? ("income" as TxType) : ("expense" as TxType),
        },
      ])
    );

    const items = txRaw.map((t) => {
      const type: TxType = t.type === "income" ? "income" : "expense";
      const amount = typeof t.amount === "number" ? t.amount : Number(t.amount);

      const personId = t.personId instanceof ObjectId ? t.personId.toString() : "";
      const categoryId = t.categoryId instanceof ObjectId ? t.categoryId.toString() : "";

      const personName = peopleMap.get(personId) ?? "—";
      const cat = catMap.get(categoryId) ?? { name: "—", type };

      const dateIso =
        t.date instanceof Date
          ? t.date.toISOString()
          : typeof t.date === "string"
          ? new Date(t.date).toISOString()
          : null;

      return {
        _id: t._id.toString(),
        type,
        amount: Number.isFinite(amount) ? amount : 0,
        date: dateIso,
        note: typeof t.note === "string" ? t.note : "",
        person: { id: personId, name: personName },
        category: { id: categoryId, name: cat.name, type: cat.type },
      };
    });

    return NextResponse.json({ ok: true, month, items });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const b = body as {
      type?: unknown;
      amount?: unknown;
      personId?: unknown;
      categoryId?: unknown;
      date?: unknown;
      note?: unknown;
    };

    const type = b.type;
    if (type !== "income" && type !== "expense") {
      return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
    }

    const numAmount = typeof b.amount === "number" ? b.amount : Number(b.amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });
    }

    if (typeof b.personId !== "string" || !b.personId.trim()) {
      return NextResponse.json({ ok: false, error: "Persona inválida" }, { status: 400 });
    }

    if (typeof b.categoryId !== "string" || !b.categoryId.trim()) {
      return NextResponse.json({ ok: false, error: "Categoría inválida" }, { status: 400 });
    }

    const isoDate =
      typeof b.date === "string" && b.date.trim() ? new Date(b.date) : new Date();

    if (Number.isNaN(isoDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Fecha inválida" }, { status: 400 });
    }

    const safeNote = typeof b.note === "string" ? b.note.trim() : "";

    const db = await getDb();

    const person = await db
      .collection("people")
      .findOne({ _id: new ObjectId(b.personId), active: true });

    if (!person) {
      return NextResponse.json({ ok: false, error: "La persona no existe" }, { status: 400 });
    }

    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(b.categoryId) });

    if (!category) {
      return NextResponse.json({ ok: false, error: "La categoría no existe" }, { status: 400 });
    }

    const catType = (category as { type?: unknown }).type;
    if (catType !== type) {
      return NextResponse.json(
        { ok: false, error: "La categoría no coincide con el tipo" },
        { status: 400 }
      );
    }

    const result = await db.collection("transactions").insertOne({
      type,
      amount: numAmount,
      personId: new ObjectId(b.personId),
      categoryId: new ObjectId(b.categoryId),
      date: isoDate,
      note: safeNote,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, id: result.insertedId.toString() });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}


