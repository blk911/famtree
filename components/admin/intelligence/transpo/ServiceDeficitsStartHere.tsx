"use client";

import Link from "next/link";

const CARDS = [
  {
    title: "Live Opportunities",
    description:
      "Ranked decision surface for acquiring Monthly Performance Reports, dialysis failures, and complaint records — where denial and no-show intelligence lives.",
    href: "/admin/intelligence/reporting/live-opportunities",
    cta: "Open Live Opportunities",
    emphasis: true,
  },
  {
    title: "Data Owners",
    description:
      "Who holds the ride ledger, broker reports, and complaint records — the acquisition path before CORA requests.",
    href: "/admin/intelligence/transpo/data-owners",
    cta: "Open Data Owners",
  },
  {
    title: "Provider Capacity",
    description:
      "County provider counts and capacity signals — where network gaps may explain no-provider-available denials.",
    href: "/admin/intelligence/transpo/providers",
    cta: "Open Provider Capacity",
  },
  {
    title: "County Opportunities",
    description:
      "County-level service deficit dossiers — geographic gaps that pair with operational report acquisition.",
    href: "/admin/intelligence/transpo/county-opportunities",
    cta: "Open County Opportunities",
  },
];

export function ServiceDeficitsStartHere() {
  return (
    <section className="mb-5 rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
      <h2 className="m-0 text-sm font-extrabold uppercase tracking-wide text-amber-950">
        Start Here
      </h2>
      <p className="m-0 mt-1 text-xs text-amber-900/80">
        Two clicks to Monthly Performance Report, Dialysis Report, and Complaint Investigation targets.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <div
            key={card.href}
            className="flex flex-col rounded-lg border p-3"
            style={{
              borderColor: card.emphasis ? "#f59e0b" : "#e7e5e4",
              background: card.emphasis ? "#fffbeb" : "#fff",
            }}
          >
            <h3 className="m-0 text-sm font-extrabold text-stone-900">{card.title}</h3>
            <p className="m-0 mt-1 flex-1 text-xs leading-relaxed text-stone-600">
              {card.description}
            </p>
            <Link
              href={card.href}
              className="mt-3 inline-block w-fit rounded-full px-3 py-1.5 text-xs font-bold no-underline"
              style={{
                background: card.emphasis ? "#f59e0b" : "#4338ca",
                color: "#fff",
              }}
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
