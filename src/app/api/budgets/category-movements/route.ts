import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import { parseMonthRangeUTC } from "../../../../lib/dateRanges";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

type TxType = "income" | "expense" | "transfer";

type TxDoc = {
  _id: ObjectId;
  type?: unknown;
  amount?: unknown;
  date?: unknown;
  note?: unknown;
  accountId?: unknown;
  personId?: unknown;
  categoryId?: unknown;
  deletedAt?: unknown;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? "";
    const categoryId = url.searchParams.get("categoryId") ?? "";

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ ok: false, error: "month inválido (YYYY-MM)" }, { status: 400 });
    }
    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json({ ok: false, error: "categoryId inválido" }, { status: 400 });
    }

    const { start, end } = parseMonthRangeUTC(month);
    const db = await getDb();

    const catObjId = new ObjectId(categoryId);

    const txRaw = (await db
      .collection("transactions")
      .find({
        deletedAt: { $exists: false },
        categoryId: catObjId,
        date: { $gte: start, $lt: end },
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .toArray()) as unknown as TxDoc[];

    const accountIds = Array.from(
      new Set(
        txRaw
          .map((t) => (t.accountId instanceof ObjectId ? t.accountId.toString() : ""))
          .filter(Boolean)
      )
    );

    const personIds = Array.from(
      new Set(
        txRaw
          .map((t) => (t.personId instanceof ObjectId ? t.personId.toString() : ""))
          .filter(Boolean)
      )
    );

    const [accountsRaw, peopleRaw] = await Promise.all([
      accountIds.length
        ? db
            .collection("accounts")
            .find({ _id: { $in: accountIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : Promise.resolve([]),
      personIds.length
        ? db
            .collection("people")
            .find({ _id: { $in: personIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : Promise.resolve([]),
    ]);

    const accountMap = new Map<string, string>();
    for (const a of accountsRaw as Array<{ _id: ObjectId; name?: unknown }>) {
      accountMap.set(a._id.toString(), typeof a.name === "string" ? a.name : "—");
    }

    const personMap = new Map<string, string>();
    for (const p of peopleRaw as Array<{ _id: ObjectId; name?: unknown }>) {
      personMap.set(p._id.toString(), typeof p.name === "string" ? p.name : "—");
    }

    const items = txRaw.map((t) => {
      const id = t._id.toString();
      const type = (t.type === "income" || t.type === "expense" || t.type === "transfer")
        ? (t.type as TxType)
        : "expense";
      const amount = typeof t.amount === "number" ? t.amount : Number(t.amount);
      const date = t.date instanceof Date ? t.date.toISOString() : String(t.date ?? "");
      const note = typeof t.note === "string" ? t.note : undefined;
      const accountIdStr = t.accountId instanceof ObjectId ? t.accountId.toString() : undefined;
      const personIdStr = t.personId instanceof ObjectId ? t.personId.toString() : undefined;

      return {
        _id: id,
        type,
        amount: Number.isFinite(amount) ? amount : 0,
        date,
        note,
        accountId: accountIdStr,
        accountName: accountIdStr ? accountMap.get(accountIdStr) : undefined,
        personId: personIdStr,
        personName: personIdStr ? personMap.get(personIdStr) : undefined,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
