import { SectionCard } from "../../components/ui/SectionCard";
import BudgetsClient from "./BudgetsClient";
import { currentMonthYYYYMM, getMonthlyBudgets } from "../../lib/budgets";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const month = searchParams?.month ?? currentMonthYYYYMM();
  const data = await getMonthlyBudgets(month);

  return (
    <SectionCard
      title="Presupuestos"
      subtitle="Definí presupuesto mensual por categoría y mirá el avance real."
    >
      <BudgetsClient initial={data} />
    </SectionCard>
  );
}
