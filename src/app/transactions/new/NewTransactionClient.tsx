"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Person = { _id: string; name: string };
type Category = { _id: string; name: string; type: "income" | "expense" };
type TxType = "income" | "expense";

function monthFromDateYYYYMM(date: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!m) return "";
  return `${m[1]}-${m[2]}`;
}

export default function NewTransactionClient({
  people,
  categories,
  defaultDate,
  backMonth,
}: {
  people: Person[];
  categories: Category[];
  defaultDate: string;
  backMonth: string;
}) {
  const router = useRouter();

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState<string>("");
  const [personId, setPersonId] = useState<string>(people[0]?._id ?? "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState<string>(defaultDate);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  useMemo(() => {
    const first = filteredCategories[0]?._id ?? "";
    if (!categoryId && first) setCategoryId(first);
    if (categoryId) {
      const exists = filteredCategories.some((c) => c._id === categoryId);
      if (!exists) setCategoryId(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, filteredCategories.length]);

  function backUrl(): string {
    const month = backMonth || monthFromDateYYYYMM(date);
    return month ? `/transactions?month=${encodeURIComponent(month)}` : "/transactions";
  }

  async function submit() {
    setError("");

    const num = Number(amount);
    if (!personId) return setError("Elegí una persona.");
    if (!categoryId) return setError("Elegí una categoría.");
    if (!Number.isFinite(num) || num <= 0) return setError("Monto inválido.");

    setLoading(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        amount: num,
        personId,
        categoryId,
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
            placeholder="Ej: 38500"
            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:border-[rgba(var(--brand),0.45)] focus:ring-2 focus:ring-[rgba(var(--brand),0.18)]"
          />
        </Field>

        <Field label="Persona (imputación)">
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

        <Field label="Fecha">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Nota (opcional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: compra supermercado"
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
          onClick={submit}
          disabled={loading}
          className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {loading ? "Guardando…" : "Guardar transacción"}
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



