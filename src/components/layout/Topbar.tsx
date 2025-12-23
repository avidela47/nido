"use client";

import React, { useMemo, useState } from "react";
import { Search, Moon, Sun, ArrowRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "../theme/ThemeProvider";

export function Topbar() {
  const { isDark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  const placeholder = useMemo(() => {
    if (pathname.startsWith("/people")) return "Buscar persona…";
    if (pathname.startsWith("/transactions")) return "Buscar movimiento…";
    if (pathname.startsWith("/expenses")) return "Buscar gasto…";
    return "Buscar…";
  }, [pathname]);

  function submit() {
    const term = q.trim();
    setOpen(false);
    if (!term) return;

    // Búsqueda útil basada en pantallas existentes:
    // - /transactions soporta ?q
    // - /expenses soporta ?q
    // - /people no tiene filtro por query hoy, así que redirigimos a /transactions.
    if (pathname.startsWith("/expenses")) {
      router.push(`/expenses?q=${encodeURIComponent(term)}`);
      return;
    }

    if (pathname.startsWith("/transactions")) {
      router.push(`/transactions?q=${encodeURIComponent(term)}`);
      return;
    }

    // default
    router.push(`/transactions?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="min-w-0 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 hover:bg-[rgb(var(--muted))]"
            title="Buscar"
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>

          {open ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder={placeholder}
                className="w-56 bg-transparent text-sm outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={submit}
                className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-2"
                title="Buscar"
                aria-label="Buscar"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle (ACA PROBÁS) */}
          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-2"
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label="Cambiar tema"
          >
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;




