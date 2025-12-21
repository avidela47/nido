import { SectionCard } from "../../components/ui/SectionCard";

export default function BudgetsPage() {
  return (
    <SectionCard title="Presupuestos" subtitle="Límites mensuales por categoría">
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--subtext))]">
        Presupuestos del hogar (mock).
      </div>
    </SectionCard>
  );
}
