import { redirect } from "next/navigation";

export default async function AccountLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const qs = new URLSearchParams();
  if (sp.month) qs.set("month", sp.month);
  redirect(`/accounts?ledger=${encodeURIComponent(id)}${qs.toString() ? `&${qs.toString()}` : ""}`);
}
