"use client";

import { ComponentPropsWithoutRef } from "react";

type YearInputProps = {
  label?: string;
} & ComponentPropsWithoutRef<"input">;

export function YearInput({ label = "Año", className = "", ...props }: YearInputProps) {
  return (
    <div className="flex items-center gap-2">
      {label ? <div className="text-xs font-semibold text-[rgb(var(--subtext))]">{label}</div> : null}
      <input
        {...props}
        inputMode={props.inputMode ?? "numeric"}
        pattern={props.pattern ?? "^\\d{4}$"}
        placeholder={props.placeholder ?? "2025"}
        className={
          "rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[rgba(var(--brand),0.45)] focus:ring-2 focus:ring-[rgba(var(--brand),0.18)] " +
          className
        }
      />
    </div>
  );
}
