"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { IntelligenceContextBadge } from "@/components/admin/IntelligenceContextBadge";
import { TranspoPipelineHeader } from "@/components/admin/intelligence/transpo/TranspoPipelineHeader";
import { TranspoClearRuntimeAction } from "@/components/admin/runtime/TranspoClearRuntimeAction";
import { ServiceDeficitsGroupedNav } from "@/components/admin/intelligence/transpo/ServiceDeficitsGroupedNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import {
  pipelineStageDef,
  pipelineStageForNavItem,
  pipelineStageForPathname,
  TRANSPO_PIPELINE_STAGES,
  type TranspoPipelineStageId,
} from "@/lib/intelligence/transpo/pipeline/transpo-pipeline-config";

type Props = {
  currentTool?: string;
  trailing?: React.ReactNode;
};

function resolveCurrentTool(pathname: string, override?: string): string {
  if (override) return override;
  const sorted = [...transpoConfig.navItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.id ?? "";
}

export function TranspoIntelligenceNav({ currentTool, trailing }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTool = resolveCurrentTool(pathname, currentTool);
  const pathStage = pipelineStageForPathname(pathname);
  const toolStage = pipelineStageForNavItem(activeTool);

  const [selectedStage, setSelectedStage] = useState<TranspoPipelineStageId>(
    toolStage ?? pathStage,
  );

  useEffect(() => {
    if (toolStage) setSelectedStage(toolStage);
    else setSelectedStage(pathStage);
  }, [toolStage, pathStage]);

  const stageNavItems = useMemo(() => {
    const stage = pipelineStageDef(selectedStage);
    const idOrder = stage.navItemIds;
    const byId = new Map(transpoConfig.navItems.map((item) => [item.id, item]));
    return idOrder.map((id) => byId.get(id)).filter((item): item is (typeof transpoConfig.navItems)[number] => !!item);
  }, [selectedStage]);

  function handleStageSelect(stage: TranspoPipelineStageId) {
    setSelectedStage(stage);
    const def = pipelineStageDef(stage);
    const onStageTool = def.navItemIds.includes(activeTool);
    if (!onStageTool) router.push(def.primaryHref);
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <MarketIntelChrome />

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
          <Link href="/admin/intelligence/transpo" style={{ color: "#78716c", textDecoration: "none", fontWeight: 600 }}>
            AIH Studios
          </Link>
          <span style={{ color: "#d6d3d1", fontSize: 10 }}>›</span>
          <span style={{ color: "#44403c", fontWeight: 700 }}>{transpoConfig.label}</span>
          <span style={{ color: "#d6d3d1", fontSize: 10 }}>›</span>
          <span style={{ color: "#4338ca", fontWeight: 700 }}>Pipeline</span>
        </div>

        <TranspoPipelineHeader currentStage={selectedStage} onStageSelect={handleStageSelect} />

        <p style={{ fontSize: 11, color: "#78716c", margin: "0 0 10px", lineHeight: 1.5 }}>
          {pipelineStageDef(selectedStage).description}
          <span style={{ color: "#a8a29e" }}>
            {" "}
            — Need → Payer → Provider → Coverage → Service Deficit
          </span>
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", width: "100%" }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          {selectedStage === "service_deficits" ? (
            <div
              style={{
                background: "#fafaf9",
                border: "1px solid #e7e5e4",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <ServiceDeficitsGroupedNav activeTool={activeTool} />
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                gap: 2,
                flexWrap: "wrap",
                alignItems: "center",
                background: "#f5f4f2",
                border: "1px solid #e7e5e4",
                borderRadius: 10,
                padding: "3px 4px",
              }}
            >
              {stageNavItems.map(({ id, label, href }) => {
                const isActive = id === activeTool;
                return (
                  <Link
                    key={id}
                    href={href}
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "#1c1917" : "#78716c",
                      background: isActive ? "#ffffff" : "transparent",
                      border: isActive ? "1px solid #e2e0dc" : "1px solid transparent",
                      borderRadius: 7,
                      padding: "4px 11px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <TranspoClearRuntimeAction />
          {trailing}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {TRANSPO_PIPELINE_STAGES.filter((s) => s.id !== selectedStage).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleStageSelect(s.id)}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#78716c",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Next: {s.label}
          </button>
        ))}
      </div>

      <IntelligenceContextBadge verticalLabel={transpoConfig.label} dataScope={transpoConfig.dataScope} />
    </div>
  );
}
