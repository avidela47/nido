import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { parseMonthRangeUTC } from "../../../../lib/dateRanges";

function toNum(x: unknown): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : 0;
}

function signedAmount(tx: { type?: unknown; amount?: unknown; transferSide?: unknown }): number {
  const type = String(tx.type ?? "");
  const amt = toNum(tx.amount);
  if (type === "income") return amt;
  if (type === "expense") return -amt;
  if (type === "transfer") {
    const side = String(tx.transferSide ?? "");
    if (side === "in") return amt;
    if (side === "out") return -amt;
  }
  return 0;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const month = searchParams.get("month");

    if (!accountId || !ObjectId.isValid(accountId)) {
      return NextResponse.json({ ok: false, error: "accountId inválido" }, { status: 400 });
    }

    const db = await getDb();

    const account = await db
      .collection("accounts")
      .findOne({ _id: new ObjectId(accountId) }, { projection: { name: 1, type: 1, person: 1, active: 1 } });

    const match: Record<string, unknown> = {
      deletedAt: { $exists: false },
      accountId: new ObjectId(accountId),
    };

    let start: Date | null = null;
    let end: Date | null = null;
    if (month) {
      const r = parseMonthRangeUTC(month);
      start = r.start;
      end = r.end;
      match.date = { $gte: start, $lt: end };
    }

    type TxDoc = {
      _id: ObjectId;
      date: Date;
      type: string;
      amount: number;
      note?: string;
      personId?: ObjectId;
      categoryId?: ObjectId;
      transferGroupId?: ObjectId;
      transferSide?: "in" | "out";
    };

    const txs = (await db
      .collection("transactions")
      .find(match)
      .sort({ date: 1, _id: 1 })
      .toArray()) as unknown as TxDoc[];

    // Pre-cargar nombres para que sea fácil leer
    const personIds = Array.from(new Set(txs.map((t) => t.personId?.toString()).filter(Boolean))) as string[];
    const categoryIds = Array.from(new Set(txs.map((t) => t.categoryId?.toString()).filter(Boolean))) as string[];

    const people = personIds.length
      ? await db
          .collection("people")
          .find({ _id: { $in: personIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } })
          .toArray()
      : [];
    const categories = categoryIds.length
      ? await db
          .collection("categories")
          .find({ _id: { $in: categoryIds.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } })
          .toArray()
      : [];

    const peopleMap = new Map<string, string>(
      (people as Array<{ _id: ObjectId; name?: unknown }>).map((p) => [p._id.toString(), String(p.name ?? "—")])
    );
    const catMap = new Map<string, string>(
      (categories as Array<{ _id: ObjectId; name?: unknown }>).map((c) => [c._id.toString(), String(c.name ?? "—")])
    );

    let running = 0;
    const items = txs.map((t) => {
      const signed = signedAmount(t);
      running += signed;
      return {
        _id: t._id.toString(),
        date: t.date?.toISOString?.() ?? String(t.date),
        type: t.type,
        amount: t.amount,
        signed,
        running,
        note: t.note ?? "",
        personName: t.personId ? peopleMap.get(t.personId.toString()) ?? "—" : "",
        categoryName: t.categoryId ? catMap.get(t.categoryId.toString()) ?? "—" : "",
        transferGroupId: t.transferGroupId?.toString() ?? "",
        transferSide: t.transferSide ?? "",
      };
    });

    return NextResponse.json({
      ok: true,
      account: {
        _id: accountId,
        name: String((account as { name?: unknown } | null)?.name ?? "—"),
        type: String((account as { type?: unknown } | null)?.type ?? ""),
        active: Boolean((account as { active?: unknown } | null)?.active ?? true),
      },
      month: month ?? null,
      range: start && end ? { start: start.toISOString(), end: end.toISOString() } : null,
      totals: {
        count: items.length,
        balance: running,
        income: items.filter((x) => x.signed > 0).reduce((a, b) => a + b.signed, 0),
        expense: items.filter((x) => x.signed < 0).reduce((a, b) => a + b.signed, 0),
      },
      items,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
