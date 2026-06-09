"use client";

import Link from "next/link";

export type ReportingNavPage =
  | "registry"
  | "live-targets"
  | "acquisition"
  | "signals"
  | "live-opportunities";

const LINKS: { key: ReportingNavPage; href: string; label: string; highlight?: boolean }[] = [
  { key: "registry", href: "/admin/intelligence/reporting", label: "Registry" },
  { key: "live-opportunities", href: "/admin/intelligence/reporting/live-opportunities", label: "Live opportunities", highlight: true },
  { key: "live-targets", href: "/admin/intelligence/reporting/live-targets", label: "Live targets" },
  { key: "acquisition", href: "/admin/intelligence/reporting/acquisition", label: "Acquisition" },
  { key: "signals", href: "/admin/intelligence/reporting/signals", label: "Signals" },
];

export function ReportingIntelligenceNav({ current }: { current: ReportingNavPage }) {
  return (
    <nav className="mb-4 flex flex-wrap gap-2" aria-label="Reporting intelligence">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className="rounded-full px-3 py-1 text-xs font-bold no-underline"
          style={{
            border: `1px solid ${current === link.key ? (link.highlight ? "#fcd34d" : "#c7d2fe") : "#e7e5e4"}`,
            background:
              current === link.key
                ? link.highlight
                  ? "#fef3c7"
                  : "#eef2ff"
                : link.highlight
                  ? "#fffbeb"
                  : "#fff",
            color:
              current === link.key
                ? link.highlight
                  ? "#92400e"
                  : "#3730a3"
                : link.highlight
                  ? "#b45309"
                  : "#78716c",
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
