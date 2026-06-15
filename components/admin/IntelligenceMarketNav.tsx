"use client";
// components/admin/IntelligenceMarketNav.tsx
// Vertical filter chips — distinct from workflow navigation.

import Link from "next/link";
import { usePathname } from "next/navigation";

const VERTICALS = [
  { key: "salon", label: "Salon", href: "/admin/intelligence/salon" },
  { key: "transpo", label: "Transpo", href: "/admin/intelligence/transpo" },
  { key: "hcare", label: "HCare", href: "/admin/intelligence/hcare" },
  { key: "labs", label: "Labs", href: "/admin/intelligence/labs" },
] as const;

function resolveActiveVertical(pathname: string): string {
  if (pathname.startsWith("/admin/intelligence/transpo")) return "transpo";
  if (pathname.startsWith("/admin/intelligence/hcare")) return "hcare";
  if (pathname.startsWith("/admin/intelligence/labs")) return "labs";
  if (
    pathname.startsWith("/admin/discovery") ||
    pathname.startsWith("/admin/studios") ||
    pathname.startsWith("/admin/intelligence/salon")
  ) {
    return "salon";
  }
  return "";
}

export function MarketIntelVerticalFilters() {
  const pathname = usePathname();
  const active = resolveActiveVertical(pathname);

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Intelligence vertical">
      <span className="mr-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
        Vertical
      </span>
      {VERTICALS.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            className={[
              "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium no-underline transition-colors",
              isActive
                ? "bg-rose-100 text-rose-900 ring-1 ring-rose-200"
                : "bg-stone-50 text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100 hover:text-stone-700",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/** @deprecated Use MarketIntelVerticalFilters */
export const IntelligenceMarketNav = MarketIntelVerticalFilters;
