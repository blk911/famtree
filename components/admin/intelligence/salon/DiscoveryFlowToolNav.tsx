"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DISCOVERY_FLOW_STAGES,
  discoveryFlowStageForPathname,
  discoveryFlowToolForPathname,
} from "@/lib/intelligence/salon/discovery-flow-config";

function isToolActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DiscoveryFlowToolNav() {
  const pathname = usePathname();
  const activeStage = discoveryFlowStageForPathname(pathname);
  const activeTool = discoveryFlowToolForPathname(pathname);

  return (
    <div className="space-y-2">
      {DISCOVERY_FLOW_STAGES.map((stage) => {
        const stageActive = stage.id === activeStage;
        const isRuns = stage.auditStyle;

        return (
          <div
            key={stage.id}
            className={[
              "flex flex-wrap items-center gap-x-2 gap-y-1",
              isRuns && !stageActive ? "opacity-70" : "",
            ].join(" ")}
          >
            <span
              className={[
                "w-14 shrink-0 text-[10px] font-bold uppercase tracking-wide",
                stageActive
                  ? isRuns
                    ? "text-stone-600"
                    : "text-rose-900"
                  : "text-stone-400",
              ].join(" ")}
            >
              {stage.label}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {stage.tools.map((tool) => {
                const isActive =
                  activeTool?.id === tool.id || isToolActive(pathname, tool.href);

                if (tool.comingSoon) {
                  return (
                    <span
                      key={tool.id}
                      className="inline-flex h-6 cursor-not-allowed items-center rounded-md border border-dashed border-stone-200 px-2 text-[11px] font-medium text-stone-400"
                    >
                      {tool.label}
                      <span className="ml-1 text-[9px]">soon</span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    prefetch={tool.external ? false : undefined}
                    className={[
                      "inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold no-underline whitespace-nowrap",
                      isActive
                        ? isRuns
                          ? "bg-stone-700 text-white"
                          : "bg-rose-900 text-white shadow-sm"
                        : isRuns
                          ? "border border-dashed border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
                          : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                    ].join(" ")}
                  >
                    {tool.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
