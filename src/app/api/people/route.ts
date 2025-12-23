import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET() {
  try {
    const db = await getDb();

    const people = await db
      .collection("people")
      .find({ active: true })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({ ok: true, people });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    const name =
      typeof body === "object" && body !== null && "name" in body
        ? (body as { name?: unknown }).name
        : undefined;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Nombre inválido" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const result = await db.collection("people").insertOne({
      name: name.trim(),
      active: true,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, id: result.insertedId.toString() });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const b = body as { id?: unknown; name?: unknown };
    if (typeof b.id !== "string" || !ObjectId.isValid(b.id)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }

    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) {
      return NextResponse.json({ ok: false, error: "Nombre inválido" }, { status: 400 });
    }

    const db = await getDb();
    const _id = new ObjectId(b.id);

    const res = await db.collection("people").updateOne(
      { _id, active: true },
      { $set: { name, updatedAt: new Date() } }
    );

    if (res.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }

    const db = await getDb();
    const _id = new ObjectId(id);

    // Protección básica: si está referenciada en movimientos (personId), no borrar.
    const inTx = await db.collection("transactions").countDocuments({
      deletedAt: { $exists: false },
      personId: _id,
    });
    if (inTx > 0) {
      return NextResponse.json(
        { ok: false, error: "No se puede borrar: la persona está usada en movimientos" },
        { status: 409 }
      );
    }

    // Borrado lógico
    const res = await db.collection("people").updateOne(
      { _id, active: true },
      { $set: { active: false, deletedAt: new Date() } }
    );

    if (res.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

