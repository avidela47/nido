"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type TransferLeg = {
  _id: string;
  transferGroupId: string;
  transferSide: "in" | "out";
  accountId: string;
  accountName: string;
  accountType: string | null;
  amount: number;
  date: string | null;
  note: string;
};

function money(n: number): string {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TransferDetailsClient({ groupId, legs }: { groupId: string; legs: TransferLeg[] }) {
  const { outLeg, inLeg } = useMemo(() => {
    const out = legs.find((l) => l.transferSide === "out") ?? null;
    const inn = legs.find((l) => l.transferSide === "in") ?? null;
    return { outLeg: out, inLeg: inn };
  }, [legs]);

  const date = outLeg?.date ?? inLeg?.date ?? null;
  const amount = Math.abs(outLeg?.amount ?? inLeg?.amount ?? 0);
  const note = (outLeg?.note ?? inLeg?.note ?? "").trim();

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>(() => toDateInputValue(date));
  const [amountInput, setAmountInput] = useState<string>(() => (amount ? String(amount) : ""));
  const [noteInput, setNoteInput] = useState<string>(() => note);

  function startEdit() {
    setError("");
    setDateInput(toDateInputValue(date));
    setAmountInput(amount ? String(amount) : "");
    setNoteInput(note);
    setEditing(true);
  }

  function cancelEdit() {
    setError("");
    setEditing(false);
  }

  async function refreshAfterSave() {
    // Client-side refresh del detalle (sin router) para mantenerlo auto-contenido.
    // Reconsulta el endpoint y recarga la página para que `page.tsx` vuelva a fetchear.
    // Esto evita duplicar lógica de “merge” de patas en el cliente.
    window.location.reload();
  }

  async function save() {
    setError("");

    const num = Number(amountInput);
    if (!Number.isFinite(num) || num <= 0) {
      return setError("Monto inválido.");
    }
    if (!dateInput.trim()) {
      return setError("Fecha inválida.");
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/transfers/${encodeURIComponent(groupId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num, date: dateInput, note: noteInput }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo guardar.");

      setEditing(false);
      await refreshAfterSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTransfer() {
    if (!confirm("¿Eliminar esta transferencia? (se ocultan ambas patas)")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/transfers/${encodeURIComponent(groupId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo borrar.");
      window.location.href = "/transfers";
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar.");
    } finally {
      setBusy(false);
    }
  }

  const title = `Transferencia · ${(outLeg?.accountName ?? "(Sin cuenta)")} → ${(inLeg?.accountName ?? "(Sin cuenta)")}`;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">{date ?? "(sin fecha)"}</div>
            <div className="mt-1 truncate text-sm font-semibold">{title}</div>
            {note ? <div className="mt-1 truncate text-xs text-[rgb(var(--subtext))]">{note}</div> : null}
          </div>
          <div className="text-base font-bold text-[rgb(var(--text))]">{money(amount)}</div>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/transfers"
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text))]"
          >
            Volver a transferencias
          </Link>

          {!editing ? (
            <>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-3 py-2 text-xs font-semibold text-white"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={removeTransfer}
                disabled={busy}
                className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-70"
              >
                Eliminar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
              >
                {busy ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={busy}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text))] disabled:opacity-70"
              >
                Cancelar
              </button>
            </>
          )}
        </div>

        {editing ? (
          <div className="mt-4 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-4">
            <div className="text-sm font-semibold">Editar transferencia</div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Fecha</div>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Monto</div>
                <input
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  inputMode="numeric"
                  placeholder="Ej: 50000"
                  className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-3">
                <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Nota</div>
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Opcional"
                  className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4">
        <div className="text-sm font-semibold">Patas</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-3">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Salida</div>
            <div className="mt-1 text-sm font-semibold">{outLeg?.accountName ?? "(Sin cuenta)"}</div>
            <div className="mt-1 text-sm font-bold">-{money(Math.abs(outLeg?.amount ?? amount))}</div>
            <div className="mt-2 text-xs text-[rgb(var(--subtext))]">Tx: {outLeg?._id ?? "(no encontrada)"}</div>
          </div>

          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-3">
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Entrada</div>
            <div className="mt-1 text-sm font-semibold">{inLeg?.accountName ?? "(Sin cuenta)"}</div>
            <div className="mt-1 text-sm font-bold">+{money(Math.abs(inLeg?.amount ?? amount))}</div>
            <div className="mt-2 text-xs text-[rgb(var(--subtext))]">Tx: {inLeg?._id ?? "(no encontrada)"}</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-[rgb(var(--subtext))]">Grupo: {groupId}</div>
      </div>
    </div>
  );
}
