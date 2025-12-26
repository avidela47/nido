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
  const accounts = await db.collection("accounts").find({ "person._id": personId, active: { $ne: false } }).toArray();
  const accountIds = accounts.map((a: { _id: string | ObjectId }) => a._id);
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
    }).sort({ date: -1, createdAt: -1 }).toArray();
    return NextResponse.json({ ok: true, items: txs });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: (err as Error)?.message ?? "Error" }, { status: 500 });
  }
}
