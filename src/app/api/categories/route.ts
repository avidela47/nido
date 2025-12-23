import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

const SEED = [
  { name: "Sueldo", type: "income" },
  { name: "Ingresos extra", type: "income" },
  { name: "Alimentos", type: "expense" },
  { name: "Servicios", type: "expense" },
  { name: "Transporte", type: "expense" },
  { name: "Salud", type: "expense" },
  { name: "Ocio", type: "expense" },
];

export async function GET(req: Request) {
  try {
    const db = await getDb();

    const url = new URL(req.url);
    const seed = url.searchParams.get("seed");

    if (seed === "true") {
      const count = await db.collection("categories").countDocuments();
      if (count === 0) {
        await db.collection("categories").insertMany(
          SEED.map((c) => ({
            ...c,
            createdAt: new Date(),
          }))
        );
      }
    }

    const categories = await db
      .collection("categories")
      .find({})
      .sort({ type: 1, name: 1 })
      .toArray();

    return NextResponse.json({ ok: true, categories });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

function normalizeType(v: unknown): "income" | "expense" | null {
  if (v === "income" || v === "expense") return v;
  return null;
}

function normalizeName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.trim();
  if (name.length < 2) return null;
  if (name.length > 60) return null;
  return name;
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const b = body as { name?: unknown; type?: unknown };
    const name = normalizeName(b.name);
    const type = normalizeType(b.type);
    if (!name) return NextResponse.json({ ok: false, error: "name inválido" }, { status: 400 });
    if (!type) return NextResponse.json({ ok: false, error: "type inválido (income|expense)" }, { status: 400 });

    const db = await getDb();

    // Evitar duplicados por mismo nombre+tipo (case-insensitive)
    const existing = await db.collection("categories").findOne({
      type,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Ya existe una categoría con ese nombre" }, { status: 409 });
    }

    const res = await db.collection("categories").insertOne({
      name,
      type,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, category: { _id: res.insertedId, name, type } });
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

    const b = body as { id?: unknown; name?: unknown; type?: unknown };
    if (typeof b.id !== "string" || !ObjectId.isValid(b.id)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }

    const name = b.name === undefined ? undefined : normalizeName(b.name);
    const type = b.type === undefined ? undefined : normalizeType(b.type);
    if (b.name !== undefined && !name) {
      return NextResponse.json({ ok: false, error: "name inválido" }, { status: 400 });
    }
    if (b.type !== undefined && !type) {
      return NextResponse.json({ ok: false, error: "type inválido" }, { status: 400 });
    }

    if (name === undefined && type === undefined) {
      return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
    }

    const db = await getDb();
    const _id = new ObjectId(b.id);

    const current = await db.collection("categories").findOne({ _id });
    if (!current) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });

    const nextName = name ?? (current as { name?: unknown }).name;
    const nextType = type ?? (current as { type?: unknown }).type;

    // Evitar duplicados por nombre+tipo (case-insensitive)
    if (typeof nextName === "string" && (nextType === "income" || nextType === "expense")) {
      const dup = await db.collection("categories").findOne({
        _id: { $ne: _id },
        type: nextType,
        name: { $regex: `^${nextName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, $options: "i" },
      });
      if (dup) {
        return NextResponse.json({ ok: false, error: "Ya existe una categoría con ese nombre" }, { status: 409 });
      }
    }

    await db.collection("categories").updateOne(
      { _id },
      {
        $set: {
          ...(name !== undefined ? { name } : {}),
          ...(type !== undefined ? { type } : {}),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
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

    // Protección: si está en uso en transacciones o presupuestos, no borrar.
    const inTx = await db.collection("transactions").countDocuments({
      deletedAt: { $exists: false },
      categoryId: _id,
    });
    if (inTx > 0) {
      return NextResponse.json(
        { ok: false, error: "No se puede borrar: la categoría está usada en movimientos" },
        { status: 409 }
      );
    }

    const inBudgets = await db.collection("budgets").countDocuments({ categoryId: _id });
    if (inBudgets > 0) {
      return NextResponse.json(
        { ok: false, error: "No se puede borrar: la categoría está usada en presupuestos" },
        { status: 409 }
      );
    }

    await db.collection("categories").deleteOne({ _id });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
