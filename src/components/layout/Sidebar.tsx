"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PlusCircle,
  Wallet,
  TrendingDown,
  CalendarRange,
  Download,
  Users,
} from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/transactions/new", label: "Nuevo movimiento", icon: PlusCircle },
  { href: "/budgets", label: "Presupuestos", icon: Wallet },
  { href: "/expenses", label: "Top gastos", icon: TrendingDown },
  { href: "/people-summary", label: "Por persona", icon: Users },
  { href: "/year", label: "Año", icon: CalendarRange },
  { href: "/export", label: "Exportar", icon: Download },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-[rgb(var(--border))] bg-white px-4 py-5">
      <div className="mb-6 px-2">
        <div className="text-lg font-bold tracking-tight">Nido</div>
        <div className="text-xs text-[rgb(var(--subtext))]">Donde el dinero encuentra orden</div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition
                ${
                  active
                    ? "bg-[rgb(var(--muted))] text-[rgb(var(--brand))]"
                    : "text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))]"
                }
              `}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-[rgb(var(--border))] pt-4 text-xs text-[rgb(var(--subtext))]">
        Nido · Finanzas del hogar
      </div>
    </aside>
  );
}
