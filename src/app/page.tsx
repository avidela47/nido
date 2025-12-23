import { ArrowDownRight, ArrowUpRight, Users, Wallet, User } from "lucide-react";
import DashboardMonthPicker from "./DashboardMonthPicker";
import { formatCurrencyARS } from "../lib/format";
import { getMonthlySummary } from "../lib/summary";
import { getMonthlyBudgets } from "../lib/budgets";
import { getMonthlyPersonBudgets } from "../lib/personBudgets";
import { Suspense } from "react";

function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const summary = await getMonthlySummary(month);

  const budgets = await getMonthlyBudgets(month);
  const personBudgets = await getMonthlyPersonBudgets(month);

  const totalIncome = summary.totals.income;
  const totalExpense = summary.totals.expense;
  const balance = summary.totals.balance;

  const catOver = budgets.rows.filter((r) => r.status === "over").slice(0, 6);
  const catWarn = budgets.rows.filter((r) => r.status === "warn").slice(0, 6);

  const pOver = personBudgets.rows.filter((r) => r.status === "over").slice(0, 6);
  const pWarn = personBudgets.rows.filter((r) => r.status === "warn").slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">Resumen del mes · {month}</p>
        </div>

        <Suspense>
          <DashboardMonthPicker />
        </Suspense>
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

  <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
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
              className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 hover:bg-[rgb(var(--muted))] transition"
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
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
                  <div className="text-[rgb(var(--subtext))]">Ingresos</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-600 tabular-nums">
                    {formatCurrencyARS(p.income)}
                  </div>
                </div>
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
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

  <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Alertas de presupuesto por categoría</div>
            <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
              Configurá en /budgets
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <AlertBoxCategory title="Excedidos" rows={catOver} variant="over" />
          <AlertBoxCategory title="Cerca del límite (≥ 80%)" rows={catWarn} variant="warn" />
        </div>

        {catOver.length === 0 && catWarn.length === 0 && (
          <div className="mt-3 text-sm text-[rgb(var(--subtext))]">
            No hay alertas por categoría este mes.
          </div>
        )}
      </div>

  <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[rgba(var(--brand),0.10)] text-[rgb(var(--brand-dark))]">
              <Users size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold">Alertas de presupuesto por persona</div>
              <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                Configurá en /person-budgets
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <AlertBoxPerson title="Excedidos" rows={pOver} variant="over" />
          <AlertBoxPerson title="Cerca del límite (≥ 80%)" rows={pWarn} variant="warn" />
        </div>

        {pOver.length === 0 && pWarn.length === 0 && (
          <div className="mt-3 text-sm text-[rgb(var(--subtext))]">
            No hay alertas por persona este mes.
          </div>
        )}
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
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
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

function AlertBoxCategory({
  title,
  rows,
  variant,
}: {
  title: string;
  rows: Array<{ categoryName: string; budget: number; spent: number; percent: number }>;
  variant: "over" | "warn";
}) {
  const cls = variant === "over" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50";

  return (
    <div className={`rounded-2xl border ${cls} p-3`}>
      <div className="text-sm font-semibold">{title}</div>

      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-[rgb(var(--subtext))]">Sin items.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((r) => (
            <div
              key={r.categoryName}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{r.categoryName}</div>
                <div className="text-xs font-semibold tabular-nums">{Math.round(r.percent)}%</div>
              </div>
              <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                Gastado: <span className="font-semibold">{formatCurrencyARS(-Math.abs(r.spent))}</span> ·
                Presupuesto: <span className="font-semibold">{formatCurrencyARS(r.budget)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertBoxPerson({
  title,
  rows,
  variant,
}: {
  title: string;
  rows: Array<{ personName: string; budget: number; spent: number; percent: number }>;
  variant: "over" | "warn";
}) {
  const cls = variant === "over" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50";

  return (
    <div className={`rounded-2xl border ${cls} p-3`}>
      <div className="text-sm font-semibold">{title}</div>

      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-[rgb(var(--subtext))]">Sin items.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((r) => (
            <div
              key={r.personName}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{r.personName}</div>
                <div className="text-xs font-semibold tabular-nums">{Math.round(r.percent)}%</div>
              </div>
              <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                Gastado: <span className="font-semibold">{formatCurrencyARS(-Math.abs(r.spent))}</span> ·
                Tope: <span className="font-semibold">{formatCurrencyARS(r.budget)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

