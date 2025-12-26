"use client";

import { useEffect, useMemo, useState } from "react";

type AccountRow = { _id: string; name: string; type: "cash" | "bank" | "wallet" | "credit" };

type TransferTx = {
  _id: string;
  transferGroupId: string;
  transferSide: "in" | "out";
  accountId: string;
  date: string | null;
  amount: number;
  note: string;
};

type TransferRow = {
  transferGroupId: string;
  date: string | null;
  amount: number;
  note: string;
  fromAccountId: string;
  toAccountId: string;
};

function groupTransfers(items: TransferTx[]): TransferRow[] {
  const map = new Map<string, { in?: TransferTx; out?: TransferTx }>();
  for (const t of items) {
    const g = map.get(t.transferGroupId) ?? {};
    if (t.transferSide === "out") g.out = t;
    else g.in = t;
    map.set(t.transferGroupId, g);
  }

  const rows: TransferRow[] = [];
  for (const [gid, pair] of map.entries()) {
    const out = pair.out;
    const inn = pair.in;
    const date = out?.date ?? inn?.date ?? null;
    const amount = out?.amount ?? inn?.amount ?? 0;
    const note = out?.note ?? inn?.note ?? "";

    rows.push({
      transferGroupId: gid,
      date,
      amount,
      note,
      fromAccountId: out?.accountId ?? "",
      toAccountId: inn?.accountId ?? "",
    });
  }

  rows.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });

  return rows;
}

function money(n: number): string {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

export default function TransfersClient({ month, initial }: { month: string; initial: TransferTx[] }) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [items, setItems] = useState<TransferTx[]>(initial);

  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const rows = useMemo(() => groupTransfers(items), [items]);

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
          const list = (json as { accounts: AccountRow[] }).accounts ?? [];
          setAccounts(list);
          setFromAccountId((p) => p || list[0]?._id || "");
        }
      } catch {
        // opcional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const accMap = useMemo(() => new Map(accounts.map((a) => [a._id, a])), [accounts]);

  async function create() {
    setError("");

    if (!fromAccountId) return setError("Elegí cuenta origen.");
    if (!toAccountId) return setError("Elegí cuenta destino.");
    if (fromAccountId === toAccountId) return setError("Origen y destino no pueden ser la misma cuenta.");

    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return setError("Monto inválido.");

    setBusy(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAccountId, toAccountId, amount: num, date, note }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo crear.");

      // refrescar listado del mes
      const res2 = await fetch(`/api/transfers?month=${encodeURIComponent(month)}`, { cache: "no-store" });
      const json2 = await res2.json().catch(() => null);
      if (res2.ok && json2?.ok) setItems(json2.items as TransferTx[]);

      setAmount("");
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(groupId: string) {
    if (!confirm("¿Eliminar esta transferencia? (se oculta en ambos lados)")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/transfers/${groupId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo borrar.");
      // quitar local
      setItems((prev) => prev.filter((t) => t.transferGroupId !== groupId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="text-sm font-semibold">Nueva transferencia</div>
        <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Mueve un monto entre dos cuentas (sin afectar presupuestos).</div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Cuenta origen</div>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}{a.type === "credit" ? " (Tarjeta)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Cuenta destino</div>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}{a.type === "credit" ? " (Tarjeta)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Fecha</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Monto</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              placeholder="Ej: 50000"
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Nota</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {busy ? "Guardando…" : "Crear transferencia"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Transferencias del mes</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Mes: {month}</div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {rows.map((r) => {
            const from = accMap.get(r.fromAccountId)?.name ?? "—";
            const to = accMap.get(r.toAccountId)?.name ?? "—";
            return (
              <div key={r.transferGroupId} className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {from} → {to}
                    </div>
                    <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                      {r.date ? new Date(r.date).toLocaleDateString("es-AR") : "—"}
                      {r.note ? ` · ${r.note}` : ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold">{money(r.amount)}</div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(r.transferGroupId)}
                      className="mt-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-70"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {rows.length === 0 ? (
            <div className="text-sm text-[rgb(var(--subtext))]">Todavía no hay transferencias en este mes.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
