"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_WORKSPACE_ROUTES } from "@/lib/admin/workspace-routes";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { IntelligenceContextBadge } from "@/components/admin/IntelligenceContextBadge";
import { SalonNetworkVizLauncher } from "@/components/admin/intelligence/salon/SalonNetworkVizLauncher";
import { DiscoveryFlowToolNav } from "@/components/admin/intelligence/salon/DiscoveryFlowToolNav";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import {
  discoveryFlowStageDef,
  discoveryFlowStageForNavId,
  discoveryFlowStageForPathname,
  discoveryFlowToolForPathname,
} from "@/lib/intelligence/salon/discovery-flow-config";

type SalonPipelineNavProps = {
  currentTool?: string;
  trailing?: React.ReactNode;
};

export function SalonPipelineNav({ currentTool, trailing }: SalonPipelineNavProps) {
  const pathname = usePathname();
  const activeStage = discoveryFlowStageForNavId(currentTool ?? "")
    ?? discoveryFlowStageForPathname(pathname);
  const stageDef = discoveryFlowStageDef(activeStage);
  const activeTool = discoveryFlowToolForPathname(pathname);
  const activeToolLabel =
    activeTool?.label
    ?? salonConfig.navItems.find((item) => item.id === currentTool)?.label
    ?? "Tool";

  return (
    <div className="mb-4">
      <MarketIntelChrome showDiscoveryFlow />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-stone-500">
            <Link
              href={ADMIN_WORKSPACE_ROUTES.discovery}
              className="font-semibold text-stone-600 no-underline hover:text-stone-900"
            >
              Discovery
            </Link>
            <span className="text-stone-300">›</span>
            <span className="font-bold text-stone-800">{stageDef.label}</span>
            <span className="text-stone-300">›</span>
            <span
              className={[
                "font-semibold",
                activeStage === "runs" ? "text-stone-600" : "text-rose-900",
              ].join(" ")}
            >
              {activeToolLabel}
            </span>
          </div>

          <DiscoveryFlowToolNav />

          <div className="flex flex-wrap items-center gap-2">
            {trailing}
            <IntelligenceContextBadge
              verticalLabel={salonConfig.label}
              dataScope={salonConfig.dataScope}
            />
          </div>
        </div>

        <div className="relative z-[2] shrink-0 self-start pt-0.5">
          <SalonNetworkVizLauncher thumbSize={120} modalWidth={700} modalHeight={800} />
        </div>
      </div>
    </div>
  );
}
