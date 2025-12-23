import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

type TxType = "income" | "expense";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

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

    const update: Record<string, unknown> = {};

    if (b.type !== undefined) {
      if (b.type !== "income" && b.type !== "expense") {
        return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
      }
      update.type = b.type as TxType;
    }

    if (b.amount !== undefined) {
      const num = typeof b.amount === "number" ? b.amount : Number(b.amount);
      if (!Number.isFinite(num) || num <= 0) {
        return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });
      }
      update.amount = num;
    }

    if (b.personId !== undefined) {
      if (typeof b.personId !== "string" || !ObjectId.isValid(b.personId)) {
        return NextResponse.json({ ok: false, error: "Persona inválida" }, { status: 400 });
      }
      update.personId = new ObjectId(b.personId);
    }

    if (b.categoryId !== undefined) {
      if (typeof b.categoryId !== "string" || !ObjectId.isValid(b.categoryId)) {
        return NextResponse.json({ ok: false, error: "Categoría inválida" }, { status: 400 });
      }
      update.categoryId = new ObjectId(b.categoryId);
    }

    if (b.date !== undefined) {
      if (typeof b.date !== "string" || !b.date.trim()) {
        return NextResponse.json({ ok: false, error: "Fecha inválida" }, { status: 400 });
      }
      const d = new Date(b.date);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: "Fecha inválida" }, { status: 400 });
      }
      update.date = d;
    }

    if (b.note !== undefined) {
      if (typeof b.note !== "string") {
        return NextResponse.json({ ok: false, error: "Nota inválida" }, { status: 400 });
      }
      update.note = b.note.trim();
    }

    const db = await getDb();

    // Validación coherencia categoría vs tipo si ambos están
    const existing = await db.collection("transactions").findOne({ _id: new ObjectId(id) });
    if (!existing || (existing as { deletedAt?: unknown }).deletedAt) {
      return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    }

    const nextType = (update.type ?? (existing as { type?: unknown }).type) as TxType;
    const nextCategoryId = (update.categoryId ??
      (existing as { categoryId?: unknown }).categoryId) as unknown;

    if (nextCategoryId instanceof ObjectId) {
      const cat = await db.collection("categories").findOne({ _id: nextCategoryId });
      const catType = (cat as { type?: unknown } | null)?.type;
      if (catType !== nextType) {
        return NextResponse.json(
          { ok: false, error: "La categoría no coincide con el tipo" },
          { status: 400 }
        );
      }
    }

    const result = await db.collection("transactions").updateOne(
      { _id: new ObjectId(id), deletedAt: { $exists: false } },
      { $set: { ...update, updatedAt: new Date() } }
    );

    return NextResponse.json({ ok: true, modified: result.modifiedCount });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("transactions").updateOne(
      { _id: new ObjectId(id), deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date() } }
    );

    return NextResponse.json({ ok: true, modified: result.modifiedCount });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
