"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildClientOpportunities,
  type ClientOpportunityRow,
  type ClientOpportunitySummary,
} from "@/lib/vmb/client-opportunities";
import { importedClientCount, resolveBookLoadedState } from "@/lib/vmb/book-status";
import { clientBookStatus, clientBookTags } from "@/lib/vmb/presentation/labels";
import {
  buildThisWeekSelection,
  isThisWeekRow,
} from "@/lib/vmb/this-week-selection";
import { VMB_BOOK_LOAD_LABEL, VMB_BOOK_LOAD_ROUTE } from "@/lib/vmb/book-load-cta";
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import { fetchVmbAnalysisForSalon } from "@/lib/vmb/resolve-active-analysis-client";
import { logTodayLockBranch } from "@/lib/vmb/today-lock-debug";
import { VmbPageEmpty, VmbPageFrame, VmbPageLoading } from "@/components/vmb/VmbPageFrame";
import { SortableListHeader } from "@/components/vmb/SortableListHeader";
import { useVmbActiveAnalysisState } from "@/components/vmb/useVmbActiveAnalysis";
import { useSortableList } from "@/lib/vmb/useSortableList";
import { clientOperatingScores } from "@/lib/vmb/client-operating-scores";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { CodaSummary } from "@/lib/taikos/coda/types";
import type { AiosClientSummary } from "@/lib/taikos/types";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type LoadState = "loading" | "not_loaded" | "unresolved" | "imported_summary" | "ready";

type SalonContextSlice = {
  hasRealBookData: boolean;
  clientSummary: AiosClientSummary;
  codaSummary?: CodaSummary;
  analysisId?: string;
};

type Props = {
  initialAnalysisId?: string;
  initialView?: string;
};

function bookLoadedFrom(
  ctx: SalonContextSlice | null,
  analysis: VmbBookAnalysisResult | null,
  rows: ClientOpportunityRow[],
): boolean {
  return resolveBookLoadedState({
    hasRealBookData: ctx?.hasRealBookData,
    clientSummary: ctx?.clientSummary,
    codaSummary: ctx?.codaSummary,
    analysisId: ctx?.analysisId ?? analysis?.analysisId,
    recordCount: analysis?.recordCount,
    clients: rows,
  });
}

function knownImportCount(
  ctx: SalonContextSlice | null,
  analysis: VmbBookAnalysisResult | null,
  summary: ClientOpportunitySummary | null,
): number {
  return importedClientCount({
    clientSummary: ctx?.clientSummary,
    codaSummary: ctx?.codaSummary,
    recordCount: analysis?.recordCount ?? summary?.clientsAnalyzed,
    clients: summary?.rows,
  });
}

