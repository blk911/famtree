"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VmbOperatingDashboard } from "@/components/vmb/dashboard/VmbOperatingDashboard";
import { writeActiveAnalysisId } from "@/lib/vmb/active-analysis";
import { buildDemoOperatingAnalysis } from "@/lib/vmb/operating-system/demo-analysis";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type Props = {
  analysisId?: string;
};

export function VmbDashboardClient({ analysisId }: Props) {
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [invalidAnalysis, setInvalidAnalysis] = useState(false);

  useEffect(() => {
    if (analysisId) writeActiveAnalysisId(analysisId);
  }, [analysisId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setInvalidAnalysis(false);
      try {
        const url = analysisId
          ? `/api/vmb/analyze-book?id=${encodeURIComponent(analysisId)}`
          : "/api/vmb/analyze-book";
        const res = await fetch(url, { cache: "no-store", credentials: "include" });
        const json = (await res.json()) as {
          ok: boolean;
          data?: VmbBookAnalysisResult | null;
        };
        if (!cancelled) {
          if (json.ok && json.data) {
            setAnalysis(json.data);
            setIsDemo(false);
            writeActiveAnalysisId(json.data.analysisId);
          } else if (analysisId) {
            setAnalysis(null);
            setIsDemo(false);
            setInvalidAnalysis(true);
          } else {
            setAnalysis(null);
            setIsDemo(true);
          }
        }
      } catch {
        if (!cancelled) {
          if (analysisId) {
            setAnalysis(null);
            setIsDemo(false);
            setInvalidAnalysis(true);
          } else {
            setAnalysis(null);
            setIsDemo(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: VMB_THEME.muted }}>
        Loading your week…
      </div>
    );
  }

  if (invalidAnalysis) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px", textAlign: "center" }}>
        <p style={{ margin: "0 0 16px", fontSize: 17, color: VMB_THEME.muted }}>
          No active book analysis found. Start with Find The Money.
        </p>
        <Link
          href="/vmb/start"
          style={{
            display: "inline-block",
            padding: "12px 20px",
            borderRadius: 12,
            background: VMB_THEME.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Find The Money
        </Link>
      </div>
    );
  }

  const operatingAnalysis = analysis ?? buildDemoOperatingAnalysis();

  return <VmbOperatingDashboard analysis={operatingAnalysis} isDemo={isDemo} />;
}
