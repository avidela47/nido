export type BudgetAlert = {
  status: "ok" | "warning" | "danger";
  percent: number;
  label: string;
};

export function computeBudgetAlert(spent: number, budget: number): BudgetAlert {
  if (!Number.isFinite(spent)) spent = 0;
  if (!Number.isFinite(budget)) budget = 0;

  if (budget <= 0) {
    return { status: "ok", percent: 0, label: "Sin presupuesto" };
  }

  const percent = Math.round((spent / budget) * 100);

  if (percent >= 100) return { status: "danger", percent, label: "Te pasaste" };
  if (percent >= 80) return { status: "warning", percent, label: "Al límite" };
  return { status: "ok", percent, label: "OK" };
}
