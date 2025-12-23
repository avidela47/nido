"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Home,
  Users,
  Wallet,
  PiggyBank,
  Tags,
  BarChart3,
  FileDown,
  CalendarDays,
  Sparkles,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/people", label: "Personas", icon: Users },
    { href: "/transactions", label: "Movimientos", icon: Wallet },
    { href: "/budgets", label: "Presupuestos", icon: PiggyBank },
    { href: "/categories", label: "Categorías", icon: Tags },
    { href: "/reports", label: "Reportes", icon: BarChart3 },
    { href: "/reports/advanced", label: "Avanzados", icon: Sparkles, badge: "PRO" },
    { href: "/year", label: "Anual", icon: CalendarDays },
    { href: "/export", label: "Export / Backup", icon: FileDown },
  ];

  return (
  <aside className="w-full md:w-65">
      <div className="sticky top-4">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          {/* Brand */}
          <div className="px-2 py-2">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/logo.png"
                alt=""
                width={360}
                height={84}
                className="h-18 w-auto"
                priority
              />

              <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                Donde el dinero encuentra orden
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-2 h-px bg-[rgb(var(--border))]" />

          {/* Nav */}
          <nav className="space-y-1">
            {items.map((it) => {
              const active = isActive(pathname, it.href);
              const Icon = it.icon;

              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                    "border border-transparent",
                    active
                      ? "bg-[rgb(var(--muted))] border-[rgb(var(--border))]"
                      : "hover:bg-[rgb(var(--muted))] hover:border-[rgb(var(--border))]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-2xl transition",
                      active
                        ? "bg-brand-gradient text-white shadow-[0_8px_22px_rgba(0,0,0,0.18)]"
                        : "bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--subtext))] group-hover:text-[rgb(var(--fg))]",
                    ].join(" ")}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className={active ? "font-semibold" : "font-semibold text-[rgb(var(--fg))]"}>
                      {it.label}
                    </span>
                    {it.href === "/reports/advanced" ? (
                      <span className="ml-2 inline-flex items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-0.5 text-[10px] font-semibold text-[rgb(var(--subtext))]">
                        Export PNG/PDF
                      </span>
                    ) : null}
                  </span>

                  {it.badge ? (
                    <span className="inline-flex items-center rounded-full bg-brand-gradient px-2 py-0.75 text-[10px] font-semibold text-white">
                      {it.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
