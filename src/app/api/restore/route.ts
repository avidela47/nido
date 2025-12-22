import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

type RestoreMode = "merge" | "replace";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toDateIfISO(v: unknown): unknown {
  if (typeof v !== "string") return v;
  // simple ISO check
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return v;
}

function reviveKnownDates(doc: Record<string, unknown>): Record<string, unknown> {
  // Campos típicos del proyecto
  const dateFields = ["createdAt", "updatedAt", "deletedAt", "date"];
  const out: Record<string, unknown> = { ...doc };

  for (const f of dateFields) {
    if (f in out) out[f] = toDateIfISO(out[f]);
  }
  return out;
}

function reviveIds(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...doc };

  // _id
  if (typeof out._id === "string" && ObjectId.isValid(out._id)) out._id = new ObjectId(out._id);

  // foreign keys usadas
  const idFields = ["personId", "categoryId"];
  for (const f of idFields) {
    if (typeof out[f] === "string" && ObjectId.isValid(out[f] as string)) out[f] = new ObjectId(out[f] as string);
  }

  return out;
}

function normalizeDocs(arr: unknown): Record<string, unknown>[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(isObject)
    .map((d) => reviveKnownDates(reviveIds(d)));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;

    if (!isObject(body)) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const mode = (body.mode ?? "merge") as RestoreMode;
    if (mode !== "merge" && mode !== "replace") {
      return NextResponse.json({ ok: false, error: "mode inválido (merge|replace)" }, { status: 400 });
    }

    if (!isObject(body.backup)) {
      return NextResponse.json({ ok: false, error: "backup faltante" }, { status: 400 });
    }

    const backup = body.backup as Record<string, unknown>;
    if (backup.app !== "nido") {
      return NextResponse.json({ ok: false, error: "Backup no corresponde a Nido" }, { status: 400 });
    }

    const data = isObject(backup.data) ? (backup.data as Record<string, unknown>) : null;
    if (!data) {
      return NextResponse.json({ ok: false, error: "Backup sin data" }, { status: 400 });
    }

    const people = normalizeDocs(data.people);
    const categories = normalizeDocs(data.categories);
    const budgets = normalizeDocs(data.budgets);
    const transactions = normalizeDocs(data.transactions);

    const db = await getDb();

    if (mode === "replace") {
      await Promise.all([
        db.collection("people").deleteMany({}),
        db.collection("categories").deleteMany({}),
        db.collection("budgets").deleteMany({}),
        db.collection("transactions").deleteMany({}),
      ]);
    }

    // MERGE strategy: upsert por _id si viene, si no viene _id -> insert
    async function upsertMany(colName: string, docs: Record<string, unknown>[]) {
      const col = db.collection(colName);
      let inserted = 0;
      let upserted = 0;

      for (const d of docs) {
        if (d._id instanceof ObjectId) {
          await col.updateOne({ _id: d._id }, { $set: d }, { upsert: true });
          upserted++;
        } else {
          await col.insertOne(d);
          inserted++;
        }
      }

      return { inserted, upserted };
    }

    const r1 = await upsertMany("people", people);
    const r2 = await upsertMany("categories", categories);
    const r3 = await upsertMany("budgets", budgets);
    const r4 = await upsertMany("transactions", transactions);

    return NextResponse.json({
      ok: true,
      data: {
        mode,
        people: r1,
        categories: r2,
        budgets: r3,
        transactions: r4,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
