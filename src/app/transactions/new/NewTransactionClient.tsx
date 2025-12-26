"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Save } from "lucide-react";
import { useToast } from "../../../components/ui/Toast";
import { parseMoney, isValidDateYYYYMMDD } from "../../../lib/validators";

type PersonRow = { _id: string; name: string };
type CategoryRow = { _id: string; name: string; type: "income" | "expense" };
type AccountRow = { _id: string; name: string; type: "cash" | "bank" | "wallet" | "credit" };

type Form = {
  type: "income" | "expense";
  date: string;
  amount: string;
  personId: string;
  categoryId: string;
  accountId: string; // "" = sin cuenta
  note: string;
};

function todayYYYYMMDD(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewTransactionClient({
  people,
  categories,
}: {
  people: PersonRow[];
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState<Form>({
    type: "expense",
    date: todayYYYYMMDD(),
    amount: "",
    personId: people[0]?._id ?? "",
    categoryId: "",
    accountId: "",
    note: "",
  });

  const [accounts, setAccounts] = useState<AccountRow[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === form.type);
  }, [categories, form.type]);

  // Cuentas para selector (opcional)
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
        // silencioso: la cuenta es opcional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function validate(f: Form): string | null {
    if (f.type !== "income" && f.type !== "expense") return "Tipo inválido.";
    if (!isValidDateYYYYMMDD(f.date)) return "Fecha inválida.";
    const amount = parseMoney(f.amount);
    if (amount === null || amount <= 0) return "Ingresá un monto válido mayor a 0.";
    if (!f.personId) return "Seleccioná una persona.";
    if (!f.categoryId) return "Seleccioná una categoría.";
    return null;
  }

  async function submit() {
    setError("");
    const msg = validate(form);
    if (msg) {
      setError(msg);
      toast.push({ title: "Revisá el formulario", description: msg, variant: "error" });
      return;
    }

    const amount = parseMoney(form.amount)!;

    setSaving(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        date: form.date,
        amount,
        personId: form.personId,
        categoryId: form.categoryId,
        accountId: form.accountId || undefined,
        note: form.note ?? "",
      }),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !json?.ok) {
      const msg2 = json?.error ?? "No se pudo guardar.";
      setError(msg2);
      toast.push({ title: "Error al guardar", description: msg2, variant: "error" });
      return;
    }

    toast.push({ title: "Guardado", description: "Movimiento creado correctamente.", variant: "ok" });

    // Redirección limpia
    router.push("/transactions");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Tipo */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="text-sm font-semibold">Tipo</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, type: "income", categoryId: "" }))}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              form.type === "income"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-[rgb(var(--border))] bg-white hover:bg-[rgb(var(--muted))]"
            }`}
          >
            <ArrowUpCircle size={18} />
            Ingreso
          </button>

          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, type: "expense", categoryId: "" }))}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              form.type === "expense"
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-[rgb(var(--border))] bg-white hover:bg-[rgb(var(--muted))]"
            }`}
          >
            <ArrowDownCircle size={18} />
            Gasto
          </button>
        </div>
      </div>

      {/* Datos */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Fecha</div>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Monto (ARS)</div>
            <input
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              inputMode="numeric"
              placeholder="Ej: 150000"
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Persona</div>
            <select
              value={form.personId}
              onChange={(e) => setForm((p) => ({ ...p, personId: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar…</option>
              {people.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Categoría</div>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar…</option>
              {filteredCategories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="mt-1 text-[11px] text-[rgb(var(--subtext))]">
              Mostrando categorías de: <span className="font-semibold">{form.type === "income" ? "Ingresos" : "Gastos"}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Cuenta (opcional)</div>
            <select
              value={form.accountId}
              onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Sin cuenta</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}{a.type === "credit" ? " (Tarjeta)" : ""}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-[rgb(var(--subtext))]">
              Te sirve para filtrar por cuenta y, más adelante, para cierres de tarjeta.
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Nota</div>
            <input
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Opcional"
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            <Save size={16} />
            {saving ? "Guardando…" : "Guardar movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}




