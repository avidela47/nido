"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

function titleFromPath(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/transactions/new")) return "Nuevo movimiento";
  if (pathname.startsWith("/transactions")) return "Transacciones";
  if (pathname.startsWith("/budgets")) return "Presupuestos";
  if (pathname.startsWith("/expenses")) return "Top gastos";
  if (pathname.startsWith("/year")) return "Año";
  if (pathname.startsWith("/export")) return "Exportar";
  return "Nido";
}

export default function Topbar() {
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <header className="flex flex-col gap-3 rounded-3xl border border-[rgb(var(--border))] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)] md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="truncate text-base font-semibold tracking-tight">{title}</div>
        <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
          Nido — Donde el dinero encuentra orden
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 md:flex">
          <Search size={16} className="text-[rgb(var(--subtext))]" />
          <input
            placeholder="Buscar (próximamente)"
            className="w-56 bg-transparent text-sm outline-none"
            disabled
          />
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgb(var(--border))] bg-white hover:bg-[rgb(var(--muted))]"
          title="Notificaciones (próximamente)"
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}


