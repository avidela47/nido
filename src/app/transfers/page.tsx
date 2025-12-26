import { SectionCard } from "../../components/ui/SectionCard";
import TransfersClient from "./TransfersClient";

function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type TransferItem = {
  _id: string;
  transferGroupId: string;
  transferSide: "in" | "out";
  accountId: string;
  date: string | null;
  amount: number;
  note: string;
};

async function getTransfers(month: string): Promise<TransferItem[]> {
  const res = await fetch(`http://localhost:3000/api/transfers?month=${encodeURIComponent(month)}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return data?.ok ? (data.items as TransferItem[]) : [];
}

export default async function TransfersPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const items = await getTransfers(month);

  return (
    <SectionCard title="Transferencias" subtitle="Mover plata entre cuentas. No impacta presupuestos ni reportes.">
      <TransfersClient month={month} initial={items} />
    </SectionCard>
  );
}
