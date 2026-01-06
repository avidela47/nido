"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MonthInput } from "../../components/ui/MonthInput";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../../components/ui/Toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AccountRow = {
  _id: string;
  name: string;
  type?: string;
  person?: { _id: string; name: string } | null;
};

type TxItem = {
  _id: string;
  date: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  note?: string;
  category?: { _id: string; name: string } | null;
  person?: { _id: string; name: string } | null;
  account?: { _id: string; name: string; person?: { _id: string; name: string } | null } | null;
  transfer?: { groupId?: string; side?: "in" | "out" } | null;
};

type TransferDisplay = {
  groupId: string;
  fromAccount: { id: string; name: string } | null;
  toAccount: { id: string; name: string } | null;
  amount: number;
  date: string;
  note: string;
};

export type DisplayItem = TxItem & { __transfer?: TransferDisplay };

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

function yyyymm(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(ym: string, delta: number) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const date = new Date(year, monthIndex, 1);
  date.setMonth(date.getMonth() + delta);
  return yyyymm(date);
}

function groupTransfers(items: TxItem[]): DisplayItem[] {
  const byGroup = new Map<string, TxItem[]>();
  const others: DisplayItem[] = [];

  for (const it of items) {
    if (it.type !== "transfer" || !it.transfer?.groupId) {
      others.push(it);
      continue;
    }
    const key = it.transfer.groupId;
    const arr = byGroup.get(key) ?? [];
    arr.push(it);
    byGroup.set(key, arr);
  }

  const transfers: DisplayItem[] = [];
  for (const [groupId, arr] of byGroup.entries()) {
    const out = arr.find((x) => x.transfer?.side === "out") ?? null;
    const inc = arr.find((x) => x.transfer?.side === "in") ?? null;

    const amount = out?.amount ?? inc?.amount ?? 0;
    const date = out?.date ?? inc?.date ?? "";
    const note = (out?.note ?? inc?.note ?? "").trim();

    const fromAccount = out?.account ? { id: out.account._id, name: out.account.name } : null;
    const toAccount = inc?.account ? { id: inc.account._id, name: inc.account.name } : null;

    const rep: DisplayItem = (out ?? inc ?? arr[0]) as DisplayItem;
    rep.__transfer = { groupId, fromAccount, toAccount, amount, date, note };

    transfers.push(rep);
  }

  const all = [...others, ...transfers];
  all.sort((a, b) => {
    const da = new Date(a.type === "transfer" ? a.__transfer?.date ?? a.date : a.date).getTime();
    const db = new Date(b.type === "transfer" ? b.__transfer?.date ?? b.date : b.date).getTime();
    return db - da;
  });

  return all;
}

