import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "lib/mongodb";

// Endpoint: /api/people/[id]/movements?month=YYYY-MM
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const personId = params.id;
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    if (!personId || !ObjectId.isValid(personId)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }
    const db = await getDb();
    // Buscar cuentas de la persona
    type AccountDoc = { _id: ObjectId | string; name?: string };
    type CategoryDoc = { _id: ObjectId | string; name?: string };
    type TxDoc = {
      _id: ObjectId | string;
      type: string;
      amount: number;
      date: Date | string;
      note?: string;
      accountId?: ObjectId | string;
      categoryId?: ObjectId | string;
    };
    const accounts = await db.collection("accounts").find({ "person._id": personId, active: { $ne: false } }).toArray() as AccountDoc[];
    const accountIds = accounts.map((a) => a._id);
    // Filtro de mes
    let dateFilter = {};
    if (month) {
      const [y, m] = month.split("-").map(Number);
      if (y && m) {
        const start = new Date(Date.UTC(y, m - 1, 1));
        const end = new Date(Date.UTC(y, m, 1));
        dateFilter = { date: { $gte: start, $lt: end } };
      }
    }
    // Movimientos donde la cuenta pertenece a la persona
    const txs = await db.collection("transactions").find({
      deletedAt: { $exists: false },
      accountId: { $in: accountIds },
      ...dateFilter,
    }).sort({ date: -1, createdAt: -1 }).toArray() as TxDoc[];

    // Enriquecer con nombre de cuenta y categoría
    const categoryIds = Array.from(new Set(txs.map((t) => t.categoryId?.toString()).filter(Boolean)));
    const categories = await db.collection("categories").find({ _id: { $in: categoryIds.map((id) => new ObjectId(id)) } }).toArray() as CategoryDoc[];
    const catMap = new Map(categories.map((c) => [c._id.toString(), typeof c.name === "string" ? c.name : "—"]));
    const accMap = new Map(accounts.map((a) => [a._id.toString(), typeof a.name === "string" ? a.name : "—"]));

    const items = txs.map((t) => ({
      _id: t._id.toString(),
      type: t.type,
      amount: t.amount,
      date: t.date instanceof Date ? t.date.toISOString() : t.date,
      note: t.note,
      accountId: t.accountId?.toString(),
      accountName: t.accountId ? accMap.get(t.accountId.toString()) : undefined,
      categoryId: t.categoryId?.toString(),
      categoryName: t.categoryId ? catMap.get(t.categoryId.toString()) : undefined,
    }));
    return NextResponse.json({ ok: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: (err as Error)?.message ?? "Error" }, { status: 500 });
  }
}
