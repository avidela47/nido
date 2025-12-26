import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const db = await getDb();
    const groupId = new ObjectId(id);

    // Traemos ambas patas (out/in) sin borradas
    const legs = await db
      .collection("transactions")
      .find({ transferGroupId: groupId, deletedAt: { $exists: false } })
      .project({
        _id: 1,
        transferGroupId: 1,
        transferSide: 1,
        accountId: 1,
        amount: 1,
        date: 1,
        note: 1,
      })
      .toArray();

    // Enriquecer con nombre de cuenta
    const accountIds = Array.from(new Set(legs.map((l) => l.accountId).filter((x) => ObjectId.isValid(String(x))))).map(
      (x) => new ObjectId(String(x))
    );

    const accounts = accountIds.length
      ? await db
          .collection("accounts")
          .find({ _id: { $in: accountIds } })
          .project({ _id: 1, name: 1, type: 1 })
          .toArray()
      : [];

    const accMap = new Map(accounts.map((a) => [String(a._id), a] as const));

    const normalized = legs.map((l) => {
      const acc = l.accountId ? accMap.get(String(l.accountId)) ?? null : null;
      return {
        _id: String(l._id),
        transferGroupId: String(l.transferGroupId),
        transferSide: l.transferSide as "in" | "out",
        accountId: l.accountId ? String(l.accountId) : "",
        accountName: acc?.name ?? "(Sin cuenta)",
        accountType: acc?.type ?? null,
        amount: Number(l.amount ?? 0),
        date: l.date ? new Date(l.date).toISOString() : null,
        note: (l.note ?? "").toString(),
      };
    });

    return NextResponse.json({ ok: true, groupId: id, legs: normalized });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 500 });
  }
}
