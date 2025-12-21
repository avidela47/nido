import { SectionCard } from "../../components/ui/SectionCard";
import PersonBudgetsClient from "./PersonBudgetsClient";
import { currentMonthYYYYMM } from "../../lib/budgets";
import { getMonthlyPersonBudgets } from "../../lib/personBudgets";

export default async function PersonBudgetsPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const month = searchParams?.month ?? currentMonthYYYYMM();
  const data = await getMonthlyPersonBudgets(month);

  return (
    <SectionCard
      title="Presupuesto por persona"
      subtitle="Definí un tope mensual de gastos para cada persona y controlá el avance."
    >
      <PersonBudgetsClient initial={data} />
    </SectionCard>
  );
}
