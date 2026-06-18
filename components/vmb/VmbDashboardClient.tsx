"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadYourBookCta } from "@/components/vmb/LoadYourBookCta";
import { BookLoadedStatusNote } from "@/components/vmb/BookLoadedStatusNote";
import { VmbOperatingDashboard } from "@/components/vmb/dashboard/VmbOperatingDashboard";
import { VmbPageEmpty, VmbPageFrame, VmbPageLoading } from "@/components/vmb/VmbPageFrame";
import { useVmbActiveAnalysisState } from "@/components/vmb/useVmbActiveAnalysis";
import { fetchVmbAnalysisForSalon } from "@/lib/vmb/resolve-active-analysis-client";
import { logTodayLockBranch } from "@/lib/vmb/today-lock-debug";
import { isRefreshDue } from "@/lib/vmb/workspace-lifecycle";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

const REFRESH_DISMISS_KEY = "vmb_refresh_dismissed_until";

type Props = {
  analysisId?: string;
};

function EmptyHome({ noSession }: { noSession?: boolean }) {
  const message = noSession
    ? "Your salon session expired. Load your book again to restore your workspace."
    : "Start by loading your client book.";

  useEffect(() => {
    logTodayLockBranch({
      file: "components/vmb/VmbDashboardClient.tsx",
      component: "EmptyHome",
      message,
      dataLoaded: false,
      lockReason: noSession ? "NO_TRIAL_SESSION" : "NO_ANALYSIS",
    });
  }, [message, noSession]);

  return (
    <VmbPageEmpty
      message={message}
      action={<LoadYourBookCta />}
    />
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
    <VmbPageFrame width="feed">
      <div
        style={{
          marginBottom: 16,
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
    </VmbPageFrame>
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
    return <VmbPageLoading label="Loading your week…" />;
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
      <BookLoadedStatusNote
        loadedAt={analysis.generatedAt}
        clientCount={analysis.recordCount}
      />
      <VmbOperatingDashboard analysis={analysis} />
    </>
  );
}
