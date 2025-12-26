"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Save, Trash2, X, CreditCard, Wallet, Landmark, Smartphone } from "lucide-react";

type SummaryItem = {
  key: string; // accountId o "__none__"
  account: null | { _id: string; name: string; type: AccountType; person?: Person | null };
  income: number;
  expense: number;
  net: number;
  count: number;
  last: Array<{ _id: string; type: "income" | "expense"; amount: number; date: string; note: string }>;
};

type AccountType = "cash" | "bank" | "wallet" | "credit";

type Person = { _id: string; name: string };
type Account = {
  _id: string;
  name: string;
  type: AccountType;
  active: boolean;
  credit: null | { statementDay: number; dueDay: number; limit?: number };
  person?: Person | null;
};

function typeLabel(t: AccountType): string {
  if (t === "cash") return "Efectivo";
  if (t === "bank") return "Banco";
  if (t === "wallet") return "Billetera";
  return "Tarjeta";
}

function iconFor(t: AccountType) {
  if (t === "cash") return Wallet;
  if (t === "bank") return Landmark;
  if (t === "wallet") return Smartphone;
  return CreditCard;
}

function badgeClass(t: AccountType): string {
  if (t === "credit") return "bg-violet-50 text-violet-700 border-violet-200";
  if (t === "bank") return "bg-sky-50 text-sky-700 border-sky-200";
  if (t === "wallet") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function normalizeName(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

export default function AccountsClient({ initial, people }: { initial: Account[]; people: Person[] }) {
  const [items, setItems] = useState<Account[]>(initial);

  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [summary, setSummary] = useState<SummaryItem[] | null>(null);
  const [summaryError, setSummaryError] = useState<string>("");

  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // create form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AccountType>("cash");
  const [newStatementDay, setNewStatementDay] = useState("10");
  const [newDueDay, setNewDueDay] = useState("20");
  const [newPersonId, setNewPersonId] = useState<string>(people[0]?._id ?? "");

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountType>("cash");
  const [editStatementDay, setEditStatementDay] = useState("10");
  const [editDueDay, setEditDueDay] = useState("20");
  const [editPersonId, setEditPersonId] = useState<string>("");

  const activeItems = useMemo(() => items.filter((a) => a.active), [items]);

  useEffect(() => {
    let cancelled = false;
    setSummaryError("");

    (async () => {
      try {
        const res = await fetch(`/api/accounts/summary?month=${encodeURIComponent(month)}`);
        const json = (await res.json().catch(() => null)) as
          | { ok: true; items: SummaryItem[] }
          | { ok: false; error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok || !json || (json as { ok?: unknown }).ok !== true) {
          setSummary(null);
          setSummaryError((json as { error?: string } | null)?.error ?? "No se pudo cargar el resumen.");
          return;
        }
        setSummary((json as { items: SummaryItem[] }).items ?? []);
      } catch {
        if (!cancelled) {
          setSummary(null);
          setSummaryError("No se pudo cargar el resumen.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month]);

  function money(n: number): string {
    try {
      return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `$${Math.round(n)}`;
    }
  }

  function startCreate() {
    setError("");
    setCreating(true);
    setNewName("");
    setNewType("cash");
    setNewStatementDay("10");
    setNewDueDay("20");
    setNewPersonId(people[0]?._id ?? "");
  }

  function cancelCreate() {
    setCreating(false);
    setError("");
  }

  function startEdit(a: Account) {
    setError("");
    setEditingId(a._id);
    setEditName(a.name);
    setEditType(a.type);
    setEditStatementDay(String(a.credit?.statementDay ?? 10));
    setEditDueDay(String(a.credit?.dueDay ?? 20));
    setEditPersonId(a.person?._id ?? people[0]?._id ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
  }

  async function createAccount() {
    setError("");

    const name = normalizeName(newName);
    if (!name) return setError("Nombre inválido.");
    const person = people.find((p) => p._id === newPersonId);
    if (!person) return setError("Seleccioná una persona.");

    setBusy(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: newType,
          credit:
            newType === "credit"
              ? { statementDay: Number(newStatementDay), dueDay: Number(newDueDay) }
              : undefined,
          person: { _id: person._id, name: person.name },
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo crear.");

      const next: Account = {
        _id: String(json.id),
        name,
        type: newType,
        active: true,
        credit:
          newType === "credit"
            ? { statementDay: Number(newStatementDay), dueDay: Number(newDueDay) }
            : null,
        person,
      };

      setItems((p) => [...p, next]);
      setCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    setError("");

    const name = normalizeName(editName);
    if (!name) return setError("Nombre inválido.");
    const person = people.find((p) => p._id === editPersonId);
    if (!person) return setError("Seleccioná una persona.");

    setBusy(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name,
          type: editType,
          credit:
            editType === "credit"
              ? { statementDay: Number(editStatementDay), dueDay: Number(editDueDay) }
              : undefined,
          person: { _id: person._id, name: person.name },
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo guardar.");

      setItems((p) =>
        p.map((a) =>
          a._id === editingId
            ? {
                ...a,
                name,
                type: editType,
                credit:
                  editType === "credit"
                    ? { statementDay: Number(editStatementDay), dueDay: Number(editDueDay) }
                    : null,
                person,
              }
            : a
        )
      );

      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(a: Account) {
    if (!a._id || a.name === "Sin cuenta") {
      setError("No se puede borrar la cuenta 'Sin cuenta'.");
      return;
    }
    if (!confirm(`¿Desactivar la cuenta "${a.name}"? (No se borra del historial)`)) return;

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/accounts?id=${encodeURIComponent(a._id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo desactivar.");

      setItems((p) => p.map((x) => (x._id === a._id ? { ...x, active: false } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desactivar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Resumen del mes</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
              Ingresos · Gastos · Neto por cuenta (y movimientos “Sin cuenta”).
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>
        </div>

        {summaryError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {summaryError}
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {(summary ?? []).map((s) => {
            // Ocultar la tarjeta 'Sin cuenta' (la que no tiene cuenta asociada)
            if (!s.account) return null;
            const t = s.account.type;
            const Icon = iconFor(t);
            // Mostrar 'Persona · Cuenta' si hay persona, si no solo cuenta
            let label = s.account.name;
            if (s.account.person && s.account.person.name && s.account.person.name.trim() && s.account.person.name.trim().toLowerCase() !== s.account.name.trim().toLowerCase()) {
              label = `${s.account.person.name} · ${s.account.name}`;
            }
            const filter = s.account._id;

            return (
              <a
                key={s.key}
                href={`/transactions?month=${encodeURIComponent(month)}&accountId=${encodeURIComponent(filter)}`}
                className="group rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 transition hover:bg-[rgb(var(--muted))]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass(t)}`}>
                        <Icon size={14} /> {typeLabel(t)}
                      </span>
                      <div className="truncate text-sm font-semibold group-hover:underline">{label}</div>
                    </div>
                    <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                      {s.count} mov. · Neto: <span className="font-semibold">{money(s.net)}</span>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <div className="text-green-700">+ {money(s.income)}</div>
                    <div className="text-red-700">- {money(s.expense)}</div>
                  </div>
                </div>

                {s.last.length ? (
                  <div className="mt-3 border-t border-[rgb(var(--border))] pt-2">
                    <div className="text-[11px] font-semibold text-[rgb(var(--subtext))]">Últimos movimientos</div>
                    <div className="mt-1 space-y-1">
                      {s.last.map((t2) => (
                        <div key={t2._id} className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 truncate">
                            <span className={t2.type === "income" ? "text-green-700" : "text-red-700"}>
                              {t2.type === "income" ? "+" : "-"}
                            </span>{" "}
                            <span className="font-semibold">{money(t2.amount)}</span>
                            {t2.note ? <span className="text-[rgb(var(--subtext))]"> · {t2.note}</span> : null}
                          </div>
                          <div className="shrink-0 text-[11px] text-[rgb(var(--subtext))]">
                            {new Date(t2.date).toLocaleDateString("es-AR")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </a>
            );
          })}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Cuentas</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            Bancos, billeteras, efectivo y tarjetas. (Podés cargar movimientos sin cuenta y ordenarlos después.)
          </div>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Nueva
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {creating ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Nueva cuenta</div>
            <button type="button" onClick={cancelCreate} className="rounded-2xl border border-[rgb(var(--border))] bg-white p-2">
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nombre">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Visa BBVA"
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
              />
            </Field>

            <Field label="Tipo">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as AccountType)}
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
              >
                <option value="cash">Efectivo</option>
                <option value="bank">Banco</option>
                <option value="wallet">Billetera</option>
                <option value="credit">Tarjeta (cierre)</option>
              </select>
            </Field>

            <Field label="Persona">
              <select
                value={newPersonId}
                onChange={(e) => setNewPersonId(e.target.value)}
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
              >
                {people.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </Field>

            {newType === "credit" ? (
              <>
                <Field label="Día de cierre (1..28)">
                  <input
                    value={newStatementDay}
                    onChange={(e) => setNewStatementDay(e.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Día de vencimiento (1..28)">
                  <input
                    value={newDueDay}
                    onChange={(e) => setNewDueDay(e.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                  />
                </Field>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelCreate}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={createAccount}
              className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              <Save size={16} /> {busy ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2">
        {activeItems.map((a) => {
          const Icon = iconFor(a.type);
          const isEditing = editingId === a._id;

          return (
            <div key={a._id} className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass(a.type)}`}>
                      <Icon size={14} /> {typeLabel(a.type)}
                    </span>
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                  </div>
                  <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                    {a.person?.name ? (
                      <span className="font-semibold">{a.person.name}</span>
                    ) : (
                      <span className="italic text-[rgb(var(--subtext))]">Sin persona</span>
                    )}
                  </div>
                  {a.type === "credit" && a.credit ? (
                    <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                      Cierra el <span className="font-semibold">{a.credit.statementDay}</span> · Vence el{" "}
                      <span className="font-semibold">{a.credit.dueDay}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Cuenta activa</div>
                  )}
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={saveEdit}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2 text-xs font-semibold disabled:opacity-70"
                      >
                        <Save size={14} /> Guardar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-xs font-semibold"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-xs font-semibold"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        disabled={busy || a.name === "Sin cuenta"}
                        onClick={() => deactivate(a)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-70"
                      >
                        <Trash2 size={14} /> Desactivar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Nombre">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Tipo">
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as AccountType)}
                      className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="bank">Banco</option>
                      <option value="wallet">Billetera</option>
                      <option value="credit">Tarjeta (cierre)</option>
                    </select>
                  </Field>
                  <Field label="Persona">
                    <select
                      value={editPersonId}
                      onChange={(e) => setEditPersonId(e.target.value)}
                      className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                    >
                      {people.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </Field>
                  {editType === "credit" ? (
                    <>
                      <Field label="Día de cierre (1..28)">
                        <input
                          value={editStatementDay}
                          onChange={(e) => setEditStatementDay(e.target.value)}
                          inputMode="numeric"
                          className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Día de vencimiento (1..28)">
                        <input
                          value={editDueDay}
                          onChange={(e) => setEditDueDay(e.target.value)}
                          inputMode="numeric"
                          className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                        />
                      </Field>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {activeItems.length === 0 ? (
          <div className="text-sm text-[rgb(var(--subtext))]">Todavía no creaste cuentas.</div>
        ) : null}
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
