import { ArrowDownRight, ArrowUpRight, Wallet, User } from "lucide-react";
import DashboardMonthPicker from "./DashboardMonthPicker";
import { formatCurrencyARS } from "../lib/format";
import { getMonthlySummary } from "../lib/summary";

function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const month = searchParams?.month ?? currentMonthYYYYMM();
  const summary = await getMonthlySummary(month);

  const totalIncome = summary.totals.income;
  const totalExpense = summary.totals.expense;
  const balance = summary.totals.balance;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Nido — Donde el dinero encuentra orden · {month}
          </p>
        </div>

        <DashboardMonthPicker />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Ingresos (Mes)"
          value={formatCurrencyARS(totalIncome)}
          icon={<ArrowUpRight size={18} />}
          positive
        />
        <KpiCard
          title="Gastos (Mes)"
          value={formatCurrencyARS(-Math.abs(totalExpense))}
          icon={<ArrowDownRight size={18} />}
        />
        <KpiCard
          title="Balance (Mes)"
          value={formatCurrencyARS(balance)}
          icon={<Wallet size={18} />}
          positive={balance >= 0}
        />
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-3">
          <div className="text-sm font-semibold">Totales por persona</div>
          <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
            Ingresos, gastos y balance del mes seleccionado
          </div>
        </div>

        <div className="space-y-2">
          {summary.byPerson.map((p) => (
            <div
              key={p.personId}
              className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3 hover:bg-[rgb(var(--muted))] transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[rgba(var(--brand),0.10)] text-[rgb(var(--brand-dark))]">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.personName}</div>
                    <div className="text-xs text-[rgb(var(--subtext))]">Balance personal</div>
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    p.balance >= 0 ? "text-emerald-600" : ""
                  }`}
                >
                  {formatCurrencyARS(p.balance)}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2">
                  <div className="text-[rgb(var(--subtext))]">Ingresos</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-600 tabular-nums">
                    {formatCurrencyARS(p.income)}
                  </div>
                </div>
                <div className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2">
                  <div className="text-[rgb(var(--subtext))]">Gastos</div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {formatCurrencyARS(-Math.abs(p.expense))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {summary.byPerson.length === 0 && (
            <div className="text-sm text-[rgb(var(--subtext))]">
              No hay transacciones en {month}. Cargá movimientos y van a aparecer acá.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  positive,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[rgba(var(--brand),0.10)] text-[rgb(var(--brand-dark))]">
          {icon}
        </div>
      </div>
      <div className={`mt-3 text-2xl font-semibold tabular-nums ${positive ? "text-emerald-600" : ""}`}>
        {value}
      </div>
    </div>
  );
}