export function VmbClientsClient({ initialAnalysisId, initialView }: Props) {
  const resolved = useVmbActiveAnalysisState(initialAnalysisId);
  const activeAnalysisId = resolved.analysisId;
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [salonContext, setSalonContext] = useState<SalonContextSlice | null>(null);
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [summary, setSummary] = useState<ClientOpportunitySummary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (resolved.resolving) return;
    setLoadState("loading");

    let ctxSlice: SalonContextSlice | null = null;

    try {
      const [ctxRes, analysisOutcome] = await Promise.all([
        fetch("/api/taikos/context?pathname=/vmb/clients&recordLogin=0", {
          cache: "no-store",
          credentials: "include",
        }),
        fetchVmbAnalysisForSalon(resolved),
      ]);

      if (ctxRes.ok) {
        const ctxJson = (await ctxRes.json()) as {
          ok: boolean;
          data?: SalonContextSlice;
        };
        if (ctxJson.ok && ctxJson.data) {
          ctxSlice = ctxJson.data;
        }
      }

      setSalonContext(ctxSlice);

      if (!analysisOutcome.ok) {
        setAnalysis(null);
        setSummary(null);
        setLoadState(bookLoadedFrom(ctxSlice, null, []) ? "unresolved" : "not_loaded");
        return;
      }

      const analysisData = analysisOutcome.data;
      const built = buildClientOpportunities(analysisData);
      setAnalysis(analysisData);
      setSummary(built);

      if (!bookLoadedFrom(ctxSlice, analysisData, built.rows)) {
        setLoadState("not_loaded");
        return;
      }

      setLoadState(built.rows.length > 0 ? "ready" : "imported_summary");
    } catch {
      setAnalysis(null);
      setSummary(null);
      setLoadState(bookLoadedFrom(ctxSlice, null, []) ? "unresolved" : "not_loaded");
    }
  }, [resolved.analysisId, resolved.resolving, resolved.source]);

  useEffect(() => {
    void load();
  }, [load]);

  const thisWeekSelection = useMemo(
    () =>
      analysis
        ? buildThisWeekSelection(analysis)
        : { rowIds: new Set<string>(), clientNames: new Set<string>() },
    [analysis],
  );

  const baseRows = useMemo(() => {
    if (!summary) return [];
    const rows = [...summary.rows];
    if (initialView === "this-week") {
      return rows.filter((row) => isThisWeekRow(row, thisWeekSelection));
    }
    return rows;
  }, [summary, initialView, thisWeekSelection]);

  const clientAccessors = useMemo(
    () => ({
      clientName: (row: ClientOpportunityRow) => row.clientName,
      status: (row: ClientOpportunityRow) => clientBookStatus(row.triggerType),
      lastVisit: (row: ClientOpportunityRow) => row.lastVisit ?? "",
      tags: (row: ClientOpportunityRow) => clientBookTags(row).join(" · "),
    }),
    [],
  );

  const { sortedItems: visibleRows, sortKey, sortDirection, setSort } = useSortableList(baseRows, {
    defaultKey: "clientName",
    defaultDirection: "asc",
    accessors: clientAccessors,
  });

  const importCount = knownImportCount(salonContext, analysis, summary);

  if (loadState === "loading" || resolved.resolving) {
    return <VmbPageLoading label="Loading client book…" />;
  }

  if (loadState === "unresolved") {
    return (
      <UnresolvedState
        onRetry={() => void load()}
        importCount={importCount > 0 ? importCount : undefined}
      />
    );
  }

  if (loadState === "not_loaded") {
    return (
      <EmptyState
        message="Load your client book to unlock client insights."
        ctaLabel={VMB_BOOK_LOAD_LABEL}
        ctaHref={VMB_BOOK_LOAD_ROUTE}
      />
    );
  }

  if (loadState === "imported_summary") {
    return (
      <VmbPageFrame
        width="wide"
        title="Clients"
        subtitle="Your book is loaded — relationship signals are building."
      >
        <ImportedSummary
          count={importCount}
          activeAnalysisId={activeAnalysisId}
          onRetry={() => void load()}
        />
      </VmbPageFrame>
    );
  }

  if (!summary || visibleRows.length === 0) {
    return (
      <VmbPageFrame
        width="wide"
        title="Clients"
        subtitle="Client book with relationship signals and suggested actions."
      >
        <ImportedSummary
          count={importCount}
          activeAnalysisId={activeAnalysisId}
          onRetry={() => void load()}
          emptyView={initialView === "this-week"}
        />
      </VmbPageFrame>
    );
  }

  return (
    <VmbPageFrame
      width="wide"
      title="Clients"
      subtitle="Client book with relationship signals and suggested actions."
    >
      <Link
        href={buildVmbSalonHref("/vmb/today", activeAnalysisId)}
        style={{
          display: "inline-block",
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 700,
          color: VMB_THEME.accent,
          textDecoration: "none",
        }}
      >
        ← Today
      </Link>
      {initialView === "this-week" ? (
        <p style={{ margin: "0 0 16px", fontSize: 13, color: VMB_THEME.accent, fontWeight: 600 }}>
          Showing this week&apos;s revenue moves
        </p>
      ) : null}

      <div>
        <SortableListHeader<"clientName" | "status" | "lastVisit" | "tags">
          columns={[
            { key: "clientName", label: "Client" },
            { key: "status", label: "Status" },
            { key: "lastVisit", label: "Last Visit" },
            { key: "tags", label: "Tags" },
          ]}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={setSort}
          gridTemplateColumns="1.4fr 0.8fr 0.9fr 1fr"
        />

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

function ImportedSummary({
  count,
  activeAnalysisId,
  onRetry,
  emptyView,
}: {
  count: number;
  activeAnalysisId?: string;
  onRetry: () => void;
  emptyView?: boolean;
}) {
  const label = count > 0 ? `${count} client${count === 1 ? "" : "s"} imported` : "Book loaded";
  return (
    <div style={{ padding: "8px 0" }}>
      <p style={{ margin: "0 0 12px", fontSize: 15, color: VMB_THEME.ink, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: VMB_THEME.muted, lineHeight: 1.5 }}>
        {emptyView
          ? "No clients match this week's filter yet. Your full book is on file."
          : "Relationship signals will appear here as tAIkOS ranks moves from your book."}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link
          href={buildVmbSalonHref("/vmb/today", activeAnalysisId)}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: VMB_THEME.accent,
            textDecoration: "none",
          }}
        >
          Go to Today
        </Link>
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: 0,
            border: "none",
            background: "none",
            fontSize: 14,
            fontWeight: 600,
            color: VMB_THEME.muted,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Reload book status
        </button>
      </div>
    </div>
  );
}

function UnresolvedState({
  onRetry,
  importCount,
}: {
  onRetry: () => void;
  importCount?: number;
}) {
  return (
    <VmbPageEmpty
      message={
        importCount
          ? `${importCount} clients are on file, but the client list could not be resolved. Reload book status.`
          : "Data state could not be resolved. Reload book status."
      }
      action={
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: "inline-block",
            padding: "12px 20px",
            borderRadius: 12,
            background: VMB_THEME.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          Reload book status
        </button>
      }
    />
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
  const scores = clientOperatingScores(row.clientName);

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
        <div
          className="vmb-client-operating-detail"
          style={{ padding: "0 0 16px", fontSize: 14, lineHeight: 1.55, color: VMB_THEME.ink }}
        >
          <div className="vmb-client-scores">
            <span>Relationship {scores.relationshipScore}</span>
            <span>Referral {scores.referralScore}</span>
            <span>Retention {scores.retentionScore}</span>
            <span>LTV ${scores.lifetimeValue.toLocaleString()}</span>
            <span>PCN {scores.pcnStatus}</span>
          </div>
          {row.lastService ? (
            <p style={{ margin: "0 0 8px", color: VMB_THEME.muted }}>Last service: {row.lastService}</p>
          ) : null}
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Suggested action</p>
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
  useEffect(() => {
    logTodayLockBranch({
      file: "components/vmb/VmbClientsClient.tsx",
      component: "EmptyState",
      message,
      dataLoaded: false,
    });
  }, [message]);

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
