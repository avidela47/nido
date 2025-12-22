"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Moon, Sun, Sparkles, Info } from "lucide-react";
import { useToast } from "../../../components/ui/Toast";
import { formatCurrencyARS } from "../../../lib/format";
import { currentMonthYYYYMM, currentYearYYYY, monthAdd } from "../../../lib/dateRanges";

type PersonRow = { _id: string; name: string };
type CategoryRow = { _id: string; name: string };

type ComparePayload = {
  monthA: { month: string; totals: { income: number; expense: number; balance: number }; topCategories: Array<{ categoryId: string; categoryName: string; spent: number }> };
  monthB: { month: string; totals: { income: number; expense: number; balance: number }; topCategories: Array<{ categoryId: string; categoryName: string; spent: number }> };
};

type TrendPayload = { series: Array<{ month: string; spent: number }> };
type YearPayload = { totals: { income: number; expense: number; balance: number }; series: Array<{ month: string; income: number; expense: number; balance: number }> };

function TooltipChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-white px-2 py-1 text-[11px] text-[rgb(var(--subtext))]" title={text}>
      <Info size={12} />
      Tip
    </span>
  );
}

export default function AdvancedReportsClient({ people, categories }: { people: PersonRow[]; categories: CategoryRow[] }) {
  const toast = useToast();

  // 8E: tema oscuro (local a esta pantalla)
  const [dark, setDark] = useState(false);

  // 8E: onboarding (localStorage)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // filtros
  const [personId, setPersonId] = useState("");
  const [monthA, setMonthA] = useState(monthAdd(currentMonthYYYYMM(), -1));
  const [monthB, setMonthB] = useState(currentMonthYYYYMM());

  const [trendCategoryId, setTrendCategoryId] = useState(categories[0]?._id ?? "");
  const [trendStartMonth, setTrendStartMonth] = useState(monthAdd(currentMonthYYYYMM(), -11));
  const [trendMonths, setTrendMonths] = useState(12);

  const [year, setYear] = useState(currentYearYYYY());

  // data
  const [compare, setCompare] = useState<ComparePayload | null>(null);
  const [trend, setTrend] = useState<TrendPayload | null>(null);
  const [yearData, setYearData] = useState<YearPayload | null>(null);

  const [loadingCompare, setLoadingCompare] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingYear, setLoadingYear] = useState(false);

  const compareUrl = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("monthA", monthA);
    sp.set("monthB", monthB);
    if (personId) sp.set("personId", personId);
    return `/api/reports/compare?${sp.toString()}`;
  }, [monthA, monthB, personId]);

  const trendUrl = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("categoryId", trendCategoryId);
    sp.set("startMonth", trendStartMonth);
    sp.set("months", String(trendMonths));
    if (personId) sp.set("personId", personId);
    return `/api/reports/category-trend?${sp.toString()}`;
  }, [trendCategoryId, trendStartMonth, trendMonths, personId]);

  const yearUrl = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("year", year);
    if (personId) sp.set("personId", personId);
    return `/api/reports/year?${sp.toString()}`;
  }, [year, personId]);

  // export refs
  const refCompare = useRef<HTMLDivElement | null>(null);
  const refTrend = useRef<HTMLDivElement | null>(null);
  const refYear = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // onboarding (solo la primera vez)
    const key = "nido_onboarding_reports_v1";
    const seen = localStorage.getItem(key);
    if (!seen) setShowOnboarding(true);

    // tema persistente (local a reports)
    const t = localStorage.getItem("nido_theme_reports");
    if (t === "dark") setDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("nido_theme_reports", dark ? "dark" : "light");
  }, [dark]);

  async function loadCompare() {
    setLoadingCompare(true);
    const res = await fetch(compareUrl);
    const json = await res.json().catch(() => null);
    setLoadingCompare(false);

    if (!res.ok || !json?.ok) {
      const msg = json?.error ?? "No se pudo cargar comparación.";
      toast.push({ title: "Error", description: msg, variant: "error" });
      setCompare(null);
      return;
    }
    setCompare(json.data as ComparePayload);
  }

  async function loadTrend() {
    setLoadingTrend(true);
    const res = await fetch(trendUrl);
    const json = await res.json().catch(() => null);
    setLoadingTrend(false);

    if (!res.ok || !json?.ok) {
      const msg = json?.error ?? "No se pudo cargar tendencia.";
      toast.push({ title: "Error", description: msg, variant: "error" });
      setTrend(null);
      return;
    }
    setTrend(json.data as TrendPayload);
  }

  async function loadYear() {
    setLoadingYear(true);
    const res = await fetch(yearUrl);
    const json = await res.json().catch(() => null);
    setLoadingYear(false);

    if (!res.ok || !json?.ok) {
      const msg = json?.error ?? "No se pudo cargar balance anual.";
      toast.push({ title: "Error", description: msg, variant: "error" });
      setYearData(null);
      return;
    }
    setYearData(json.data as YearPayload);
  }

  useEffect(() => {
    loadCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareUrl]);

  useEffect(() => {
    if (trendCategoryId) loadTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendUrl]);

  useEffect(() => {
    loadYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearUrl]);

  async function exportNodeAsPNG(node: HTMLElement, filename: string) {
    const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
    const dataUrl = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  async function exportNodeAsPDF(node: HTMLElement, filename: string) {
    const canvas = await html2canvas(node, { backgroundColor: "#ffffff", scale: 2 });
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // mantener aspect ratio
    const imgW = canvas.width;
    const imgH = canvas.height;
    const scale = Math.min(pageW / imgW, pageH / imgH);
    const w = imgW * scale;
    const h = imgH * scale;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;

    pdf.addImage(img, "PNG", x, y, w, h);
    pdf.save(filename);
  }

  function closeOnboarding() {
    const key = "nido_onboarding_reports_v1";
    localStorage.setItem(key, "1");
    setShowOnboarding(false);
  }

  const wrap = dark
    ? "rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 p-4"
    : "rounded-3xl border border-[rgb(var(--border))] bg-white p-4";

  const sub = dark ? "text-slate-300" : "text-[rgb(var(--subtext))]";

  const totalsA = compare?.monthA.totals;
  const totalsB = compare?.monthB.totals;

  return (
    <div className={dark ? "space-y-4 text-slate-100" : "space-y-4"}>
      {/* 8E: Header actions */}
      <div className={wrap}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Sparkles size={16} />
              Acciones rápidas
              <TooltipChip text="Exportá gráficos a PNG/PDF y cambiá filtros sin salir." />
            </div>
            <div className={`mt-1 text-xs ${sub}`}>
              Reportes avanzados listos para imprimir y compartir.
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <button
              type="button"
              onClick={() => setDark((v) => !v)}
              className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold" : "rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-semibold"}
              title="Tema oscuro"
            >
              <span className="inline-flex items-center gap-2">
                {dark ? <Moon size={16} /> : <Sun size={16} />}
                Tema
              </span>
            </button>

            <a
              href="/transactions/new"
              className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-center text-sm font-semibold text-white"
              title="Cargar movimiento"
            >
              + Movimiento
            </a>

            <a
              href="/export"
              className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-center text-sm font-semibold" : "rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-center text-sm font-semibold"}
              title="CSV / Backup"
            >
              Export/Backup
            </a>
          </div>
        </div>
      </div>

      {/* Global filter person */}
      <div className={wrap}>
        <div className="text-sm font-semibold">Filtro global</div>
        <div className={`mt-1 text-xs ${sub}`}>Aplicado a comparación, tendencia y anual.</div>

        <div className="mt-3">
          <div className={`text-xs font-semibold ${sub}`}>Persona (opcional)</div>
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className={dark ? "mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm" : "mt-1 w-full rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"}
          >
            <option value="">Todas</option>
            {people.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* A) Compare months */}
      <div className={wrap} ref={refCompare}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold">A) Comparar meses</div>
            <div className={`mt-1 text-xs ${sub}`}>Totales + top categorías de gasto.</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <div>
              <div className={`text-xs font-semibold ${sub}`}>Mes A</div>
              <input
                type="month"
                value={monthA}
                onChange={(e) => setMonthA(e.target.value)}
                className={dark ? "mt-1 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold" : "mt-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"}
              />
            </div>
            <div>
              <div className={`text-xs font-semibold ${sub}`}>Mes B</div>
              <input
                type="month"
                value={monthB}
                onChange={(e) => setMonthB(e.target.value)}
                className={dark ? "mt-1 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold" : "mt-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"}
              />
            </div>

            <button
              type="button"
              onClick={loadCompare}
              className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
            >
              {loadingCompare ? "Cargando…" : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Month A */}
          <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 p-3" : "rounded-2xl border border-[rgb(var(--border))] bg-white p-3"}>
            <div className="text-xs font-semibold">{compare?.monthA.month ?? monthA}</div>
            <div className={`mt-1 text-xs ${sub}`}>Ingresos / Gastos / Balance</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className={dark ? "rounded-xl bg-slate-950 px-3 py-2" : "rounded-xl bg-[rgb(var(--muted))] px-3 py-2"}>
                <div className={`text-[11px] ${sub}`}>Ingresos</div>
                <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(totalsA?.income ?? 0)}</div>
              </div>
              <div className={dark ? "rounded-xl bg-slate-950 px-3 py-2" : "rounded-xl bg-[rgb(var(--muted))] px-3 py-2"}>
                <div className={`text-[11px] ${sub}`}>Gastos</div>
                <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(totalsA?.expense ?? 0))}</div>
              </div>
              <div className={dark ? "rounded-xl bg-slate-950 px-3 py-2" : "rounded-xl bg-[rgb(var(--muted))] px-3 py-2"}>
                <div className={`text-[11px] ${sub}`}>Balance</div>
                <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(totalsA?.balance ?? 0)}</div>
              </div>
            </div>

            <div className="mt-3 text-xs font-semibold">Top gastos</div>
            <div className="mt-2 space-y-2">
              {(compare?.monthA.topCategories ?? []).slice(0, 6).map((c) => (
                <div key={c.categoryId} className={dark ? "flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2" : "flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2"}>
                  <div className="text-sm font-semibold">{c.categoryName}</div>
                  <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(c.spent))}</div>
                </div>
              ))}
              {(compare?.monthA.topCategories ?? []).length === 0 ? <div className={`text-sm ${sub}`}>Sin datos.</div> : null}
            </div>
          </div>

          {/* Month B */}
          <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 p-3" : "rounded-2xl border border-[rgb(var(--border))] bg-white p-3"}>
            <div className="text-xs font-semibold">{compare?.monthB.month ?? monthB}</div>
            <div className={`mt-1 text-xs ${sub}`}>Ingresos / Gastos / Balance</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className={dark ? "rounded-xl bg-slate-950 px-3 py-2" : "rounded-xl bg-[rgb(var(--muted))] px-3 py-2"}>
                <div className={`text-[11px] ${sub}`}>Ingresos</div>
                <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(totalsB?.income ?? 0)}</div>
              </div>
              <div className={dark ? "rounded-xl bg-slate-950 px-3 py-2" : "rounded-xl bg-[rgb(var(--muted))] px-3 py-2"}>
                <div className={`text-[11px] ${sub}`}>Gastos</div>
                <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(totalsB?.expense ?? 0))}</div>
              </div>
              <div className={dark ? "rounded-xl bg-slate-950 px-3 py-2" : "rounded-xl bg-[rgb(var(--muted))] px-3 py-2"}>
                <div className={`text-[11px] ${sub}`}>Balance</div>
                <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(totalsB?.balance ?? 0)}</div>
              </div>
            </div>

            <div className="mt-3 text-xs font-semibold">Top gastos</div>
            <div className="mt-2 space-y-2">
              {(compare?.monthB.topCategories ?? []).slice(0, 6).map((c) => (
                <div key={c.categoryId} className={dark ? "flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2" : "flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2"}>
                  <div className="text-sm font-semibold">{c.categoryName}</div>
                  <div className="text-sm font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(c.spent))}</div>
                </div>
              ))}
              {(compare?.monthB.topCategories ?? []).length === 0 ? <div className={`text-sm ${sub}`}>Sin datos.</div> : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={async () => {
              if (!refCompare.current) return;
              toast.push({ title: "Export", description: "Generando PNG…", variant: "ok" });
              await exportNodeAsPNG(refCompare.current, `nido-compare-${monthA}-vs-${monthB}.png`);
            }}
            className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold" : "rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-semibold"}
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> PNG
            </span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!refCompare.current) return;
              toast.push({ title: "Export", description: "Generando PDF…", variant: "ok" });
              await exportNodeAsPDF(refCompare.current, `nido-compare-${monthA}-vs-${monthB}.pdf`);
            }}
            className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> PDF
            </span>
          </button>
        </div>
      </div>

      {/* B) Trend by category */}
      <div className={wrap} ref={refTrend}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold">B) Evolución por categoría</div>
            <div className={`mt-1 text-xs ${sub}`}>Serie mensual de gastos por categoría.</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <div>
              <div className={`text-xs font-semibold ${sub}`}>Categoría</div>
              <select
                value={trendCategoryId}
                onChange={(e) => setTrendCategoryId(e.target.value)}
                className={dark ? "mt-1 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm" : "mt-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"}
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className={`text-xs font-semibold ${sub}`}>Desde</div>
              <input
                type="month"
                value={trendStartMonth}
                onChange={(e) => setTrendStartMonth(e.target.value)}
                className={dark ? "mt-1 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold" : "mt-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"}
              />
            </div>

            <div>
              <div className={`text-xs font-semibold ${sub}`}>Meses</div>
              <input
                value={String(trendMonths)}
                onChange={(e) => setTrendMonths(Number(e.target.value || "12"))}
                inputMode="numeric"
                className={dark ? "mt-1 w-24 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold" : "mt-1 w-24 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"}
              />
            </div>

            <button
              type="button"
              onClick={loadTrend}
              className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
            >
              {loadingTrend ? "Cargando…" : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="spent" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={async () => {
              if (!refTrend.current) return;
              toast.push({ title: "Export", description: "Generando PNG…", variant: "ok" });
              await exportNodeAsPNG(refTrend.current, `nido-trend-${trendStartMonth}-${trendMonths}m.png`);
            }}
            className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold" : "rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-semibold"}
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> PNG
            </span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!refTrend.current) return;
              toast.push({ title: "Export", description: "Generando PDF…", variant: "ok" });
              await exportNodeAsPDF(refTrend.current, `nido-trend-${trendStartMonth}-${trendMonths}m.pdf`);
            }}
            className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> PDF
            </span>
          </button>
        </div>
      </div>

      {/* C) Year balance */}
      <div className={wrap} ref={refYear}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold">C) Balance anual</div>
            <div className={`mt-1 text-xs ${sub}`}>Ingresos vs gastos por mes (y total anual).</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <div>
              <div className={`text-xs font-semibold ${sub}`}>Año</div>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                inputMode="numeric"
                className={dark ? "mt-1 w-28 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold" : "mt-1 w-28 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold"}
              />
            </div>

            <button
              type="button"
              onClick={loadYear}
              className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
            >
              {loadingYear ? "Cargando…" : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 p-3" : "rounded-2xl border border-[rgb(var(--border))] bg-white p-3"}>
            <div className={`text-xs ${sub}`}>Ingreso anual</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrencyARS(yearData?.totals.income ?? 0)}</div>
          </div>
          <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 p-3" : "rounded-2xl border border-[rgb(var(--border))] bg-white p-3"}>
            <div className={`text-xs ${sub}`}>Gasto anual</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrencyARS(-Math.abs(yearData?.totals.expense ?? 0))}</div>
          </div>
          <div className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 p-3" : "rounded-2xl border border-[rgb(var(--border))] bg-white p-3"}>
            <div className={`text-xs ${sub}`}>Balance anual</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrencyARS(yearData?.totals.balance ?? 0)}</div>
          </div>
        </div>

        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearData?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="income" />
              <Bar dataKey="expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={async () => {
              if (!refYear.current) return;
              toast.push({ title: "Export", description: "Generando PNG…", variant: "ok" });
              await exportNodeAsPNG(refYear.current, `nido-year-${year}.png`);
            }}
            className={dark ? "rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold" : "rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-semibold"}
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> PNG
            </span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!refYear.current) return;
              toast.push({ title: "Export", description: "Generando PDF…", variant: "ok" });
              await exportNodeAsPDF(refYear.current, `nido-year-${year}.pdf`);
            }}
            className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> PDF
            </span>
          </button>
        </div>
      </div>

      {/* 8E: Onboarding modal */}
      {showOnboarding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={dark ? "w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950 p-5" : "w-full max-w-xl rounded-3xl border border-[rgb(var(--border))] bg-white p-5"}>
            <div className="text-sm font-semibold">Bienvenido a Reportes avanzados</div>
            <div className={`mt-2 text-sm ${sub}`}>
              1) Compará dos meses (A vs B) <br />
              2) Mirá la tendencia de una categoría <br />
              3) Revisá el balance anual por mes <br />
              4) Exportá cualquier bloque como PNG o PDF
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeOnboarding}
                className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
