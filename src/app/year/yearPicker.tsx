"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

function currentYear(): string {
  return String(new Date().getFullYear());
}

export default function YearPicker() {
  const router = useRouter();
  const params = useSearchParams();

  const year = useMemo(() => params.get("year") ?? currentYear(), [params]);

  function onChange(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("year", next);
    router.push(`/year?${sp.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs font-semibold text-[rgb(var(--subtext))]">Año</div>
      <input
        type="number"
        min={2000}
        max={2100}
        value={year}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[rgba(var(--brand),0.45)] focus:ring-2 focus:ring-[rgba(var(--brand),0.18)]"
      />
    </div>
  );
}
