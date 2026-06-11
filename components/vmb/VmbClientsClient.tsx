"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import {
  buildClientOpportunities,
  type ClientOpportunityRow,
  type ClientOpportunitySummary,
} from "@/lib/vmb/client-opportunities";
import { analysisHasOpportunityArrays } from "@/lib/vmb/normalize-analysis";
import { clientBookStatus, clientBookTags } from "@/lib/vmb/presentation/labels";
import {
  buildThisWeekSelection,
  isThisWeekRow,
} from "@/lib/vmb/this-week-selection";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type LoadState = "loading" | "invalid" | "empty" | "ready";

type Props = {
  initialAnalysisId?: string;
  initialView?: string;
};

const PAGE_MAX = 800;

export function VmbClientsClient({ initialAnalysisId, initialView }: Props) {
  const activeAnalysisId = useVmbActiveAnalysis(initialAnalysisId);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [summary, setSummary] = useState<ClientOpportunitySummary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalysis(url: string) {
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      return (await res.json()) as {
        ok: boolean;
        data?: VmbBookAnalysisResult | null;
        error?: string;
      };
    }

    async function load() {
      setLoadState("loading");
      const requestedId = activeAnalysisId?.trim();

      try {
        let json: {
          ok: boolean;
          data?: VmbBookAnalysisResult | null;
          error?: string;
        };

        if (requestedId) {
          json = await fetchAnalysis(
            `/api/vmb/analyze-book?id=${encodeURIComponent(requestedId)}`,
          );
          if (!json.ok || !json.data) {
            json = await fetchAnalysis("/api/vmb/analyze-book");
          }
        } else {
          json = await fetchAnalysis("/api/vmb/analyze-book");
        }

        if (cancelled) return;

        if (!json.ok || !json.data) {
          setAnalysis(null);
          setSummary(null);
          setLoadState(requestedId ? "invalid" : "empty");
          return;
        }

        setAnalysis(json.data);
        const built = buildClientOpportunities(json.data);

        if (built.rows.length > 0 || analysisHasOpportunityArrays(json.data)) {
          setSummary(built);
          setLoadState(built.rows.length > 0 ? "ready" : "empty");
          return;
        }

        setSummary(built);
        setLoadState("empty");
      } catch {
        if (!cancelled) {
          setAnalysis(null);
          setSummary(null);
          setLoadState(requestedId ? "invalid" : "empty");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeAnalysisId]);

  const thisWeekSelection = useMemo(
    () =>
      analysis
        ? buildThisWeekSelection(analysis)
        : { rowIds: new Set<string>(), clientNames: new Set<string>() },
    [analysis],
  );

  const visibleRows = useMemo(() => {
    if (!summary) return [];
    const rows = [...summary.rows].sort((a, b) => b.value - a.value);
    if (initialView === "this-week") {
      return rows.filter((row) => isThisWeekRow(row, thisWeekSelection));
    }
    return rows;
  }, [summary, initialView, thisWeekSelection]);

  if (loadState === "loading") {
    return (
      <div style={{ padding: 48, textAlign: "center", color: VMB_THEME.muted }}>
        Loading client book…
      </div>
    );
  }

  if (loadState === "invalid") {
    return (
      <EmptyState
        message="Start by finding the money in your book."
        ctaLabel="Find The Money"
        ctaHref="/vmb/start"
      />
    );
  }

  if (loadState === "empty" || !summary || summary.rows.length === 0) {
    return (
      <EmptyState
        message="No clients in your book yet."
        ctaLabel="Find The Money"
        ctaHref="/vmb/start"
      />
    );
  }

  return (
    <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "32px 20px 72px" }}>
      <header style={{ marginBottom: 20, paddingBottom: 18, borderBottom: `1px solid ${VMB_THEME.line}` }}>
        <Link
          href={appendVmbAnalysisQuery("/vmb/dashboard", activeAnalysisId)}
          style={{
            display: "inline-block",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 700,
            color: VMB_THEME.accent,
            textDecoration: "none",
          }}
        >
          ← Home
        </Link>
        <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>Client Book</h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: VMB_THEME.muted }}>
          All imported clients and VMB tags. Weekly actions are managed from Home.
        </p>
        {initialView === "this-week" ? (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: VMB_THEME.accent, fontWeight: 600 }}>
            Showing this week&apos;s revenue moves
          </p>
        ) : null}
      </header>

      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.8fr 0.9fr 1fr",
            gap: 8,
            padding: "8px 0 10px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: VMB_THEME.muted,
            borderBottom: `1px solid ${VMB_THEME.line}`,
          }}
        >
          <span>Client</span>
          <span>Status</span>
          <span>Last Visit</span>
          <span>Tags</span>
        </div>

        {visibleRows.map((row) => (
          <ClientBookRow
            key={row.id}
            row={row}
            expanded={expandedId === row.id}
            onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
          />
        ))}
      </div>
    </div>
  );
}

function ClientBookRow({
  row,
  expanded,
  onToggle,
}: {
  row: ClientOpportunityRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tags = clientBookTags(row);
  const status = clientBookStatus(row.triggerType);

  return (
    <div style={{ borderBottom: `1px solid ${VMB_THEME.line}` }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr 0.9fr 1fr",
          gap: 8,
          padding: "14px 0",
          border: "none",
          background: "transparent",
          textAlign: "left",
          cursor: "pointer",
          font: "inherit",
          color: "inherit",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>{row.clientName}</span>
        <span style={{ fontSize: 13, color: VMB_THEME.muted }}>{status}</span>
        <span style={{ fontSize: 13, color: VMB_THEME.muted }}>{row.lastVisit ?? "—"}</span>
        <span style={{ fontSize: 13, color: VMB_THEME.muted }}>{tags.join(" · ")}</span>
      </button>
      {expanded ? (
        <div style={{ padding: "0 0 16px", fontSize: 14, lineHeight: 1.55, color: VMB_THEME.ink }}>
          {row.lastService ? (
            <p style={{ margin: "0 0 8px", color: VMB_THEME.muted }}>Last service: {row.lastService}</p>
          ) : null}
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{row.suggestedMessage}</p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  message,
  ctaLabel,
  ctaHref,
}: {
  message: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "64px 20px 80px", textAlign: "center" }}>
      <p style={{ margin: "0 0 20px", fontSize: 16, color: VMB_THEME.muted }}>{message}</p>
      <Link
        href={ctaHref}
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
        {ctaLabel}
      </Link>
    </div>
  );
}
