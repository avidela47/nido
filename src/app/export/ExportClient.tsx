"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "../../components/ui/Toast";

type PersonRow = { _id: string; name: string };

function currentMonthYYYYMM(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function currentYearYYYY(): string {
  return String(new Date().getFullYear());
}

export default function ExportClient({ people }: { people: PersonRow[] }) {
  const toast = useToast();

  const [scope, setScope] = useState<"month" | "year">("month");
  const [month, setMonth] = useState(currentMonthYYYYMM());
  const [year, setYear] = useState(currentYearYYYY());
  const [personId, setPersonId] = useState("");

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("scope", scope);
    if (scope === "month") sp.set("month", month);
    if (scope === "year") sp.set("year", year);
    if (personId) sp.set("personId", personId);
    return `/api/export?${sp.toString()}`;
  }, [scope, month, year, personId]);

  function download() {
    toast.push({ title: "Descargando CSV", description: "Se iniciará la descarga en tu navegador.", variant: "ok" });
    window.location.href = url;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="text-sm font-semibold">Parámetros</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Alcance</div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope("month")}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  scope === "month"
                    ? "bg-[rgb(var(--muted))] text-[rgb(var(--brand))] border-[rgb(var(--border))]"
                    : "bg-white border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setScope("year")}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  scope === "year"
                    ? "bg-[rgb(var(--muted))] text-[rgb(var(--brand))] border-[rgb(var(--border))]"
                    : "bg-white border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
                }`}
              >
                Anual
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Persona (opcional)</div>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {people.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {scope === "month" ? (
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
              />
            </div>
          ) : (
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Año</div>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                inputMode="numeric"
                placeholder="2025"
                className="mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-[rgb(var(--subtext))] break-all">
            Endpoint: <span className="font-mono">{url}</span>
          </div>

          <button
            type="button"
            onClick={download}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Download size={16} />
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}


