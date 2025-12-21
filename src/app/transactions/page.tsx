import { SectionCard } from "../../components/ui/SectionCard";
import TransactionsClient, { TxItem } from "./TransactionsClient";

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
  searchParams?: { month?: string };
}) {
  const month = searchParams?.month ?? currentMonthYYYYMM();
  const items = await getTransactions(month);

  return (
    <SectionCard title="Movimientos" subtitle="Listado por mes. Editar o borrar (soft delete).">
      <TransactionsClient month={month} items={items} />
    </SectionCard>
  );
}
