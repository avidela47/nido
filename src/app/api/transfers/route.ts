import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

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

    // Transferencias: dos transacciones con el mismo transferGroupId y transferSide in/out
    const rows = await db
      .collection("transactions")
      .find({
        deletedAt: { $exists: false },
        transferGroupId: { $exists: true },
        date: { $gte: start, $lt: end },
      })
      .project({
        _id: 1,
        transferGroupId: 1,
        transferSide: 1,
        accountId: 1,
        date: 1,
        amount: 1,
        note: 1,
        createdAt: 1,
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(400)
      .toArray();

    const items = rows.map((r) => {
      const doc = r as unknown as {
        _id: ObjectId;
        transferGroupId?: unknown;
        transferSide?: unknown;
        accountId?: unknown;
        date?: unknown;
        amount?: unknown;
        note?: unknown;
      };

      const dateIso =
        doc.date instanceof Date
          ? doc.date.toISOString()
          : typeof doc.date === "string"
          ? new Date(doc.date).toISOString()
          : null;

      return {
        _id: doc._id.toString(),
        transferGroupId:
          doc.transferGroupId instanceof ObjectId ? doc.transferGroupId.toString() : String(doc.transferGroupId ?? ""),
        transferSide: doc.transferSide === "in" ? ("in" as const) : ("out" as const),
        accountId: doc.accountId instanceof ObjectId ? doc.accountId.toString() : "",
        date: dateIso,
        amount: typeof doc.amount === "number" ? doc.amount : Number(doc.amount) || 0,
        note: typeof doc.note === "string" ? doc.note : "",
      };
    });

    return NextResponse.json({ ok: true, month, items });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const b = body as {
      fromAccountId?: unknown;
      toAccountId?: unknown;
      amount?: unknown;
      date?: unknown;
      note?: unknown;
    };

    if (typeof b.fromAccountId !== "string" || !ObjectId.isValid(b.fromAccountId)) {
      return NextResponse.json({ ok: false, error: "Cuenta origen inválida" }, { status: 400 });
    }

    if (typeof b.toAccountId !== "string" || !ObjectId.isValid(b.toAccountId)) {
      return NextResponse.json({ ok: false, error: "Cuenta destino inválida" }, { status: 400 });
    }

    if (b.fromAccountId === b.toAccountId) {
      return NextResponse.json(
        { ok: false, error: "La cuenta origen y destino no pueden ser la misma" },
        { status: 400 }
      );
    }

    const numAmount = typeof b.amount === "number" ? b.amount : Number(b.amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });
    }

    const d = typeof b.date === "string" && b.date.trim() ? new Date(b.date) : new Date();
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ ok: false, error: "Fecha inválida" }, { status: 400 });
    }

    const note = typeof b.note === "string" ? b.note.trim() : "";

    const db = await getDb();

    const fromId = new ObjectId(b.fromAccountId);
    const toId = new ObjectId(b.toAccountId);

    const [fromAcc, toAcc] = await Promise.all([
      db.collection("accounts").findOne({ _id: fromId, active: { $ne: false } }),
      db.collection("accounts").findOne({ _id: toId, active: { $ne: false } }),
    ]);

    if (!fromAcc) {
      return NextResponse.json({ ok: false, error: "La cuenta origen no existe" }, { status: 400 });
    }
    if (!toAcc) {
      return NextResponse.json({ ok: false, error: "La cuenta destino no existe" }, { status: 400 });
    }

    // Agrupador: un ObjectId nuevo en el campo transferGroupId
    const groupId = new ObjectId();
    const now = new Date();

    const outTx = {
      type: "transfer" as const,
      amount: numAmount,
      accountId: fromId,
      date: d,
      note,
      transferGroupId: groupId,
      transferSide: "out" as const,
      createdAt: now,
      updatedAt: now,
    };

    const inTx = {
      type: "transfer" as const,
      amount: numAmount,
      accountId: toId,
      date: d,
      note,
      transferGroupId: groupId,
      transferSide: "in" as const,
      createdAt: now,
      updatedAt: now,
    };

    // Intencionalmente los insertamos uno tras otro (sin transacción multi-doc) por simplicidad.
    // Si querés atomicidad estricta, migramos a replica set y usamos session.withTransaction.
    const outRes = await db.collection("transactions").insertOne(outTx);
    const inRes = await db.collection("transactions").insertOne(inTx);

    return NextResponse.json({
      ok: true,
      transferGroupId: groupId.toString(),
      outId: outRes.insertedId.toString(),
      inId: inRes.insertedId.toString(),
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
