"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { IntelligenceContextBadge } from "@/components/admin/IntelligenceContextBadge";
import { SalonNetworkVizLauncher } from "@/components/admin/intelligence/salon/SalonNetworkVizLauncher";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import {
  pipelineStageDef,
  pipelineStageForNavItem,
  pipelineStageForPathname,
} from "@/lib/intelligence/salon/pipeline/salon-pipeline-config";
import type { SalonPipelineStageId } from "@/lib/intelligence/salon/pipeline/pipeline-types";

type SalonPipelineNavProps = {
  currentTool: string;
  trailing?: React.ReactNode;
};

function resolveCurrentTool(pathname: string, override?: string): string {
  if (override) return override;
  const sorted = [...salonConfig.navItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  return match?.id ?? "";
}

export function SalonPipelineNav({ currentTool, trailing }: SalonPipelineNavProps) {
  const pathname = usePathname();
  const activeTool = resolveCurrentTool(pathname, currentTool);
  const pathStage = pipelineStageForPathname(pathname);
  const toolStage = pipelineStageForNavItem(activeTool);

  const selectedStage: SalonPipelineStageId = toolStage ?? pathStage;

  const stageNavItems = useMemo(() => {
    const stage = pipelineStageDef(selectedStage);
    const ids = new Set(stage.navItemIds);
    return salonConfig.navItems.filter((item) => ids.has(item.id));
  }, [selectedStage]);

  const activeToolLabel =
    salonConfig.navItems.find((item) => item.id === activeTool)?.label ?? "Tool";

  return (
    <div className="mb-3">
      <MarketIntelChrome />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-stone-500">
            <Link href="/admin/studios" className="font-semibold text-stone-600 no-underline hover:text-stone-900">
              Discovery
            </Link>
            <span className="text-stone-300">›</span>
            <span className="font-bold text-stone-800">{pipelineStageDef(selectedStage).label}</span>
            <span className="text-stone-300">›</span>
            <span className="font-semibold text-rose-900">{activeToolLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {stageNavItems.map(({ id, label, href }) => {
              const isActive = id === activeTool;
              return (
                <Link
                  key={id}
                  href={href}
                  className={[
                    "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold no-underline whitespace-nowrap",
                    isActive
                      ? "bg-rose-900 text-white shadow-sm"
                      : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
            {trailing}
          </div>

          <IntelligenceContextBadge
            verticalLabel={salonConfig.label}
            dataScope={salonConfig.dataScope}
          />
        </div>

        <div className="relative z-[2] shrink-0 self-start pt-0.5">
          <SalonNetworkVizLauncher thumbSize={120} modalWidth={700} modalHeight={800} />
        </div>
      </div>
    </div>
  );
}
