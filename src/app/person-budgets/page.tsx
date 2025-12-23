import { SectionCard } from "../../components/ui/SectionCard";
import PersonBudgetsClient from "./PersonBudgetsClient";
import { currentMonthYYYYMM } from "../../lib/budgets";
import { getMonthlyPersonBudgets } from "../../lib/personBudgets";
import { Suspense } from "react";

export default async function PersonBudgetsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const month = sp.month ?? currentMonthYYYYMM();
  const data = await getMonthlyPersonBudgets(month);

  return (
    <SectionCard
      title="Presupuesto por persona"
      subtitle="Definí un tope mensual de gastos para cada persona y controlá el avance."
    >
      <Suspense>
        <PersonBudgetsClient initial={data} />
      </Suspense>
    </SectionCard>
  );
}
