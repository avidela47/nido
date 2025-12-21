"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

function currentMonthYYYYMM(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function DashboardMonthPicker() {
  const router = useRouter();
  const params = useSearchParams();

  const month = useMemo(() => {
    return params.get("month") ?? currentMonthYYYYMM();
  }, [params]);

  function onChange(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    router.push(`/?${sp.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Mes</div>
      <input
        type="month"
        value={month}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[rgba(var(--brand),0.45)] focus:ring-2 focus:ring-[rgba(var(--brand),0.18)]"
      />
    </div>
  );
}
