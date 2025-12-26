import { SectionCard } from "../../../components/ui/SectionCard";
import TransferDetailsClient from "./TransferDetailsClient";
import type { TransferLeg } from "./TransferDetailsClient";

async function getDetails(groupId: string): Promise<TransferLeg[]> {
  const res = await fetch(`http://localhost:3000/api/transfers/${encodeURIComponent(groupId)}/details`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return data?.ok ? (data.legs as TransferLeg[]) : [];
}

export default async function TransferDetailsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const legs = await getDetails(groupId);

  return (
    <SectionCard title="Detalle de transferencia" subtitle={`Grupo: ${groupId}`}>
      <TransferDetailsClient groupId={groupId} legs={legs} />
    </SectionCard>
  );
}
