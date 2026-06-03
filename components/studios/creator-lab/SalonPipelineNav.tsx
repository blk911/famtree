"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceContextBadge } from "@/components/admin/IntelligenceContextBadge";
import { SalonPipelineHeader } from "@/components/admin/intelligence/salon/SalonPipelineHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import {
  pipelineStageDef,
  pipelineStageForNavItem,
  pipelineStageForPathname,
  SALON_PIPELINE_STAGES,
} from "@/lib/intelligence/salon/pipeline/salon-pipeline-config";
import type { SalonPipelineSummary, SalonPipelineStageId } from "@/lib/intelligence/salon/pipeline/pipeline-types";

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
  const router = useRouter();
  const activeTool = resolveCurrentTool(pathname, currentTool);
  const pathStage = pipelineStageForPathname(pathname);
  const toolStage = pipelineStageForNavItem(activeTool);

  const [selectedStage, setSelectedStage] = useState<SalonPipelineStageId>(
    toolStage ?? pathStage,
  );
  const [counts, setCounts] = useState<SalonPipelineSummary | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    if (toolStage) setSelectedStage(toolStage);
    else setSelectedStage(pathStage);
  }, [toolStage, pathStage]);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const res = await fetch("/api/admin/intelligence/salon/pipeline/summary", {
        cache: "no-store",
      });
      const json = (await res.json()) as { ok: boolean; summary?: SalonPipelineSummary };
      if (json.ok && json.summary) setCounts(json.summary);
    } catch {
      setCounts(null);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
    const onRefresh = () => loadCounts();
    window.addEventListener("salon-prospects:refresh", onRefresh);
    return () => window.removeEventListener("salon-prospects:refresh", onRefresh);
  }, [loadCounts]);

  const stageNavItems = useMemo(() => {
    const stage = pipelineStageDef(selectedStage);
    const ids = new Set(stage.navItemIds);
    return salonConfig.navItems.filter((item) => ids.has(item.id));
  }, [selectedStage]);

  function handleStageSelect(stage: SalonPipelineStageId) {
    setSelectedStage(stage);
    const def = pipelineStageDef(stage);
    const onStageTool = def.navItemIds.includes(activeTool);
    if (!onStageTool) {
      router.push(def.primaryHref);
    }
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <IntelligenceMarketNav />

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 11,
            color: "#a8a29e",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Link href="/admin/studios" style={{ color: "#78716c", textDecoration: "none", fontWeight: 600 }}>
            AIH Studios
          </Link>
          <span style={{ color: "#d6d3d1", fontSize: 10 }}>›</span>
          <span style={{ color: "#44403c", fontWeight: 700 }}>{salonConfig.label}</span>
          <span style={{ color: "#d6d3d1", fontSize: 10 }}>›</span>
          <Link
            href="/admin/studios"
            style={{ color: "#9d174d", textDecoration: "none", fontWeight: 700 }}
          >
            Pipeline
          </Link>
        </div>

        <SalonPipelineHeader
          currentStage={selectedStage}
          counts={counts}
          countsLoading={countsLoading}
          onStageSelect={handleStageSelect}
        />

        <p style={{ fontSize: 11, color: "#78716c", margin: "0 0 10px", lineHeight: 1.5 }}>
          {pipelineStageDef(selectedStage).purpose}
          <span style={{ color: "#a8a29e" }}>
            {" "}
            — Discover → Enrich → Verify → Qualify → Operate
          </span>
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                  lineHeight: "1.5",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
        {trailing}
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {SALON_PIPELINE_STAGES.filter((s) => s.id !== selectedStage).map((s) => (
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
        <Link
          href="/admin/studios"
          style={{ fontSize: 10, fontWeight: 700, color: "#9d174d", textDecoration: "none", marginLeft: "auto" }}
        >
          Pipeline overview →
        </Link>
      </div>

      <IntelligenceContextBadge
        verticalLabel={salonConfig.label}
        dataScope={salonConfig.dataScope}
      />
    </div>
  );
}
