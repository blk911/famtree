"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ReportingNavPage =
  | "registry"
  | "live-targets"
  | "acquisition"
  | "signals"
  | "live-opportunities"
  | "data-owners";

const LINKS: {
  key: ReportingNavPage;
  href: string;
  label: string;
  primary?: boolean;
}[] = [
  { key: "live-opportunities", href: "/admin/intelligence/reporting/live-opportunities", label: "Live Opportunities", primary: true },
  { key: "data-owners", href: "/admin/intelligence/transpo/data-owners", label: "Data Owners" },
  { key: "registry", href: "/admin/intelligence/reporting", label: "Reporting Registry" },
  { key: "signals", href: "/admin/intelligence/reporting/signals", label: "Signals" },
  { key: "live-targets", href: "/admin/intelligence/reporting/live-targets", label: "Live Targets" },
  { key: "acquisition", href: "/admin/intelligence/reporting/acquisition", label: "Acquisition" },
];

function resolveCurrent(pathname: string, override?: ReportingNavPage): ReportingNavPage | "" {
  if (override) return override;
  if (pathname === "/admin/intelligence/reporting/live-opportunities") return "live-opportunities";
  if (pathname === "/admin/intelligence/reporting/live-targets") return "live-targets";
  if (pathname === "/admin/intelligence/reporting/acquisition") return "acquisition";
  if (pathname === "/admin/intelligence/reporting/signals") return "signals";
  if (pathname === "/admin/intelligence/reporting") return "registry";
  if (pathname.startsWith("/admin/intelligence/transpo/data-owners")) return "data-owners";
  return "";
}

type Props = {
  current?: ReportingNavPage;
};

export function ReportingIntelligenceNav({ current }: Props) {
  const pathname = usePathname();
  const active = resolveCurrent(pathname, current);

  return (
    <nav
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50/40 p-3"
      aria-label="Reporting Intelligence"
    >
      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
        Reporting Intelligence
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {LINKS.map((link) => {
          const isActive = active === link.key;
          return (
            <Link
              key={link.key}
              href={link.href}
              className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold no-underline sm:px-3 sm:text-xs"
              style={{
                border: isActive
                  ? link.primary
                    ? "1px solid #f59e0b"
                    : "1px solid #c7d2fe"
                  : link.primary
                    ? "1px solid #fde68a"
                    : "1px solid #e7e5e4",
                background: isActive
                  ? link.primary
                    ? "#fef3c7"
                    : "#eef2ff"
                  : link.primary
                    ? "#fffbeb"
                    : "#fff",
                color: isActive
                  ? link.primary
                    ? "#92400e"
                    : "#3730a3"
                  : link.primary
                    ? "#b45309"
                    : "#57534e",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
