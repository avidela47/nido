
import { Landmark, Smartphone, CreditCard, User } from "lucide-react";
import DashboardMonthPicker from "./DashboardMonthPicker";
import { getMonthlySummary } from "../lib/summary";
import { formatCurrencyARS } from "../lib/format";
import { currentMonthYYYYMM } from "../lib/dateRanges";
import { Suspense } from "react";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { KpiCard } from "../components/ui/KpiCard";
export default async function Page({ searchParams }: { searchParams?: Promise<{ month?: string }> }) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const summary = await getMonthlySummary(month);

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
          value={formatCurrencyARS(summary.totals.income)}
          icon={<ArrowUpRight size={18} />}
          positive
        />
        <KpiCard
          title="Gastos (Mes)"
          value={formatCurrencyARS(-Math.abs(summary.totals.expense))}
          icon={<ArrowDownRight size={18} />}
        />
        <KpiCard
          title="Balance (Mes)"
          value={formatCurrencyARS(summary.totals.balance)}
          icon={<Wallet size={18} />}
          positive={summary.totals.balance >= 0}
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

  {/* Top categorías con más gasto */}
  <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
    <div className="mb-3">
      <div className="text-sm font-semibold">Top categorías de gasto</div>
      <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Las 3 categorías con más gasto este mes</div>
    </div>
    <div className="space-y-2">
      {summary.byCategory
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 3)
        .map((c) => (
          <div key={c.categoryId} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-white p-3">
            <div className="font-semibold text-sm text-gray-800 truncate">{c.categoryName}</div>
            <div className="text-sm font-semibold text-blue-700 tabular-nums">{formatCurrencyARS(-Math.abs(c.spent))}</div>
          </div>
        ))}
      {summary.byCategory.length === 0 && (
        <div className="text-sm text-[rgb(var(--subtext))]">No hay gastos este mes.</div>
      )}
    </div>
  </div>

  {/* Top personas con más gasto */}
  <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
    <div className="mb-3">
      <div className="text-sm font-semibold">Top personas con más gasto</div>
      <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Las 3 personas que más gastaron este mes</div>
    </div>
    <div className="space-y-2">
      {summary.byPerson
        .sort((a, b) => b.expense - a.expense)
        .slice(0, 3)
        .map((p) => (
          <div key={p.personId} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-white p-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-gray-800 truncate">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-[rgba(var(--brand),0.10)] text-[rgb(var(--brand-dark))]">
                <User size={16} />
              </span>
              {p.personName}
            </div>
            <div className="text-sm font-semibold text-blue-700 tabular-nums">{formatCurrencyARS(-Math.abs(p.expense))}</div>
          </div>
        ))}
      {summary.byPerson.length === 0 && (
        <div className="text-sm text-[rgb(var(--subtext))]">No hay gastos este mes.</div>
      )}
    </div>
  </div>

  {/* Alertas de saldo bajo en cuentas */}
  <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
    <div className="mb-3">
  <div className="text-sm font-semibold">Alertas de saldo bajo en cuentas</div>
  <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Cuentas con saldo menor a $10.000</div>
    </div>
    <div className="space-y-2">
      {summary.byAccount
  .filter((a) => a.balance < 10000)
        .map((a) => {
          // Icono según tipo de cuenta
          let icon = null;
          let iconBg = "bg-slate-50 text-slate-700 border-slate-200";
          if (a.type === "bank") {
            icon = <Landmark size={16} />;
            iconBg = "bg-sky-50 text-sky-700 border-sky-200";
          } else if (a.type === "cash") {
            icon = <Wallet size={16} />;
            iconBg = "bg-slate-50 text-slate-700 border-slate-200";
          } else if (a.type === "wallet") {
            icon = <Smartphone size={16} />;
            iconBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
          } else if (a.type === "credit") {
            icon = <CreditCard size={16} />;
            iconBg = "bg-violet-50 text-violet-700 border-violet-200";
          }
          return (
            <div key={a.accountId} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-white p-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-gray-800 truncate">
                <span className={`grid h-7 w-7 place-items-center rounded-xl ${iconBg}`}>{icon}</span>
                {a.accountName}
                {a.personName ? (
                  <span className="ml-2 text-xs text-[rgb(var(--subtext))]">- {a.personName}</span>
                ) : (
                  <span className="ml-2 text-xs text-[rgb(var(--subtext))]">- Sin asignar</span>
                )}
              </div>
              <div className="text-sm font-semibold text-red-700 tabular-nums">{formatCurrencyARS(a.balance)}</div>
            </div>
          );
        })}
      {summary.byAccount && summary.byAccount.filter((a) => a.balance < 10000).length === 0 && (
        <div className="text-sm text-[rgb(var(--subtext))]">No hay cuentas con saldo bajo.</div>
      )}
    </div>
  </div>

  {/* Movimientos recientes */}
  <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
    <div className="mb-3">
      <div className="text-sm font-semibold">Movimientos recientes</div>
      <div className="mt-1 text-xs text-[rgb(var(--subtext))]">Últimos 5 movimientos del mes</div>
    </div>
    <div className="space-y-2">
      {summary.recent && summary.recent.slice(0, 5).map((m) => (
        <div key={m._id} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-white p-3">
          <div className="flex flex-col">
            <div className="font-semibold text-sm text-gray-800 truncate">{m.categoryName} · {m.personName}</div>
            <div className="text-xs text-[rgb(var(--subtext))]">{m.date}</div>
          </div>
          <div className={`text-sm font-semibold tabular-nums ${m.type === "income" ? "text-emerald-700" : "text-blue-700"}`}>{formatCurrencyARS(m.amount)}</div>
        </div>
      ))}
      {(!summary.recent || summary.recent.length === 0) && (
        <div className="text-sm text-[rgb(var(--subtext))]">No hay movimientos recientes.</div>
      )}
    </div>
  </div>
    </div>
  );
}


// Componente AlertBoxCategory eliminado porque no se usa

