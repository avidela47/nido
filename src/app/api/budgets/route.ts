import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

function isMonthYYYYMM(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v);
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

type BudgetDoc = {
  _id: ObjectId;
  month: string;
  categoryId: ObjectId;
  amount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const b = body as { month?: unknown; categoryId?: unknown; amount?: unknown };

    if (!isMonthYYYYMM(b.month)) {
      return NextResponse.json({ ok: false, error: "month inválido (YYYY-MM)" }, { status: 400 });
    }
    if (typeof b.categoryId !== "string" || !ObjectId.isValid(b.categoryId)) {
      return NextResponse.json({ ok: false, error: "categoryId inválido" }, { status: 400 });
    }

    const amount = toNumber(b.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ ok: false, error: "amount inválido" }, { status: 400 });
    }

    const db = await getDb();

    // Si amount === 0 => borrar presupuesto (comportamiento práctico de CRUD)
    if (amount === 0) {
      await db.collection("budgets").deleteOne({
        month: b.month,
        categoryId: new ObjectId(b.categoryId),
      });

      return NextResponse.json({ ok: true, data: { deleted: true } });
    }

    // Upsert por (month, categoryId)
    const res = await db.collection("budgets").findOneAndUpdate(
      { month: b.month, categoryId: new ObjectId(b.categoryId) },
      {
        $set: { amount, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: "after" }
    );

    if (!res || !res.value) {
      return NextResponse.json({ ok: false, error: "No se pudo guardar" }, { status: 500 });
    }

    const doc = res.value as BudgetDoc;

    return NextResponse.json({
      ok: true,
      data: {
        _id: doc._id.toString(),
        month: doc.month,
        categoryId: doc.categoryId.toString(),
        amount: doc.amount,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}

