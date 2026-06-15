import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  INVITES_ADMIN_ROUTES,
  INVITES_OPERATING_CARDS,
  type InvitesOperatingCardStatus,
} from "@/lib/admin/invites-workspace";

function statusBadge(status: InvitesOperatingCardStatus): { label: string; className: string } {
  if (status === "live") {
    return {
      label: "Live",
      className: "bg-emerald-100 text-emerald-900",
    };
  }
  if (status === "partial") {
    return {
      label: "Partial",
      className: "bg-sky-100 text-sky-900",
    };
  }
  return {
    label: "Coming soon",
    className: "bg-stone-200 text-stone-600",
  };
}

export function InvitesOperatingCenter() {
  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-1">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-2xl">
          VMB Invites Operating Center
        </h1>
        <p className="m-0 max-w-3xl text-sm leading-relaxed text-stone-600">
          Configure templates, offers, and services — then monitor queues, sent invites, claims,
          opens, and conversions. Canonical admin routes live under{" "}
          <code className="text-xs">/admin/invites/*</code>; salon operator actions remain in the
          VMB product shell.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="m-0 text-sm font-extrabold text-stone-900">Operating areas</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {INVITES_OPERATING_CARDS.map((card) => {
            const badge = statusBadge(card.status);
            return (
              <Link
                key={card.id}
                href={card.href}
                prefetch={false}
                className="group flex flex-col rounded-lg border border-stone-200 bg-white p-3 no-underline shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                <span className="flex items-center gap-2 text-xs font-extrabold text-stone-900">
                  {card.label}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </span>
                <span className="mt-1 flex-1 text-[11px] leading-snug text-stone-500">
                  {card.description}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-900 group-hover:text-rose-950">
                  Open
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4">
          <h3 className="m-0 text-xs font-extrabold text-stone-800">Claims tracking</h3>
          <p className="m-0 mt-1 text-[11px] leading-snug text-stone-500">
            CTA claim events are not wired to admin analytics yet. Placeholder panel at{" "}
            <Link href={INVITES_ADMIN_ROUTES.claims} className="font-semibold text-stone-700">
              Claims
            </Link>
            .
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4">
          <h3 className="m-0 text-xs font-extrabold text-stone-800">Open tracking</h3>
          <p className="m-0 mt-1 text-[11px] leading-snug text-stone-500">
            Channel open/read signals will surface here when ingest is connected. See{" "}
            <Link href={INVITES_ADMIN_ROUTES.opens} className="font-semibold text-stone-700">
              Opens
            </Link>
            .
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4">
          <h3 className="m-0 text-xs font-extrabold text-stone-800">Conversion funnel</h3>
          <p className="m-0 mt-1 text-[11px] leading-snug text-stone-500">
            Booking and revenue attribution is planned — no synthetic metrics. See{" "}
            <Link href={INVITES_ADMIN_ROUTES.conversions} className="font-semibold text-stone-700">
              Conversions
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="space-y-2 border-t border-stone-200 pt-4">
        <h2 className="m-0 text-sm font-extrabold text-stone-900">Salon operator views</h2>
        <p className="m-0 text-xs text-stone-500">
          Approve, queue, and send from the VMB product — admin workspace is read/configure first.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/vmb/today" className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 no-underline hover:bg-stone-50">
            Today / preview
          </Link>
          <Link href="/vmb/queue" className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 no-underline hover:bg-stone-50">
            Queue (operator)
          </Link>
          <Link href="/vmb/invites" className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 no-underline hover:bg-stone-50">
            Invites (operator)
          </Link>
        </div>
      </section>
    </div>
  );
}
