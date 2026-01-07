import { SectionCard } from "../../components/ui/SectionCard";
import TransactionsClient from "./TransactionsClient";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; q?: string; accountId?: string; personId?: string }>;
}) {
  // Se mantiene para compatibilidad con el App Router, pero los filtros se aplican
  // 100% del lado cliente dentro de TransactionsClient usando search params.
  void searchParams;

  return (
    <SectionCard title="Movimientos" subtitle="Listado por mes. Editar o borrar (soft delete).">
      <TransactionsClient />
    </SectionCard>
  );
}
