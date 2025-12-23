import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

function serializeDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

export async function GET() {
  try {
    const db = await getDb();

    const [people, categories, budgets, transactions] = await Promise.all([
      db.collection("people").find({}).toArray(),
      db.collection("categories").find({}).toArray(),
      db.collection("budgets").find({}).toArray(),
      db.collection("transactions").find({}).toArray(),
    ]);

    const payload = {
      app: "nido",
      version: 1,
      exportedAt: new Date().toISOString(),
      counts: {
        people: people.length,
        categories: categories.length,
        budgets: budgets.length,
        transactions: transactions.length,
      },
      data: {
        people: people.map((d) => serializeDoc(d as unknown as Record<string, unknown>)),
        categories: categories.map((d) => serializeDoc(d as unknown as Record<string, unknown>)),
        budgets: budgets.map((d) => serializeDoc(d as unknown as Record<string, unknown>)),
        transactions: transactions.map((d) => serializeDoc(d as unknown as Record<string, unknown>)),
      },
    };

    const filename = `nido-backup-${payload.exportedAt.slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
