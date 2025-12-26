"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TxType = "income" | "expense";
type Person = { _id: string; name: string };
type Category = { _id: string; name: string; type: "income" | "expense" };
type AccountRow = { _id: string; name: string; type: "cash" | "bank" | "wallet" | "credit" };

type Tx = {
  _id: string;
  type: TxType;
  amount: number;
  personId: string;
  categoryId: string;
  accountId?: string;
  date: string; // YYYY-MM-DD
  note: string;
};

function monthFromDateYYYYMM(date: string): string {
  // date: YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!m) return "";
  return `${m[1]}-${m[2]}`;
}

export default function EditTransactionClient({
  tx,
  people,
  categories,
}: {
  tx: Tx;
  people: Person[];
  categories: Category[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const monthParam = useMemo(() => params.get("month") ?? "", [params]);

  const [type, setType] = useState<TxType>(tx.type);
  const [amount, setAmount] = useState<string>(String(tx.amount));
  const [personId, setPersonId] = useState<string>(tx.personId);
  const [categoryId, setCategoryId] = useState<string>(tx.categoryId);
  const [accountId, setAccountId] = useState<string>(tx.accountId ?? "");
  const [date, setDate] = useState<string>(tx.date);
  const [note, setNote] = useState<string>(tx.note);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<AccountRow[]>([]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  useMemo(() => {
    const first = filteredCategories[0]?._id ?? "";
    if (categoryId) {
      const exists = filteredCategories.some((c) => c._id === categoryId);
      if (!exists) setCategoryId(first);
    } else {
      if (first) setCategoryId(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, filteredCategories.length]);

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

  function backUrl() {
    const fallbackMonth = monthFromDateYYYYMM(date) || monthFromDateYYYYMM(tx.date);
    const month = monthParam || fallbackMonth;
    return month ? `/transactions?month=${encodeURIComponent(month)}` : "/transactions";
  }

  async function save() {
    setError("");
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return setError("Monto inválido.");

    setLoading(true);
    const res = await fetch(`/api/transactions/${tx._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        amount: num,
        personId,
        categoryId,
        accountId: accountId || null,
        date,
        note,
      }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "No se pudo guardar.");
      return;
    }

    router.push(backUrl());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Tipo">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold ${
                type === "expense"
                  ? "border-[rgba(var(--brand),0.35)] bg-[rgba(var(--brand),0.10)] text-[rgb(var(--brand-dark))]"
                  : "border-[rgb(var(--border))] bg-white"
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold ${
                type === "income"
                  ? "border-[rgba(var(--brand),0.35)] bg-[rgba(var(--brand),0.10)] text-[rgb(var(--brand-dark))]"
                  : "border-[rgb(var(--border))] bg-white"
              }`}
            >
              Ingreso
            </button>
          </div>
        </Field>

        <Field label="Monto (ARS)">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Persona">
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
          >
            {people.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Categoría">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
          >
            {filteredCategories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cuenta (opcional)">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
          >
            <option value="">Sin cuenta</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}{a.type === "credit" ? " (Tarjeta)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Nota">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push(backUrl())}
          className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-semibold"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {loading ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-[rgb(var(--subtext))]">{label}</div>
      {children}
    </div>
  );
}
