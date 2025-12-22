export default function InlineLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--subtext))]">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-[rgb(var(--border))] border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
