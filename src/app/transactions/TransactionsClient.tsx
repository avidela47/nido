"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AccountRow = {
  _id: string;
  name: string;
  type?: string;
};

export type TxItem = {
  _id: string;
  type: string;
  date: string;
  amount: number;
  note?: string;
  category?: { _id: string; name: string } | null;
  person?: { _id: string; name: string } | null;
  account?: { _id: string; name: string } | null;
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

function currentMonthYYYYMM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function money(amount: number): string {
  return amount.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function moneyTransfer(amount: number, side: "in" | "out" | null | undefined): string {
  const sign = side === "out" ? "-" : side === "in" ? "+" : "";
  return sign + money(Math.abs(amount));
}

export default function TransactionsClient({ month, items, q }: { month: string; items: TxItem[]; q?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const [busyId, setBusyId] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);

  const monthValue = useMemo(() => month || currentMonthYYYYMM(), [month]);
  const accountParam = useMemo(() => params.get("accountId") ?? "", [params]);
  const qParam = useMemo(() => params.get("q") ?? "", [params]);
  const showTransfersParam = useMemo(() => params.get("showTransfers") ?? "", [params]);
  const showTransfers = showTransfersParam === "1";

  const [qDraft, setQDraft] = useState<string>(qParam);

  useEffect(() => {
    // Mantener el input sincronizado si cambian los searchParams (back/forward)
    setQDraft(qParam);
  }, [qParam]);

  function setMonth(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    router.push(`/transactions?${sp.toString()}`);
  }

  function setAccountFilter(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (!next) sp.delete("accountId");
    else sp.set("accountId", next);
    router.push(`/transactions?${sp.toString()}`);
  }

  function toggleTransfers(next: boolean) {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("showTransfers", "1");
    else sp.delete("showTransfers");
    router.push(`/transactions?${sp.toString()}`);
  }

  function setQuery(next: string) {
    const sp = new URLSearchParams(params.toString());
    const trimmed = next.trim();
    if (!trimmed) sp.delete("q");
    else sp.set("q", trimmed);
    router.push(`/transactions?${sp.toString()}`);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      // Evitar push redundante si ya coincide
      if ((qParam ?? "") !== (qDraft ?? "")) setQuery(qDraft);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/accounts", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | { ok: true; accounts: AccountRow[] }
          | { ok: false; error?: string }
          | null;

        if (cancelled) return;
        if (res.ok && json && (json as { ok?: unknown }).ok === true) {
          setAccounts((json as { accounts: AccountRow[] }).accounts ?? []);
        }
      } catch {
        // opcional
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: string) {
    setBusyId(id);
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setBusyId("");
    router.refresh();
  }

  const groupedItems: DisplayItem[] = useMemo(() => {
    const transfersByGroup = new Map<string, TxItem[]>();
    const passthrough: DisplayItem[] = [];

    for (const it of items) {
      if (it.type === "transfer" && it.transfer?.groupId) {
        const arr = transfersByGroup.get(it.transfer.groupId) ?? [];
        arr.push(it);
        transfersByGroup.set(it.transfer.groupId, arr);
      } else {
        passthrough.push(it as DisplayItem);
      }
    }

    const merged: DisplayItem[] = [];
    for (const [groupId, legs] of transfersByGroup.entries()) {
      const outLeg = legs.find((l) => l.transfer?.side === "out") ?? legs[0] ?? null;
      const inLeg = legs.find((l) => l.transfer?.side === "in") ?? (legs.length > 1 ? legs[1] : null);

      const fromAcc = outLeg?.account?._id
        ? { id: outLeg.account._id, name: outLeg.account?.name ?? "(Sin cuenta)" }
        : null;
      const toAcc = inLeg?.account?._id
        ? { id: inLeg.account._id, name: inLeg.account?.name ?? "(Sin cuenta)" }
        : null;

      const amount = Math.abs(outLeg?.amount ?? inLeg?.amount ?? 0);
      const date = outLeg?.date ?? inLeg?.date ?? "";
      const note = (outLeg?.note ?? inLeg?.note ?? "").trim();

      merged.push({
        ...(outLeg ?? (inLeg as TxItem)),
        type: "transfer",
        transfer: { groupId, side: undefined },
        __transfer: {
          groupId,
          fromAccount: fromAcc,
          toAccount: toAcc,
          amount,
          date,
          note,
        },
      });
    }

    const all = [...passthrough, ...merged];
    all.sort((a, b) => {
      const da = a.__transfer?.date ?? a.date ?? "";
      const db = b.__transfer?.date ?? b.date ?? "";
      return db.localeCompare(da);
    });

    return all;
  }, [items]);
 
  // Filtro PRO: texto (q) sobre items agrupados, incluyendo transfers Origen → Destino
  const visibleItems = useMemo(() => {
    let arr = showTransfers ? groupedItems : groupedItems.filter((t) => t.type !== "transfer");
    if (q && q.trim().length > 0) {
      const qNorm = q.trim().toLowerCase();
      arr = arr.filter((t) => {
        const isTransfer = t.type === "transfer";
        const accountName = t.account?.name ?? "";
        let transferPhrase = "";
        if (isTransfer && t.__transfer) {
          const from = t.__transfer.fromAccount?.name ?? "";
          const to = t.__transfer.toAccount?.name ?? "";
          if (from && to) {
            transferPhrase = `${from} → ${to} ${to} → ${from}`;
          }
        }
        const transferHint = isTransfer ? `transferencia ${accountName}` : "";
        const hay = `${t.note ?? ""} ${t.person?.name ?? ""} ${t.category?.name ?? ""} ${accountName} ${transferHint} ${transferPhrase}`.toLowerCase();
        return hay.includes(qNorm);
      });
    }
    return arr;
  }, [groupedItems, showTransfers, q]);

  const totals = useMemo(() => {
    // Totales “financieros”: solo income/expense (exclude transfer)
    let income = 0;
    let expense = 0;
    for (const t of visibleItems) {
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += Math.abs(t.amount);
    }
    return { income, expense, net: income - expense };
  }, [visibleItems]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Cuenta</div>
            <select
              value={accountParam}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            >
              <option value="">Todas</option>
              <option value="__none">Sin cuenta</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold">
            <input type="checkbox" checked={showTransfers} onChange={(e) => toggleTransfers(e.target.checked)} />
            Mostrar transferencias
          </label>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Buscar</div>
            <input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Nota, persona, categoría…"
              className="w-64 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
        </div>

        <Link
          href={`/transactions/new?month=${encodeURIComponent(monthValue)}`}
          className="inline-flex items-center justify-center rounded-2xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white"
        >
          Nuevo movimiento
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-3">
          <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Ingresos</div>
          <div className="mt-1 text-sm font-bold text-emerald-700">{money(totals.income)}</div>
        </div>
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-3">
          <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Gastos</div>
          <div className="mt-1 text-sm font-bold text-red-600">{money(totals.expense)}</div>
        </div>
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-3">
          <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Neto</div>
          <div className={totals.net < 0 ? "mt-1 text-sm font-bold text-red-600" : "mt-1 text-sm font-bold text-emerald-700"}>
            {money(totals.net)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
                {visibleItems.map((t) => {
                  const isTransfer = t.type === "transfer";
                  const meta = isTransfer ? t.__transfer ?? null : null;

                  const displayDate = isTransfer ? meta?.date ?? t.date : t.date;
                  const title = isTransfer
                    ? `Transferencia · ${(meta?.fromAccount?.name ?? "(Sin cuenta)")} → ${(meta?.toAccount?.name ?? "(Sin cuenta)")}`
                    : t.note?.trim() || "(Sin nota)";

                  const amountText = isTransfer ? moneyTransfer(meta?.amount ?? t.amount, "out") : money(t.amount);

                  return (
                    <div
                      key={isTransfer ? `transfer:${meta?.groupId ?? t._id}` : t._id}
                      className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">{displayDate}</div>

                            {isTransfer ? (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                Transferencia
                              </span>
                            ) : (
                              <span className="rounded-full bg-[rgb(var(--muted))] px-2 py-0.5 text-xs font-semibold text-[rgb(var(--text))]">
                                {t.type === "income" ? "Ingreso" : t.type === "expense" ? "Gasto" : t.type}
                              </span>
                            )}

                            {!isTransfer && t.account?.name && (
                              <span className="rounded-full bg-[rgb(var(--muted))] px-2 py-0.5 text-xs font-semibold text-[rgb(var(--text))]">
                                {t.account.name}
                              </span>
                            )}

                            {!isTransfer && t.category?.name && (
                              <span className="rounded-full bg-[rgb(var(--muted))] px-2 py-0.5 text-xs font-semibold text-[rgb(var(--text))]">
                                {t.category.name}
                              </span>
                            )}

                            {!isTransfer && t.person?.name && (
                              <span className="rounded-full bg-[rgb(var(--muted))] px-2 py-0.5 text-xs font-semibold text-[rgb(var(--text))]">
                                {t.person.name}
                              </span>
                            )}
                          </div>

                          {isTransfer ? (
                            <Link
                              href={`/transfers/${encodeURIComponent(meta?.groupId ?? "")}`}
                              className="mt-1 block truncate text-sm font-semibold hover:underline"
                            >
                              {title}
                            </Link>
                          ) : (
                            <div className="mt-1 truncate text-sm font-semibold">{title}</div>
                          )}
                          {isTransfer && meta?.note && (
                            <div className="mt-1 truncate text-xs text-[rgb(var(--subtext))]">{meta.note}</div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 md:items-end">
                          <div className={isTransfer ? "text-base font-bold text-[rgb(var(--text))]" : t.amount < 0 ? "text-base font-bold text-red-600" : "text-base font-bold text-emerald-700"}>
                            {amountText}
                          </div>

                          <div className="flex items-center gap-2">
                            {isTransfer ? (
                              <Link
                                href={`/transfers/${encodeURIComponent(meta?.groupId ?? "")}`}
                                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text))]"
                              >
                                Ver detalle
                              </Link>
                            ) : (
                              <>
                                <Link
                                  href={`/transactions/${t._id}/edit?month=${encodeURIComponent(monthValue)}`}
                                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text))]"
                                >
                                  Editar
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => remove(t._id)}
                                  disabled={busyId === t._id}
                                  className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-70"
                                >
                                  {busyId === t._id ? "Borrando…" : "Borrar"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

        {visibleItems.length === 0 && (
          <div className="text-sm text-[rgb(var(--subtext))]">No hay movimientos en {monthValue}.</div>
        )}
      </div>
    </div>
  );
}


