"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { currentMonthYYYYMM } from "../lib/dateRanges";
import { MonthInput } from "../components/ui/MonthInput";

export default function DashboardMonthPicker() {
  const router = useRouter();
  const params = useSearchParams();

  const month = useMemo(() => {
    const current = currentMonthYYYYMM();
    const fromUrl = params.get("month");
    return fromUrl ?? current;
  }, [params]);

  useEffect(() => {
    const fromUrl = params.get("month");
    if (!fromUrl) {
      const sp = new URLSearchParams(params.toString());
      sp.set("month", currentMonthYYYYMM());
      router.replace(`/?${sp.toString()}`);
    }
  }, [params, router]);

  function onChange(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", next);
    try {
      localStorage.setItem("app.month", next);
    } catch {}
    router.push(`/?${sp.toString()}`);
  }

  return (
    <MonthInput
      value={month}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
