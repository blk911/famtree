"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VmbOperatingDashboard } from "@/components/vmb/dashboard/VmbOperatingDashboard";
import { useVmbActiveAnalysisState } from "@/components/vmb/useVmbActiveAnalysis";
import { fetchVmbAnalysisForSalon } from "@/lib/vmb/resolve-active-analysis-client";
import { isRefreshDue } from "@/lib/vmb/workspace-lifecycle";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

const REFRESH_DISMISS_KEY = "vmb_refresh_dismissed_until";

type Props = {
  analysisId?: string;
};

function EmptyHome({ noSession }: { noSession?: boolean }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 24px 80px", textAlign: "center" }}>
      <p style={{ margin: "0 0 20px", fontSize: 16, lineHeight: 1.5, color: VMB_THEME.muted }}>
        {noSession
          ? "Your salon session expired. Run Find The Money again to restore your workspace."
          : "Start by finding the money in your book."}
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

function RefreshBanner({
  onRefresh,
  onDismiss,
}: {
  onRefresh: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "12px 20px 0",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          border: `1px solid ${VMB_THEME.line}`,
          background: "#fff",
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        <p style={{ margin: "0 0 10px", color: VMB_THEME.ink }}>Time to refresh your book.</p>
        <div style={{ display: "flex", gap: 14 }}>
          <button
            type="button"
            onClick={onRefresh}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              fontSize: 14,
              fontWeight: 700,
              color: VMB_THEME.accent,
              cursor: "pointer",
            }}
          >
            Refresh Now
          </button>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              fontSize: 14,
              fontWeight: 600,
              color: VMB_THEME.muted,
              cursor: "pointer",
            }}
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

function isRefreshDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const until = sessionStorage.getItem(REFRESH_DISMISS_KEY);
    if (!until) return false;
    return Date.now() < Number.parseInt(until, 10);
  } catch {
    return false;
  }
}

function dismissRefreshForSession(): void {
  try {
    const until = String(Date.now() + 24 * 60 * 60 * 1000);
    sessionStorage.setItem(REFRESH_DISMISS_KEY, until);
  } catch {
    // ignore
  }
}

export function VmbDashboardClient({ analysisId }: Props) {
  const resolved = useVmbActiveAnalysisState(analysisId);
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [workspace, setWorkspace] = useState<VmbSalonWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSession, setNoSession] = useState(false);
  const [refreshDismissed, setRefreshDismissed] = useState(isRefreshDismissed);

  useEffect(() => {
    if (resolved.resolving) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNoSession(false);
      try {
        const [analysisOutcome, workspaceRes] = await Promise.all([
          fetchVmbAnalysisForSalon(resolved),
          fetch("/api/vmb/workspace", { cache: "no-store", credentials: "include" }),
        ]);

        const workspaceJson = (await workspaceRes.json()) as {
          ok: boolean;
          data?: VmbSalonWorkspace | null;
          error?: string;
        };

        if (cancelled) return;

        if (workspaceRes.status === 401) {
          setNoSession(true);
          setWorkspace(null);
          setAnalysis(null);
          return;
        }

        if (workspaceJson.ok && workspaceJson.data) {
          setWorkspace(workspaceJson.data);
        } else {
          setWorkspace(null);
        }

        if (analysisOutcome.ok) {
          setAnalysis(analysisOutcome.data);
        } else {
          setAnalysis(null);
        }
      } catch {
        if (!cancelled) {
          setAnalysis(null);
          setWorkspace(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [analysisId, resolved.analysisId, resolved.resolving, resolved.source]);

  if (loading || resolved.resolving) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: VMB_THEME.muted }}>
        Loading your week…
      </div>
    );
  }

  if (!analysis) {
    return <EmptyHome noSession={noSession} />;
  }

  const showRefreshBanner =
    workspace && isRefreshDue(workspace) && !refreshDismissed;

  return (
    <>
      {showRefreshBanner ? (
        <RefreshBanner
          onRefresh={() => {
            window.location.href = "/vmb/start?mode=refresh";
          }}
          onDismiss={() => {
            dismissRefreshForSession();
            setRefreshDismissed(true);
          }}
        />
      ) : null}
      <VmbOperatingDashboard analysis={analysis} />
    </>
  );
}
