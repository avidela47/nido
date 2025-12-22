type Props = {
  status: "ok" | "warning" | "danger";
  percent: number;
  label: string;
};

const styles: Record<Props["status"], string> = {
  ok: "bg-green-100 text-green-700 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  danger: "bg-red-100 text-red-700 border-red-200",
};

export default function BudgetBadge({ status, percent, label }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{percent}%</span>
    </div>
  );
}
