"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/ui/Toast";

type LedgerItem = {
  _id: string;
  date: string;
  type: string;
  amount: number;
  signed: number;
  running: number;
  note: string;
  personName: string;
  categoryName: string;
  transferGroupId: string;
  transferSide: string;
};

type LedgerResponse = {
  ok: boolean;
  error?: string;
  account?: { _id: string; name: string; type: string; active: boolean };
  month?: string | null;
  totals?: { count: number; balance: number; income: number; expense: number };
  items?: LedgerItem[];
};

function money(n: number): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

function moneyWithSign(n: number): string {
  const abs = Math.abs(n);
  const formatted = money(abs);
  return n < 0 ? `- ${formatted}` : formatted;
}

export default function AccountLedgerModal({
  open,
  onClose,
  accountId,
  month,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  month: string;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LedgerResponse | null>(null);

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("accountId", accountId);
    if (month) sp.set("month", month);
    return `/api/debug/account-ledger?${sp.toString()}`;
  }, [accountId, month]);

  useEffect(() => {
    if (!open) return;
    let canceled = false;
    queueMicrotask(() => {
      if (!canceled) setLoading(true);
    });
    fetch(url)
      .then((r) => r.json())
      .then((json: LedgerResponse) => {
        if (canceled) return;
        setData(json);
        if (!json?.ok) {
          toast.push({ title: "Error", description: json?.error ?? "No se pudo cargar el detalle.", variant: "error" });
        }
      })
      .catch((e) => {
        if (canceled) return;
        toast.push({ title: "Error", description: String(e), variant: "error" });
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [open, url, toast]);

  if (!open) return null;

  const title = data?.account?.name ? `Detalle de cuenta: ${data.account.name}` : "Detalle de cuenta";

  return (
    <div className="fixed inset-0 z-80">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute left-1/2 top-6 w-[min(1000px,calc(100vw-2rem))] -translate-x-1/2 rounded-3xl border border-[rgb(var(--border))] bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_18px_70px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-3 border-b border-[rgb(var(--border))] px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
              Mes: <span className="font-semibold">{month}</span> · Movimientos: {data?.totals?.count ?? "—"} · Saldo: {money(data?.totals?.balance ?? 0)}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold hover:bg-[rgb(var(--muted))]"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto px-5 py-4">
          {loading ? <div className="text-sm text-[rgb(var(--subtext))]">Cargando…</div> : null}

          {!loading && data?.ok && Array.isArray(data.items) ? (
            <div className="space-y-2">
              {data.items.map((it) => {
                const isNeg = it.signed < 0;
                const label = it.type === "transfer" ? `Transfer (${it.transferSide})` : it.type === "income" ? "Ingreso" : "Pago";
                const metaParts: string[] = [];
                if (it.categoryName) metaParts.push(it.categoryName);
                if (it.personName) metaParts.push(it.personName);
                if (it.note) metaParts.push(it.note);
                const meta = metaParts.filter(Boolean).join(" · ");

                return (
                  <div key={it._id} className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{label}</div>
                        <div className="mt-1 text-xs text-[rgb(var(--subtext))] truncate">{meta}</div>
                        <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                          {new Date(it.date).toLocaleDateString("es-AR")}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className={`text-sm font-semibold ${isNeg ? "text-red-700" : "text-emerald-700"}`}>
                          {it.signed < 0 ? "-" : "+"} {money(Math.abs(it.signed))}
                        </div>
                        <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Saldo: {moneyWithSign(it.running)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {!loading && (!data || !data.ok) ? (
            <div className="text-sm text-[rgb(var(--subtext))]">No se pudo cargar el detalle.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
