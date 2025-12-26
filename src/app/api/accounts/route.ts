import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

type AccountType = "cash" | "bank" | "wallet" | "credit";



function isAccountType(v: unknown): v is AccountType {
  return v === "cash" || v === "bank" || v === "wallet" || v === "credit";
}

function toInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function normalizeName(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

function validateDays(statementDay: unknown, dueDay: unknown): string | null {
  const sd = toInt(statementDay);
  const dd = toInt(dueDay);
  if (!Number.isFinite(sd) || sd < 1 || sd > 28) return "Cierre inválido (1..28)";
  if (!Number.isFinite(dd) || dd < 1 || dd > 28) return "Vencimiento inválido (1..28)";
  return null;
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .collection("accounts")
      .find({ active: { $ne: false } })
      .sort({ createdAt: 1 })
      .toArray();

    const accounts = rows.map((a) => {
      const doc = a as unknown as {
        _id: ObjectId;
        name?: unknown;
        type?: unknown;
        active?: unknown;
        credit?: unknown;
        person?: { _id?: unknown; name?: unknown };
      };

      const credit =
        doc.type === "credit" && doc.credit && typeof doc.credit === "object"
          ? (doc.credit as { statementDay?: unknown; dueDay?: unknown; limit?: unknown })
          : null;

      const person = doc.person && typeof doc.person === "object"
        ? {
            _id: typeof doc.person._id === "string" ? doc.person._id : (doc.person._id instanceof ObjectId ? doc.person._id.toString() : ""),
            name: typeof doc.person.name === "string" ? doc.person.name : "—",
          }
        : null;

      return {
        _id: doc._id.toString(),
        name: typeof doc.name === "string" ? doc.name : "—",
        type: isAccountType(doc.type) ? doc.type : ("cash" as AccountType),
        active: doc.active !== false,
        credit: credit
          ? {
              statementDay: toInt(credit.statementDay),
              dueDay: toInt(credit.dueDay),
              limit: credit.limit !== undefined ? Number(credit.limit) : undefined,
            }
          : null,
        person,
      };
    });

    return NextResponse.json({ ok: true, accounts });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }


    const b = body as {
      name?: unknown;
      type?: unknown;
      credit?: unknown;
      person?: { _id?: unknown; name?: unknown };
    };

    const name = typeof b.name === "string" ? normalizeName(b.name) : "";
    if (!name) {
      return NextResponse.json({ ok: false, error: "Nombre inválido" }, { status: 400 });
    }

    if (!isAccountType(b.type)) {
      return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
    }

    // Validar persona obligatoria
    if (!b.person || typeof b.person !== "object" || !b.person._id || typeof b.person._id !== "string" || !b.person.name || typeof b.person.name !== "string") {
      return NextResponse.json({ ok: false, error: "Persona obligatoria" }, { status: 400 });
    }

    const now = new Date();
    const doc: Record<string, unknown> = {
      name,
      type: b.type,
      active: true,
      createdAt: now,
      updatedAt: now,
      person: {
        _id: b.person._id,
        name: b.person.name,
      },
    };

    if (b.type === "credit") {
      const credit = typeof b.credit === "object" && b.credit !== null ? (b.credit as Record<string, unknown>) : {};
      const msg = validateDays(credit.statementDay, credit.dueDay);
      if (msg) return NextResponse.json({ ok: false, error: msg }, { status: 400 });

      doc.credit = {
        statementDay: toInt(credit.statementDay),
        dueDay: toInt(credit.dueDay),
        limit: credit.limit !== undefined ? Number(credit.limit) : undefined,
      };
    }

    const db = await getDb();

    // No duplicar (case-insensitive) por tipo+nombre
    const exists = await db.collection("accounts").findOne({
      active: { $ne: false },
      type: b.type,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}$`, $options: "i" },
    });

    if (exists) {
      return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese nombre" }, { status: 409 });
    }

    const result = await db.collection("accounts").insertOne(doc);
    return NextResponse.json({ ok: true, id: result.insertedId.toString() });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const b = body as {
      id?: unknown;
      name?: unknown;
      type?: unknown;
      active?: unknown;
      credit?: unknown;
      person?: { _id?: unknown; name?: unknown };
    };
  const update: Record<string, unknown> = { updatedAt: new Date() };

    // Permitir actualizar persona (obligatoria)
    if (b.person !== undefined) {
      if (!b.person || typeof b.person !== "object" || !b.person._id || typeof b.person._id !== "string" || !b.person.name || typeof b.person.name !== "string") {
        return NextResponse.json({ ok: false, error: "Persona obligatoria" }, { status: 400 });
      }
      update.person = {
        _id: b.person._id,
        name: b.person.name,
      };
    }

    if (typeof b.id !== "string" || !ObjectId.isValid(b.id)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }

  // (eliminado: declaración duplicada)

    if (b.name !== undefined) {
      const name = typeof b.name === "string" ? normalizeName(b.name) : "";
      if (!name) return NextResponse.json({ ok: false, error: "Nombre inválido" }, { status: 400 });
      update.name = name;
    }

    if (b.type !== undefined) {
      if (!isAccountType(b.type)) {
        return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
      }
      update.type = b.type;
    }

    if (b.active !== undefined) {
      if (typeof b.active !== "boolean") {
        return NextResponse.json({ ok: false, error: "active inválido" }, { status: 400 });
      }
      update.active = b.active;
      if (b.active === false) update.deletedAt = new Date();
    }

    const type = b.type;
    if (type === "credit" || (type === undefined && typeof b.credit === "object" && b.credit !== null)) {
      const credit = typeof b.credit === "object" && b.credit !== null ? (b.credit as Record<string, unknown>) : {};
      if (Object.keys(credit).length > 0) {
        const msg = validateDays(credit.statementDay, credit.dueDay);
        if (msg) return NextResponse.json({ ok: false, error: msg }, { status: 400 });
        update.credit = {
          statementDay: toInt(credit.statementDay),
          dueDay: toInt(credit.dueDay),
          limit: credit.limit !== undefined ? Number(credit.limit) : undefined,
        };
      }
    }

    const db = await getDb();
    const _id = new ObjectId(b.id);

    const res = await db.collection("accounts").updateOne({ _id }, { $set: update });
    if (res.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // delete = desactivar (soft delete) para no romper referencias
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }

    const db = await getDb();
    const _id = new ObjectId(id);

    const res = await db.collection("accounts").updateOne(
      { _id },
      { $set: { active: false, deletedAt: new Date(), updatedAt: new Date() } }
    );

    if (res.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
