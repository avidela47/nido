type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function EmptyState({ title, description, actionLabel, actionHref }: Props) {
  return (
    <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-6 text-center shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="mx-auto max-w-md">
        <div className="text-base font-semibold">{title}</div>
        {description ? (
          <div className="mt-2 text-sm text-[rgb(var(--subtext))]">{description}</div>
        ) : null}

        {actionLabel && actionHref ? (
          <a
            href={actionHref}
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
          >
            {actionLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
