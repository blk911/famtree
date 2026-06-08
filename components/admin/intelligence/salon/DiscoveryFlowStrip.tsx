"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DISCOVERY_FLOW_STAGES,
  discoveryFlowStageForPathname,
  type DiscoveryFlowStageId,
} from "@/lib/intelligence/salon/discovery-flow-config";

type Props = {
  className?: string;
};

export function DiscoveryFlowStrip({ className = "" }: Props) {
  const pathname = usePathname();
  const active = discoveryFlowStageForPathname(pathname);

  return (
    <nav
      aria-label="Discovery flow"
      className={`flex flex-wrap items-center gap-1 ${className}`.trim()}
    >
      {DISCOVERY_FLOW_STAGES.map((stage, index) => {
        const isActive = stage.id === active;
        const isRuns = stage.id === "runs";
        const isLast = index === DISCOVERY_FLOW_STAGES.length - 1;

        return (
          <span key={stage.id} className="inline-flex items-center gap-1">
            <Link
              href={stage.primaryHref}
              className={[
                "inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold no-underline transition-colors",
                isActive
                  ? isRuns
                    ? "bg-stone-600 text-white"
                    : "bg-rose-900 text-white"
                  : isRuns
                    ? "border border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-stone-400 hover:text-stone-700"
                    : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900",
              ].join(" ")}
            >
              {stage.label}
            </Link>
            {!isLast ? (
              <span className="text-[10px] text-stone-300" aria-hidden>
                →
              </span>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}

export type { DiscoveryFlowStageId };
