"use client";

import { useMemo, useState } from "react";
import { Download, Upload, ShieldAlert } from "lucide-react";
import { useToast } from "../../components/ui/Toast";

type BackupShape = {
  app: string;
  version: number;
  exportedAt: string;
  counts?: {
    people?: number;
    categories?: number;
    budgets?: number;
    transactions?: number;
  };
  data?: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default function BackupClient() {
  const toast = useToast();

  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState<BackupShape | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState("");

  const safeCounts = useMemo(() => {
    const c = raw?.counts ?? {};
    return {
      people: Number(c.people ?? 0),
      categories: Number(c.categories ?? 0),
      budgets: Number(c.budgets ?? 0),
      transactions: Number(c.transactions ?? 0),
    };
  }, [raw]);

  function downloadBackup() {
    toast.push({
      title: "Descargando backup",
      description: "Se iniciará la descarga del JSON.",
      variant: "ok",
    });
    window.location.href = "/api/backup";
  }

  async function onPickFile(file: File) {
    setError("");
    setRaw(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!isObject(parsed)) throw new Error("JSON inválido.");
      const b = parsed as BackupShape;
      if (b.app !== "nido") throw new Error("Este archivo no parece ser un backup de Nido.");
      if (!b.exportedAt) throw new Error("Backup inválido (falta exportedAt).");

      setRaw(b);
      toast.push({ title: "Backup cargado", description: "Preview listo para restaurar.", variant: "ok" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo leer el archivo.";
      setError(msg);
      toast.push({ title: "Error", description: msg, variant: "error" });
    }
  }

  async function restore() {
    setError("");

    if (!raw) {
      setError("Seleccioná un backup primero.");
      return;
    }

    if (mode === "replace") {
      if (confirmReplace.trim().toUpperCase() !== "REEMPLAZAR") {
        setError('Para "REPLACE" escribí REEMPLAZAR en el campo de confirmación.');
        return;
      }
    }

    setBusy(true);
    const res = await fetch("/api/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, backup: raw }),
    });

    const json = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok || !json?.ok) {
      const msg = json?.error ?? "No se pudo restaurar.";
      setError(msg);
      toast.push({ title: "Restore falló", description: msg, variant: "error" });
      return;
    }

    toast.push({ title: "Restore OK", description: `Modo ${mode}. Datos restaurados.`, variant: "ok" });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Backup JSON</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
              Incluye people, categories, budgets y transactions.
            </div>
          </div>

          <button
            type="button"
            onClick={downloadBackup}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Download size={16} />
            Descargar backup
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="text-sm font-semibold">Restore</div>
        <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
          Subí un backup JSON y elegí modo. Merge es seguro; Replace borra todo y reimporta.
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Archivo</div>
            <label className="mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm hover:bg-[rgb(var(--muted))]">
              <span className="truncate">{fileName || "Seleccionar backup .json"}</span>
              <Upload size={16} />
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                }}
              />
            </label>
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Modo</div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("merge")}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  mode === "merge"
                    ? "bg-[rgb(var(--muted))] text-[rgb(var(--brand))] border-[rgb(var(--border))]"
                    : "bg-white border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
                }`}
              >
                Merge
              </button>
              <button
                type="button"
                onClick={() => setMode("replace")}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  mode === "replace"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "bg-white border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
                }`}
              >
                Replace
              </button>
            </div>
          </div>

          {raw ? (
            <div className="md:col-span-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-3">
              <div className="text-xs font-semibold">Preview</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white px-3 py-2">
                  People: <span className="font-semibold tabular-nums">{safeCounts.people}</span>
                </div>
                <div className="rounded-xl bg-white px-3 py-2">
                  Categories: <span className="font-semibold tabular-nums">{safeCounts.categories}</span>
                </div>
                <div className="rounded-xl bg-white px-3 py-2">
                  Budgets: <span className="font-semibold tabular-nums">{safeCounts.budgets}</span>
                </div>
                <div className="rounded-xl bg-white px-3 py-2">
                  Transactions: <span className="font-semibold tabular-nums">{safeCounts.transactions}</span>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-[rgb(var(--subtext))]">
                Exportado: <span className="font-mono">{raw.exportedAt}</span>
              </div>
            </div>
          ) : null}

          {mode === "replace" ? (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <ShieldAlert size={16} />
                Atención: Replace borra datos
              </div>
              <div className="mt-1 text-xs text-red-700/90">
                Para confirmar, escribí <span className="font-semibold">REEMPLAZAR</span>.
              </div>
              <input
                value={confirmReplace}
                onChange={(e) => setConfirmReplace(e.target.value)}
                placeholder="REEMPLAZAR"
                className="mt-2 w-full rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={restore}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {busy ? "Restaurando…" : "Restaurar backup"}
          </button>
        </div>
      </div>
    </div>
  );
}

