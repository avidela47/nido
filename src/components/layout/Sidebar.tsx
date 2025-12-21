import Link from "next/link";
import { Wallet, ArrowLeftRight, Users, Tags, Target, Plus } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 md:block">
      <div className="sticky top-4 space-y-4">
        {/* Marca */}
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] text-white shadow-sm">
              <Wallet size={18} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">Nido</div>
              <div className="mt-0.5 text-xs text-[rgb(var(--subtext))]">
                Donde el dinero encuentra orden
              </div>
            </div>
          </div>
        </div>

        {/* Menú */}
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-2 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <nav className="space-y-1">
            <NavLink href="/" label="Dashboard" icon={<Wallet size={18} />} />
            <NavLink href="/transactions" label="Movimientos" icon={<ArrowLeftRight size={18} />} />
            <NavLink href="/people" label="Personas" icon={<Users size={18} />} />
            <NavLink href="/categories" label="Categorías" icon={<Tags size={18} />} />
            <NavLink href="/budgets" label="Presupuestos" icon={<Target size={18} />} />
          </nav>
        </div>

        {/* CTA */}
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-3 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          <Link
            href="/transactions/new"
            className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-3 text-sm font-semibold text-white"
          >
            <Plus size={18} />
            Nueva transacción
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-[rgb(var(--text))] hover:bg-[rgba(var(--brand),0.10)]"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(var(--brand),0.10)] text-[rgb(var(--brand-dark))]">
        {icon}
      </span>
      {label}
    </Link>
  );
}


