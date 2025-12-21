import { SectionCard } from "../../../../components/ui/SectionCard";
import { getDb } from "../../../../lib/mongodb";
import EditTransactionClient from "./EditTransactionClient";
import { ObjectId } from "mongodb";

type TxType = "income" | "expense";

type Person = { _id: string; name: string };
type Category = { _id: string; name: string; type: TxType };

type Tx = {
  _id: string;
  type: TxType;
  amount: number;
  personId: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
  note: string;
};

type TxDoc = {
  _id: ObjectId;
  type?: unknown;
  amount?: unknown;
  personId?: unknown;
  categoryId?: unknown;
  date?: unknown;
  note?: unknown;
  deletedAt?: unknown;
};

function isObjectId(v: unknown): v is ObjectId {
  return v instanceof ObjectId;
}

function toTxType(v: unknown): TxType {
  return v === "income" ? "income" : "expense";
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toISODateYYYYMMDD(v: unknown): string {
  const d =
    v instanceof Date ? v : typeof v === "string" ? new Date(v) : new Date(NaN);
  if (Number.isNaN(d.getTime())) {
    // fallback hoy si viniera mal
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export default async function EditTxPage({
  params,
}: {
  params: { id: string };
}) {
  const id = params.id;

  if (!ObjectId.isValid(id)) {
    return (
      <SectionCard title="Editar transacción" subtitle="ID inválido">
        <div className="text-sm text-[rgb(var(--subtext))]">ID inválido.</div>
      </SectionCard>
    );
  }

  const db = await getDb();

  const txDoc = (await db.collection("transactions").findOne({
    _id: new ObjectId(id),
    deletedAt: { $exists: false },
  })) as unknown as TxDoc | null;

  if (!txDoc) {
    return (
      <SectionCard title="Editar transacción" subtitle="No encontrada">
        <div className="text-sm text-[rgb(var(--subtext))]">No existe o fue borrada.</div>
      </SectionCard>
    );
  }

  // People
  const peopleRaw = (await db
    .collection("people")
    .find({ active: true })
    .sort({ createdAt: 1 })
    .toArray()) as unknown as Array<{ _id: ObjectId; name?: unknown }>;

  const people: Person[] = peopleRaw.map((p) => ({
    _id: p._id.toString(),
    name: typeof p.name === "string" ? p.name : String(p.name ?? "—"),
  }));

  // Categories
  const categoriesRaw = (await db
    .collection("categories")
    .find({})
    .sort({ type: 1, name: 1 })
    .toArray()) as unknown as Array<{ _id: ObjectId; name?: unknown; type?: unknown }>;

  const categories: Category[] = categoriesRaw.map((c) => ({
    _id: c._id.toString(),
    name: typeof c.name === "string" ? c.name : String(c.name ?? "—"),
    type: c.type === "income" ? "income" : "expense",
  }));

  // Construcción Tx sin any
  const personId = isObjectId(txDoc.personId) ? txDoc.personId.toString() : "";
  const categoryId = isObjectId(txDoc.categoryId) ? txDoc.categoryId.toString() : "";

  const tx: Tx = {
    _id: txDoc._id.toString(),
    type: toTxType(txDoc.type),
    amount: toNumber(txDoc.amount),
    personId,
    categoryId,
    date: toISODateYYYYMMDD(txDoc.date),
    note: typeof txDoc.note === "string" ? txDoc.note : "",
  };

  return (
    <SectionCard title="Editar transacción" subtitle="Modificar sin perder historial (soft delete).">
      <EditTransactionClient tx={tx} people={people} categories={categories} />
    </SectionCard>
  );
}
