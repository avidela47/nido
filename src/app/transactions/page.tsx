import { SectionCard } from "../../components/ui/SectionCard";
import TransactionsClient, { TxItem } from "./TransactionsClient";
import { ObjectId } from "mongodb";

function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function getTransactions(month: string): Promise<TxItem[]> {
  const res = await fetch(`http://localhost:3000/api/transactions?month=${encodeURIComponent(month)}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return data?.ok ? (data.items as TxItem[]) : [];
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; q?: string; accountId?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const q = (sp.q ?? "").trim().toLowerCase();
  const accountId = (sp.accountId ?? "").trim();
  const items = await getTransactions(month);


  const filtered =
    !accountId
      ? items
      : accountId === "__none__"
      ? items.filter((t) => !t.account)
      : ObjectId.isValid(accountId)
      ? items.filter((t) => t.account?._id === accountId)
      : items;

  return (
    <SectionCard title="Movimientos" subtitle="Listado por mes. Editar o borrar (soft delete).">
      <TransactionsClient month={month} items={filtered} q={q} />
    </SectionCard>
  );
}
