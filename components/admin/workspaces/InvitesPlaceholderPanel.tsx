import Link from "next/link";
import { INVITES_ADMIN_ROUTES } from "@/lib/admin/invites-workspace";

type Props = {
  title: string;
  description: string;
  plannedSignals?: string[];
};

export function InvitesPlaceholderPanel({ title, description, plannedSignals = [] }: Props) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-5">
        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-stone-500">Placeholder</p>
        <h2 className="m-0 mt-1 text-lg font-extrabold text-stone-900">{title}</h2>
        <p className="m-0 mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
        {plannedSignals.length ? (
          <ul className="m-0 mt-3 list-disc space-y-1 pl-5 text-xs text-stone-600">
            {plannedSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        ) : null}
        <p className="m-0 mt-4 text-xs text-stone-500">
          No synthetic metrics are shown here. Data will appear when tracking is connected.
        </p>
      </div>
      <Link
        href={INVITES_ADMIN_ROUTES.hub}
        className="inline-flex text-xs font-semibold text-rose-900 no-underline hover:text-rose-950"
      >
        ← Back to Invites operating center
      </Link>
    </div>
  );
}
