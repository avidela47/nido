"use client";
import React, { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Wallet, Eye, EyeOff } from "lucide-react";
import { KpiCard } from "../ui/KpiCard";

type Totals = {
  income: number;
  expense: number;
  balance: number;
};

export default function DashboardKpisClient({ totals }: { totals: Totals }) {
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("dashboard.hideAmounts");
      return raw === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("dashboard.hideAmounts", hidden ? "1" : "0");
    } catch {}
  }, [hidden]);

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          title={hidden ? "Mostrar montos" : "Ocultar montos"}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          <span className="hidden sm:inline">{hidden ? "Mostrar montos" : "Ocultar montos"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Ingresos (Mes)"
          value={new Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS'}).format(totals.income)}
          icon={<ArrowUpRight size={18} />}
          positive
          hideValue={hidden}
        />
        <KpiCard
          title="Gastos (Mes)"
          value={new Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS'}).format(-Math.abs(totals.expense))}
          icon={<ArrowDownRight size={18} />}
          hideValue={hidden}
        />
        <KpiCard
          title="Balance (Mes)"
          value={new Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS'}).format(totals.balance)}
          icon={<Wallet size={18} />}
          positive={totals.balance >= 0}
          hideValue={hidden}
        />
      </div>
    </div>
  );
}
