import { SectionCard } from "../../components/ui/SectionCard";
import { getYearlySummary } from "../../lib/yearly";
import { formatCurrencyARS } from "../../lib/format";
import YearPicker from "./yearPicker";

function currentYear(): number {
  return new Date().getFullYear();
}

export default async function YearPage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const year = searchParams?.year ? Number(searchParams.year) : currentYear();
  const summary = await getYearlySummary(year);

  return (
    <SectionCard
      title="Balance anual"
      subtitle="Ingresos, gastos y balance por mes. Año seleccionado."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="text-sm text-[rgb(var(--subtext))]">
            Año: <span className="font-semibold text-[rgb(var(--text))]">{summary.year}</span>
          </div>
          <YearPicker />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Kpi title="Ingresos (Año)" value={formatCurrencyARS(summary.totals.income)} positive />
          <Kpi title="Gastos (Año)" value={formatCurrencyARS(-Math.abs(summary.totals.expense))} />
          <Kpi
            title="Balance (Año)"
            value={formatCurrencyARS(summary.totals.balance)}
            positive={summary.totals.balance >= 0}
          />
        </div>

        <div className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3">
          <div className="mb-2 text-sm font-semibold">Por mes</div>
          <div className="grid grid-cols-1 gap-2">
            {summary.byMonth.map((m) => (
              <div
                key={m.month}
                className="flex flex-col gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="text-sm font-semibold">{m.month}</div>
                <div className="grid grid-cols-3 gap-2 text-xs md:w-[520px]">
                  <Mini title="Ingresos" value={formatCurrencyARS(m.income)} positive />
                  <Mini title="Gastos" value={formatCurrencyARS(-Math.abs(m.expense))} />
                  <Mini title="Balance" value={formatCurrencyARS(m.balance)} positive={m.balance >= 0} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3">
          <div className="mb-2 text-sm font-semibold">Por persona (anual)</div>

          {summary.byPerson.length === 0 ? (
            <div className="text-sm text-[rgb(var(--subtext))]">No hay movimientos en el año.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {summary.byPerson.map((p) => (
                <div
                  key={p.personId}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{p.personName}</div>
                    <div className={`text-sm font-semibold tabular-nums ${p.balance >= 0 ? "text-emerald-600" : ""}`}>
                      {formatCurrencyARS(p.balance)}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <Mini title="Ingresos" value={formatCurrencyARS(p.income)} positive />
                    <Mini title="Gastos" value={formatCurrencyARS(-Math.abs(p.expense))} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function Kpi({ title, value, positive }: { title: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="text-sm font-semibold">{title}</div>
      <div className={`mt-3 text-2xl font-semibold tabular-nums ${positive ? "text-emerald-600" : ""}`}>{value}</div>
    </div>
  );
}

function Mini({ title, value, positive }: { title: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2">
      <div className="text-[rgb(var(--subtext))]">{title}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${positive ? "text-emerald-600" : ""}`}>{value}</div>
    </div>
  );
}
