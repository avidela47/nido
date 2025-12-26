import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const groupId = new ObjectId(id);
    const db = await getDb();

    // Soft delete de ambas patas
    const res = await db.collection("transactions").updateMany(
      { transferGroupId: groupId, deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date(), updatedAt: new Date() } }
    );

    return NextResponse.json({ ok: true, modified: res.modifiedCount });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

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
      amount?: unknown;
      date?: unknown;
      note?: unknown;
    };

    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (b.amount !== undefined) {
      const num = typeof b.amount === "number" ? b.amount : Number(b.amount);
      if (!Number.isFinite(num) || num <= 0) {
        return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });
      }
      update.amount = num;
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
    const groupId = new ObjectId(id);

    const res = await db.collection("transactions").updateMany(
      { transferGroupId: groupId, deletedAt: { $exists: false } },
      { $set: update }
    );

    return NextResponse.json({ ok: true, modified: res.modifiedCount });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
