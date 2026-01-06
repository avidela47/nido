import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { parseMonthRangeUTC } from "./dateRanges";
import { TxType, PersonSummaryRow, CategorySummaryRow } from "./types";

export type MonthlySummary = {
  month: string; // YYYY-MM
  range: { start: string; end: string }; // ISO
  totals: {
    income: number;
    expense: number;
    balance: number;
  };
  byPerson: PersonSummaryRow[];
  byCategory: CategorySummaryRow[];
  byAccount: Array<{
    accountId: string;
    accountName: string;
    balance: number;
    personName?: string;
    type?: string;
  }>;
  recent: Array<{
    _id: string;
    date: string;
    type: string;
    amount: number;
    categoryId?: string;
    categoryName?: string;
    personId?: string;
    personName?: string;
    accountId?: string;
    accountName?: string;
    note?: string;
  }>;
};

// Rango de mes centralizado en lib/dateRanges (YYYY-MM → start/end UTC)
const monthRangeUTC = parseMonthRangeUTC;

type TxAggRow = {
  _id: { personId: ObjectId; type: TxType };
  total: number;
};

type TotalsAggRow = {
  _id: TxType;
  total: number;
};

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
  const db = await getDb();
  const { start, end } = monthRangeUTC(month);

  // Totales (income/expense)
  const totalsAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { deletedAt: { $exists: false }, date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ])
    .toArray()) as unknown as TotalsAggRow[];

  const income = totalsAgg.find((r) => r._id === "income")?.total ?? 0;
  const expense = totalsAgg.find((r) => r._id === "expense")?.total ?? 0;

  // Por persona + tipo
  const byPersonAgg = (await db
    .collection("transactions")
    .aggregate([
      { $match: { deletedAt: { $exists: false }, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { personId: "$personId", type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ])
    .toArray()) as unknown as TxAggRow[];

  const personIds = Array.from(
    new Set(byPersonAgg.map((r) => r._id.personId.toString()))
  );

  const peopleDocs = await db
    .collection("people")
    .find({ _id: { $in: personIds.map((id) => new ObjectId(id)) }, active: true })
    .toArray();

  const peopleMap = new Map<string, string>(
    peopleDocs.map((p) => [p._id.toString(), String((p as { name?: unknown }).name ?? "—")])
  );

  // Construimos tabla por persona
  const personAcc = new Map<
    string,
    { personId: string; personName: string; income: number; expense: number }
  >();

  for (const row of byPersonAgg) {
    const pid = row._id.personId.toString();
    const type = row._id.type;
    const total = Number(row.total) || 0;

    const current = personAcc.get(pid) ?? {
      personId: pid,
      personName: peopleMap.get(pid) ?? "—",
      income: 0,
      expense: 0,
    };

    if (type === "income") current.income += total;
    else current.expense += total;

    personAcc.set(pid, current);
  }

  const byPerson = Array.from(personAcc.values())
    .map((p) => ({
      ...p,
      balance: p.income - p.expense,
    }))
    .sort((a, b) => a.personName.localeCompare(b.personName));

  // --- byCategory ---
  // Obtener categorías expense
  const categories = await db.collection("categories").find({ type: "expense" }).toArray();
  type CategoryDoc = { _id: ObjectId; name: string };
  const categoryMap = new Map((categories as CategoryDoc[]).map((c) => [c._id.toString(), c]));
  // Gastos por categoría
  const spendAgg = await db.collection("transactions").aggregate([
    { $match: { deletedAt: { $exists: false }, type: "expense", date: { $gte: start, $lt: end } } },
    { $group: { _id: "$categoryId", spent: { $sum: "$amount" } } },
  ]).toArray();
  // Presupuestos del mes
  const budgets = await db.collection("budgets").find({ month }).toArray();
  type BudgetDoc = { categoryId: ObjectId; amount: number };
  const budgetMap = new Map((budgets as unknown as BudgetDoc[]).map((b) => [b.categoryId.toString(), b.amount]));
  type SpendAggRow = { _id: ObjectId; spent: number };
  const byCategory = (spendAgg as SpendAggRow[]).map((row) => {
    const id = row._id?.toString();
    const cat = categoryMap.get(id);
    const budget = budgetMap.get(id) ?? 0;
    const percent = budget > 0 ? (row.spent / budget) * 100 : 0;
    let status = "none";
    if (budget > 0) {
      if (row.spent > budget) status = "over";
      else if (percent >= 80) status = "warn";
      else status = "ok";
    }
    return {
      categoryId: id,
      categoryName: cat?.name ?? "—",
      spent: row.spent,
      budget,
      percent,
      status,
    };
  });

  // --- byAccount ---
  const accounts = await db.collection("accounts").find({ active: true }).toArray();
  type AccountDoc = { _id: ObjectId; name: string; person?: ObjectId; type?: string };
  const accountMap = new Map((accounts as AccountDoc[]).map((a) => [a._id.toString(), a]));
  // Mapeo de personas para cuentas
  // Variable peopleDocsAccounts eliminada porque no se usa
  // Variable peopleMapAccounts eliminada porque no se usa
  const accountAgg = await db.collection("transactions").aggregate([
    { $match: { deletedAt: { $exists: false }, date: { $gte: start, $lt: end } } },
    { $group: { _id: "$accountId", balance: { $sum: "$amount" } } },
  ]).toArray();
  type AccountAggRow = { _id: ObjectId; balance: number };
  // Buscar personas faltantes antes de mapear
  // Variable missingPersonIds eliminada porque no se usa
  // Variable validPersonIds eliminada porque no se usa
  // Variables extraPeople y ExtraPersonDoc eliminadas porque no se usan
  // extraPeopleMap ya no se usa

  const byAccount: Array<{ accountId: string; accountName: string; balance: number; personName?: string; type?: string }> = [];
  for (const row of accountAgg as AccountAggRow[]) {
    const id = row._id?.toString();
    const acc = accountMap.get(id);
    let personName = "Sin asignar";
    // Soportar ambos formatos: ObjectId o { _id, name }
    if (acc?.person) {
      let personId = null;
      // Si es un ObjectId
      if (typeof acc.person === "object" && typeof acc.person.toHexString === "function") {
        personId = acc.person.toHexString();
      }
      // Si es un objeto con _id y name
      else if (typeof acc.person === "object" && "_id" in acc.person && "name" in acc.person) {
        personId = acc.person._id?.toString?.() ?? null;
        if (typeof acc.person.name === "string" && acc.person.name.length > 0) {
          personName = acc.person.name;
        }
      }
      // Si es un string
      else if (typeof acc.person === "string" && /^[a-fA-F0-9]{24}$/.test(acc.person)) {
        personId = acc.person;
      }
      if (personName === "Sin asignar" && personId && /^[a-fA-F0-9]{24}$/.test(personId)) {
        const personDoc = await db.collection("people").findOne({ _id: new ObjectId(personId) });
        if (personDoc && typeof personDoc.name === "string" && personDoc.name.length > 0) {
          personName = personDoc.name;
        }
      }
    }
    byAccount.push({
      accountId: id,
      accountName: acc?.name ?? "—",
      balance: row.balance,
      personName,
      type: acc?.type ?? undefined,
    });
  }

  // --- recent ---
  const recentTx = await db.collection("transactions").find({ deletedAt: { $exists: false }, date: { $gte: start, $lt: end } }).sort({ date: -1 }).limit(10).toArray();
  const peopleDocsRecent = await db.collection("people").find({ active: true }).toArray();
  type PersonDoc = { _id: ObjectId; name: string };
  const peopleMapRecent = new Map((peopleDocsRecent as PersonDoc[]).map((p) => [p._id.toString(), p]));
  type TxDoc = {
    _id: ObjectId;
    date: Date;
    type: string;
    amount: number;
    categoryId?: ObjectId;
    personId?: ObjectId;
    accountId?: ObjectId;
    note?: string;
  };
  const recent = (recentTx as TxDoc[]).map((tx) => {
    return {
      _id: tx._id?.toString(),
      date: tx.date?.toISOString?.() ?? String(tx.date),
      type: tx.type,
      amount: tx.amount,
      categoryId: tx.categoryId?.toString(),
      categoryName: (() => {
        const cat = categoryMap.get(String(tx.categoryId));
        return cat && typeof cat.name === "string" ? cat.name : "—";
      })(),
      personId: tx.personId?.toString(),
      personName: (() => {
        const p = peopleMapRecent.get(String(tx.personId));
        return p && typeof p.name === "string" ? p.name : "—";
      })(),
      accountId: tx.accountId?.toString(),
      accountName: (() => {
        const acc = accountMap.get(String(tx.accountId));
        return acc && typeof acc.name === "string" ? acc.name : "—";
      })(),
      note: tx.note,
    };
  });

  return {
    month,
    range: { start: start.toISOString(), end: end.toISOString() },
    totals: {
      income,
      expense,
      balance: income - expense,
    },
    byPerson,
    byCategory,
    byAccount,
    recent,
  };
}
