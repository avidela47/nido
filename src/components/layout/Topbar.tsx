import { Search } from "lucide-react";

export function Topbar() {
  return (
    <header className="rounded-3xl border border-[rgb(var(--border))] bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden md:block">
            <div className="text-sm font-semibold">Panel</div>
            <div className="text-xs text-[rgb(var(--subtext))]">Diseño moderno · Nido</div>
          </div>

          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              placeholder="Buscar (más adelante)"
              className="w-full rounded-2xl border border-[rgb(var(--border))] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[rgba(var(--brand),0.45)] focus:ring-2 focus:ring-[rgba(var(--brand),0.18)]"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white">
          + Transacción (próximo)
        </div>
      </div>
    </header>
  );
}

