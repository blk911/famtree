"use client";

import { useEffect, useState } from "react";
import { isRefreshDue } from "@/lib/vmb/workspace-lifecycle";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";

type SummaryRow = {
  label: string;
  value: string;
};

export function VmbSummaryRail() {
  const activeAnalysisId = useVmbActiveAnalysis();
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [workspace, setWorkspace] = useState<VmbSalonWorkspace | null>(null);
  const [inviteReady, setInviteReady] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const analysisUrl = activeAnalysisId
          ? `/api/vmb/analyze-book?id=${encodeURIComponent(activeAnalysisId)}`
          : "/api/vmb/analyze-book";
        const [analysisRes, workspaceRes] = await Promise.all([
          fetch(analysisUrl, { cache: "no-store", credentials: "include" }),
          fetch("/api/vmb/workspace", { cache: "no-store", credentials: "include" }),
        ]);
        const analysisJson = (await analysisRes.json()) as {
          ok: boolean;
          data?: VmbBookAnalysisResult | null;
        };
        const workspaceJson = (await workspaceRes.json()) as {
          ok: boolean;
          data?: VmbSalonWorkspace | null;
        };
        if (cancelled) return;
        setAnalysis(analysisJson.ok && analysisJson.data ? analysisJson.data : null);
        setWorkspace(workspaceJson.ok && workspaceJson.data ? workspaceJson.data : null);

        const analysisId = analysisJson.data?.analysisId ?? activeAnalysisId;
        if (analysisId) {
          const draftRes = await fetch(
            `/api/vmb/invite-drafts?analysisId=${encodeURIComponent(analysisId)}`,
            { cache: "no-store", credentials: "include" },
          );
          const draftJson = (await draftRes.json()) as {
            ok: boolean;
            data?: Array<{ status: string }>;
          };
          if (!cancelled && draftJson.ok && draftJson.data) {
            setInviteReady(draftJson.data.filter((d) => d.status === "draft").length);
          }
        }
      } catch {
        if (!cancelled) {
          setAnalysis(null);
          setWorkspace(null);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeAnalysisId]);

  const rows: SummaryRow[] = [];
  if (analysis) {
    rows.push({
      label: "Clients analyzed",
      value: String(analysis.recordCount ?? "—"),
    });
    if (inviteReady !== null) {
      rows.push({ label: "Invites ready", value: String(inviteReady) });
    }
    const revenue =
      analysis.estimatedRecoverableRevenue ??
      analysis.reactivationTargets.reduce((s, t) => s + (t.estimatedValue ?? 0), 0);
    if (revenue > 0) {
      rows.push({
        label: "Revenue potential",
        value: `$${revenue.toLocaleString()}`,
      });
    }
  }
  if (workspace) {
    rows.push({
      label: "Refresh due",
      value: isRefreshDue(workspace) ? "Yes" : "No",
    });
  }

  if (rows.length === 0) return null;

  return (
    <aside className="vmb-salon-summary" aria-label="This month summary">
      <p
        style={{
          margin: "0 0 14px",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: VMB_THEME.muted,
        }}
      >
        This Month
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((row) => (
          <div key={row.label}>
            <p style={{ margin: "0 0 2px", fontSize: 12, color: VMB_THEME.muted }}>{row.label}</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: VMB_THEME.ink }}>{row.value}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
