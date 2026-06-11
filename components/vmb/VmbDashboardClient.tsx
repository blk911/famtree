"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VmbOperatingDashboard } from "@/components/vmb/dashboard/VmbOperatingDashboard";
import { writeActiveAnalysisId } from "@/lib/vmb/active-analysis";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type Props = {
  analysisId?: string;
};

function EmptyHome() {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 24px 80px", textAlign: "center" }}>
        <p style={{ margin: "0 0 20px", fontSize: 16, lineHeight: 1.5, color: VMB_THEME.muted }}>
        Start by finding the money in your book.
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

export function VmbDashboardClient({ analysisId }: Props) {
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (analysisId) writeActiveAnalysisId(analysisId);
  }, [analysisId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
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
            writeActiveAnalysisId(json.data.analysisId);
          } else {
            setAnalysis(null);
          }
        }
      } catch {
        if (!cancelled) setAnalysis(null);
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

  if (!analysis) {
    return <EmptyHome />;
  }

  return <VmbOperatingDashboard analysis={analysis} />;
}
