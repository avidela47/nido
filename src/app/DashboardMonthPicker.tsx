"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { currentMonthYYYYMM } from "../lib/dateRanges";
import { MonthInput } from "../components/ui/MonthInput";

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
    <MonthInput
      value={month}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