export default function TransactionsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const monthParam = useMemo(() => params.get("month") ?? "", [params]);
  const monthValue = useMemo(
    () => (monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : yyyymm(new Date())),
    [monthParam]
  );

  const accountParam = useMemo(() => params.get("accountId") ?? "", [params]);
  const qParam = useMemo(() => params.get("q") ?? "", [params]);
  const showTransfersParam = useMemo(() => params.get("showTransfers") ?? "", [params]);
  const showTransfers = showTransfersParam === "1";

  const [qDraft, setQDraft] = useState<string>(qParam);

  useEffect(() => {
    setQDraft(qParam);
  }, [qParam]);

  function setMonth(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    router.push(`/transactions?${sp.toString()}`);
  }

  function setAccount(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("accountId", next);
    else sp.delete("accountId");
    router.push(`/transactions?${sp.toString()}`);
  }

  function setQ(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set("q", next.trim());
    else sp.delete("q");
    router.push(`/transactions?${sp.toString()}`);
  }

  function toggleTransfers() {
    const sp = new URLSearchParams(params.toString());
    const current = sp.get("showTransfers") === "1";
    if (current) sp.delete("showTransfers");
    else sp.set("showTransfers", "1");
    router.push(`/transactions?${sp.toString()}`);
  }

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [items, setItems] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function removeTx(id: string) {
    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        toast.push({ title: "Error", description: json?.error ?? "No se pudo eliminar.", variant: "error" });
        return;
      }
      setItems((prev) => prev.filter((t) => t._id !== id));
      toast.push({ title: "Eliminado", description: "Movimiento eliminado (soft delete).", variant: "ok" });
    } catch (e) {
      toast.push({ title: "Error", description: String(e), variant: "error" });
    }
  }

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const a = await fetch("/api/accounts").then((r) => r.json());
        if (canceled) return;
        setAccounts(Array.isArray(a) ? a : []);
      } catch {
        // no bloquear UI
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    setLoading(true);

    const sp = new URLSearchParams();
    sp.set("month", monthValue);
    if (accountParam) sp.set("accountId", accountParam);
    if (qParam) sp.set("q", qParam);
    if (showTransfers) sp.set("showTransfers", "1");

    fetch(`/api/transactions?${sp.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (canceled) return;
        // API contract: { ok: true, month, items }
        const items = Array.isArray((data as { items?: unknown } | null)?.items)
          ? ((data as { items: TxItem[] }).items ?? [])
          : [];
        setItems(items);
      })
      .catch((e) => {
        toast.push({ title: "Error", description: String(e), variant: "error" });
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [monthValue, accountParam, qParam, showTransfers, toast]);

  const displayItems: DisplayItem[] = useMemo(() => {
    const grouped = groupTransfers(items);
    if (showTransfers) return grouped;
    return grouped.filter((x) => x.type !== "transfer");
  }, [items, showTransfers]);

  const Fab = (
    <div className="fixed bottom-6 right-6 z-50">
      <Link
        href={`/transactions/new?month=${monthValue}${accountParam ? `&accountId=${encodeURIComponent(accountParam)}` : ""}`}
        className="rounded-full bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-95"
      >
        Nuevo
      </Link>
    </div>
  );

  return (
    <div className="space-y-4">
      {Fab}

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div>
          <div className="text-sm font-semibold">Movimientos</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Listado por mes. Editar o borrar (soft delete).</div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {/* Fila mes */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-2xl border border-[rgb(var(--brand))] bg-[rgba(16,185,129,0.06)] px-3 py-2 text-sm text-[rgb(var(--brand))] hover:bg-[rgba(16,185,129,0.12)]"
              onClick={() => setMonth(addMonths(monthValue, -1))}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
              <MonthInput value={monthValue} onChange={(e) => setMonth(e.currentTarget.value)} />
            </div>

            <button
              type="button"
              className="rounded-2xl border border-[rgb(var(--brand))] bg-[rgba(16,185,129,0.06)] px-3 py-2 text-sm text-[rgb(var(--brand))] hover:bg-[rgba(16,185,129,0.12)]"
              onClick={() => setMonth(addMonths(monthValue, +1))}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Fila filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
              value={accountParam}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Todas las cuentas</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>

            <input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Buscar (nota, categoría, persona)"
              className="w-75 max-w-[70vw] rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            />

            <button
              type="button"
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm hover:bg-[rgb(var(--muted))]"
              onClick={() => setQ(qDraft)}
            >
              Buscar
            </button>

            <button
              type="button"
              className={[
                "rounded-2xl border border-[rgb(var(--border))] px-3 py-2 text-sm transition",
                showTransfers ? "bg-[rgb(var(--muted))]" : "bg-white hover:bg-[rgb(var(--muted))]",
              ].join(" ")}
              onClick={toggleTransfers}
              title="Mostrar/ocultar transferencias"
            >
              Transfers
            </button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? <div className="text-sm text-[rgb(var(--subtext))]">Cargando...</div> : null}

          <div className="mt-3 space-y-2">
            {!loading &&
              displayItems.map((t) => {
                const isTransfer = t.type === "transfer";
                const transferSide = t.transfer?.side ?? null;

                const signedLabel =
                  t.type === "income"
                    ? `+ ${money(t.amount)}`
                    : t.type === "expense"
                    ? `- ${money(t.amount)}`
                    : transferSide === "in"
                    ? `+ ${money(t.amount)}`
                    : transferSide === "out"
                    ? `- ${money(t.amount)}`
                    : money(t.amount);

                const title = isTransfer
                  ? (() => {
                      const tr = t.__transfer;
                      if (!tr) return "Transferencia";
                      const from = tr.fromAccount?.name ?? "—";
                      const to = tr.toAccount?.name ?? "—";
                      return `Transferencia: ${from} → ${to}`;
                    })()
                  : t.category?.name ?? (t.type === "income" ? "Ingreso" : "Pago");

                const subtitleParts: string[] = [];
                if (!isTransfer) {
                  if (t.account?.name) subtitleParts.push(`Cuenta: ${t.account.name}`);
                  if (t.person?.name) subtitleParts.push(`Persona: ${t.person.name}`);
                  if (t.note) subtitleParts.push(t.note);
                } else {
                  const tr = t.__transfer;
                  if (tr?.note) subtitleParts.push(tr.note);
                }

                const subtitle = subtitleParts.filter(Boolean).join(" · ");

                const dateStr = (() => {
                  const d = isTransfer ? t.__transfer?.date ?? t.date : t.date;
                  try {
                    return new Date(d).toLocaleDateString("es-AR");
                  } catch {
                    return d;
                  }
                })();

                const isNegative = t.type === "expense" || transferSide === "out";

                return (
                  <div key={t._id} className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{title}</div>
                        <div className="mt-1 text-xs text-[rgb(var(--subtext))] truncate">{subtitle}</div>
                        <div className="mt-1 text-xs text-[rgb(var(--subtext))]">{dateStr}</div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className={`text-sm font-semibold ${isNegative ? "text-red-700" : "text-emerald-700"}`}>
                          {signedLabel}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-2">
                          <Link
                            href={`/transactions/${t._id}/edit?month=${encodeURIComponent(monthValue)}`}
                            className="inline-flex items-center rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-1 text-xs font-semibold text-[rgb(var(--accent))] hover:opacity-90"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => void removeTx(t._id)}
                            className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:opacity-90"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {displayItems.length === 0 && !loading ? (
              <div className="text-sm text-[rgb(var(--subtext))]">No hay movimientos en {monthValue}.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


