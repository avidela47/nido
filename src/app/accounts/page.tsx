import { SectionCard } from "../../components/ui/SectionCard";
import { getDb } from "../../lib/mongodb";
import AccountsClient from "./AccountsClient";

type AccountType = "cash" | "bank" | "wallet" | "credit";

type Person = { _id: string; name: string };
type Account = {
  _id: string;
  name: string;
  type: AccountType;
  active: boolean;
  credit: null | { statementDay: number; dueDay: number; limit?: number };
  person?: Person | null;
};

function isAccountType(v: unknown): v is AccountType {
  return v === "cash" || v === "bank" || v === "wallet" || v === "credit";
}

function toInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

export default async function AccountsPage() {
  const db = await getDb();

  const [raw, peopleRaw] = await Promise.all([
    db.collection("accounts").find({ active: { $ne: false } }).sort({ createdAt: 1 }).toArray(),
    db.collection("people").find({ active: true }).sort({ createdAt: 1 }).toArray(),
  ]);

  const people: Person[] = peopleRaw.map((p) => ({
    _id: p._id.toString(),
    name: String(p.name),
  }));

  const accounts: Account[] = raw.map((a) => {
    const doc = a as unknown as { _id: { toString: () => string }; name?: unknown; type?: unknown; active?: unknown; credit?: unknown; person?: { _id?: unknown; name?: unknown } };

    const credit =
      doc.type === "credit" && doc.credit && typeof doc.credit === "object"
        ? (doc.credit as { statementDay?: unknown; dueDay?: unknown; limit?: unknown })
        : null;

    const person = doc.person && typeof doc.person === "object"
      ? {
          _id: typeof doc.person._id === "string" ? doc.person._id : (doc.person._id instanceof Object ? doc.person._id.toString() : ""),
          name: typeof doc.person.name === "string" ? doc.person.name : "—",
        }
      : null;

    return {
      _id: doc._id.toString(),
      name: typeof doc.name === "string" ? doc.name : "—",
      type: isAccountType(doc.type) ? doc.type : "cash",
      active: doc.active !== false,
      credit: credit
        ? {
            statementDay: toInt(credit.statementDay),
            dueDay: toInt(credit.dueDay),
            limit: credit.limit !== undefined ? Number(credit.limit) : undefined,
          }
        : null,
      person,
    };
  });

  return (
    <SectionCard title="Cuentas" subtitle="Bancos, billeteras, efectivo y tarjetas (con cierre).">
      <AccountsClient initial={accounts} people={people} />
    </SectionCard>
  );
}
