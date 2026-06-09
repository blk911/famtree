"use client";

import Link from "next/link";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import {
  SERVICE_DEFICITS_HUB_ID,
  SERVICE_DEFICITS_NAV_GROUPS,
} from "@/lib/intelligence/transpo/pipeline/service-deficits-nav-groups";

type Props = {
  activeTool: string;
};

function navItemById(id: string) {
  return transpoConfig.navItems.find((item) => item.id === id);
}

function NavChip({
  id,
  label,
  href,
  isActive,
  emphasis,
}: {
  id: string;
  label: string;
  href: string;
  isActive: boolean;
  emphasis?: boolean;
}) {
  return (
    <Link
      key={id}
      href={href}
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold no-underline sm:px-3 sm:text-xs"
      style={{
        border: isActive
          ? emphasis
            ? "1px solid #f59e0b"
            : "1px solid #c7d2fe"
          : emphasis
            ? "1px solid #fde68a"
            : "1px solid #e7e5e4",
        background: isActive
          ? emphasis
            ? "#fef3c7"
            : "#eef2ff"
          : emphasis
            ? "#fffbeb"
            : "#ffffff",
        color: isActive
          ? emphasis
            ? "#92400e"
            : "#3730a3"
          : emphasis
            ? "#b45309"
            : "#57534e",
        boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
      }}
    >
      {label}
    </Link>
  );
}

export function ServiceDeficitsGroupedNav({ activeTool }: Props) {
  const hub = navItemById(SERVICE_DEFICITS_HUB_ID);

  return (
    <div className="w-full space-y-3">
      {hub ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400">
            Hub
          </span>
          <NavChip
            id={hub.id}
            label={hub.label}
            href={hub.href}
            isActive={activeTool === hub.id}
          />
        </div>
      ) : null}

      {SERVICE_DEFICITS_NAV_GROUPS.map((group) => {
        const isReporting = group.id === "reporting_intelligence";
        return (
          <div key={group.id} className="w-full">
            <div
              className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide"
              style={{ color: isReporting ? "#b45309" : "#a8a29e" }}
            >
              {group.label}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {group.navItemIds.map((id) => {
                const item = navItemById(id);
                if (!item) return null;
                return (
                  <NavChip
                    key={id}
                    id={item.id}
                    label={item.label}
                    href={item.href}
                    isActive={activeTool === item.id}
                    emphasis={isReporting && id === "reporting-live-opportunities"}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
