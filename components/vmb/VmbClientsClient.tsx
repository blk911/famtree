"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import { fetchVmbAnalysisForSalon } from "@/lib/vmb/resolve-active-analysis-client";
import { VmbPageEmpty, VmbPageFrame, VmbPageLoading } from "@/components/vmb/VmbPageFrame";
import { useVmbActiveAnalysisState } from "@/components/vmb/useVmbActiveAnalysis";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type LoadState = "loading" | "invalid" | "empty" | "ready";

type Props = {
  initialAnalysisId?: string;
  initialView?: string;
};

export function VmbClientsClient({ initialAnalysisId, initialView }: Props) {
  const resolved = useVmbActiveAnalysisState(initialAnalysisId);
  const activeAnalysisId = resolved.analysisId;
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [summary, setSummary] = useState<ClientOpportunitySummary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (resolved.resolving) return;
    let cancelled = false;

    async function load() {
      setLoadState("loading");

      try {
        const outcome = await fetchVmbAnalysisForSalon(resolved);
        if (cancelled) return;

        if (!outcome.ok) {
          setAnalysis(null);
          setSummary(null);
          setLoadState(outcome.reason === "no_analysis" ? "empty" : "invalid");
          return;
        }

        setAnalysis(outcome.data);
        const built = buildClientOpportunities(outcome.data);

        if (built.rows.length > 0 || analysisHasOpportunityArrays(outcome.data)) {
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
          setLoadState("invalid");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [resolved.analysisId, resolved.resolving, resolved.source]);

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

  if (loadState === "loading" || resolved.resolving) {
    return <VmbPageLoading label="Loading client book…" />;
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
    <VmbPageFrame
      width="wide"
      title="Clients"
      subtitle="All imported clients and VMB tags. Weekly actions are managed from Home."
    >
      <Link
        href={buildVmbSalonHref("/vmb/dashboard", activeAnalysisId)}
        style={{
          display: "inline-block",
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 700,
          color: VMB_THEME.accent,
          textDecoration: "none",
        }}
      >
        ← Home
      </Link>
      {initialView === "this-week" ? (
        <p style={{ margin: "0 0 16px", fontSize: 13, color: VMB_THEME.accent, fontWeight: 600 }}>
          Showing this week&apos;s revenue moves
        </p>
      ) : null}

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
    </VmbPageFrame>
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
    <VmbPageEmpty
      message={message}
      action={
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
      }
    />
  );
}
