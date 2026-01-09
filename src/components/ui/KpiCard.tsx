import React from "react";

interface KpiCardProps {
  title: string;
  value: string;
  positive?: boolean;
  icon?: React.ReactNode;
  hideValue?: boolean;
}

export function KpiCard({ title, value, positive, icon, hideValue = false }: KpiCardProps) {
  const display = hideValue ? "••••••" : value;

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        {icon && (
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[rgba(var(--brand),0.10)] text-[rgb(var(--brand-dark))]">
            {icon}
          </div>
        )}
      </div>
      <div className={`mt-3 text-2xl font-semibold tabular-nums ${positive ? "text-emerald-600" : ""}`}>
        {display}
      </div>
    </div>
  );
}
