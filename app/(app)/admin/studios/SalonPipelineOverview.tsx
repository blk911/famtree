"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { SalonPipelineHeader } from "@/components/admin/intelligence/salon/SalonPipelineHeader";
import { SALON_PIPELINE_STAGES } from "@/lib/intelligence/salon/pipeline/salon-pipeline-config";
import type { SalonPipelineSummary, SalonPipelineStageId } from "@/lib/intelligence/salon/pipeline/pipeline-types";

export function SalonPipelineOverview() {
  const [counts, setCounts] = useState<SalonPipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightStage, setHighlightStage] = useState<SalonPipelineStageId>("discover");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/intelligence/salon/pipeline/summary", {
        cache: "no-store",
      });
      const json = (await res.json()) as { ok: boolean; summary?: SalonPipelineSummary };
      if (json.ok && json.summary) setCounts(json.summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (hash && SALON_PIPELINE_STAGES.some((s) => s.id === hash)) {
      setHighlightStage(hash as SalonPipelineStageId);
    }
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      if (SALON_PIPELINE_STAGES.some((s) => s.id === h)) {
        setHighlightStage(h as SalonPipelineStageId);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [load]);

  return (
    <div style={{ marginBottom: 32 }}>
      <IntelligenceMarketNav />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>
          Pipeline Overview
        </h1>
        <p style={{ fontSize: 14, color: "#57534e", margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Salon intelligence flows in five stages. Pick a stage to see its tools, or jump to a
          primary action below.
        </p>
      </div>

      <SalonPipelineHeader
        currentStage={highlightStage}
        counts={counts}
        countsLoading={loading}
        onStageSelect={setHighlightStage}
      />

      <p style={{ fontSize: 12, color: "#57534e", margin: "16px 0 20px", lineHeight: 1.5 }}>
        Private network visualization lives on{" "}
        <Link href="/admin/studios/source-ingest" style={{ fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
          Source URL
        </Link>
        {" "}
        — click the thumbnail to open the interactive graph.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {SALON_PIPELINE_STAGES.map((stage) => {
          const count = counts?.[stage.id];
          const active = highlightStage === stage.id;
          return (
            <div
              key={stage.id}
              id={stage.id}
              style={{
                background: active ? "#fdf2f8" : "#fff",
                border: active ? "2px solid #9d174d" : "1px solid #e7e5e4",
                borderRadius: 14,
                padding: "18px 18px 16px",
                scrollMarginTop: 80,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#9d174d", marginBottom: 4 }}>
                {stage.order}. {stage.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", marginBottom: 6 }}>
                {loading ? "…" : (count ?? 0).toLocaleString()}
              </div>
              <p style={{ fontSize: 12, color: "#57534e", margin: "0 0 4px", lineHeight: 1.5 }}>
                {stage.description}
              </p>
              <p style={{ fontSize: 11, color: "#a8a29e", margin: "0 0 14px" }}>{stage.purpose}</p>
              <Link
                href={stage.primaryHref}
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  background: "#9d174d",
                  padding: "8px 14px",
                  borderRadius: 8,
                  textDecoration: "none",
                }}
              >
                {stage.primaryActionLabel}
              </Link>
            </div>
          );
        })}
      </div>

      {counts ? (
        <p style={{ fontSize: 11, color: "#a8a29e", marginTop: 16 }}>
          {counts.totalOperators.toLocaleString()} salon operators in store · counts are approximate ·
          updated {new Date(counts.updatedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
