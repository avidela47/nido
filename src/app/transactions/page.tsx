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
  searchParams?: Promise<{ month?: string; q?: string; accountId?: string; personId?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const q = (sp.q ?? "").trim().toLowerCase();
  const accountId = (sp.accountId ?? "").trim();
  const personId = (sp.personId ?? "").trim();
  const items = await getTransactions(month);


  const filtered = items.filter((t) => {
    // Filtro por cuenta
    let cuentaOk = true;
    if (accountId && accountId !== "__none__") {
      if (!t.account) return false;
      const accId = typeof t.account === "string"
        ? t.account
        : typeof t.account._id === "string"
        ? t.account._id
        : undefined;
      cuentaOk = accId === accountId;
    } else if (accountId === "__none__") {
      cuentaOk = !t.account;
    }
    // Filtro por persona mejorado: incluye movimientos donde la cuenta está vinculada a la persona
    let personaOk = true;
    if (personId) {
      const esPersona = t.person && ((typeof t.person === "string" && t.person === personId) || (typeof t.person === "object" && t.person._id === personId));
  const esCuentaPersona = t.account && t.account.person && t.account.person._id === personId;
  personaOk = !!(esPersona || esCuentaPersona);
    }
    return cuentaOk && personaOk;
  });

  return (
    <SectionCard title="Movimientos" subtitle="Listado por mes. Editar o borrar (soft delete).">
      <TransactionsClient month={month} items={filtered} q={q} />
    </SectionCard>
  );
}
