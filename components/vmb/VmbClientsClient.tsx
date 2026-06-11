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
import {
  buildThisWeekSelection,
  isThisWeekRow,
  type ThisWeekSelection,
} from "@/lib/vmb/this-week-selection";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type LoadState = "loading" | "invalid" | "empty" | "ready";

type OpportunityFilter =
  | "all"
  | "this-week"
  | "reactivation"
  | "referral"
  | "gift"
  | "trusted-intro"
  | "vip";

type SortOption = "value-desc" | "value-asc" | "name-asc";

type Props = {
  initialAnalysisId?: string;
  initialView?: string;
};

const FILTER_PILLS: { id: OpportunityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "this-week", label: "This Week" },
  { id: "reactivation", label: "Reactivation" },
  { id: "referral", label: "Referral" },
  { id: "gift", label: "Gift" },
  { id: "trusted-intro", label: "Trusted Intro" },
  { id: "vip", label: "VIP" },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "value-desc", label: "Value (high)" },
  { id: "value-asc", label: "Value (low)" },
  { id: "name-asc", label: "Name (A–Z)" },
];

type DebugSummary = {
  recordCount: number;
  reactivationCount: number;
  referralCount: number;
  giftCount: number;
  trustedIntroCount: number;
  rowCount: number;
};

function matchesFilter(
  row: ClientOpportunityRow,
  filter: OpportunityFilter,
  thisWeek: ThisWeekSelection,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "this-week":
      return isThisWeekRow(row, thisWeek);
    case "reactivation":
      return (
        row.opportunityType === "Reactivation" ||
        row.triggerType === "Lapsed" ||
        row.triggerType === "Reactivation"
      );
    case "referral":
      return row.opportunityType === "Referral";
    case "gift":
      return row.opportunityType === "Gift";
    case "trusted-intro":
      return row.opportunityType === "Trusted Intro";
    case "vip":
      return row.triggerType === "VIP";
    default:
      return true;
  }
}

function sortRows(rows: ClientOpportunityRow[], sort: SortOption): ClientOpportunityRow[] {
  const next = [...rows];
  switch (sort) {
    case "value-asc":
      return next.sort((a, b) => a.value - b.value);
    case "name-asc":
      return next.sort((a, b) => a.clientName.localeCompare(b.clientName));
    case "value-desc":
    default:
      return next.sort((a, b) => b.value - a.value);
  }
}

export function VmbClientsClient({ initialAnalysisId, initialView }: Props) {
  const activeAnalysisId = useVmbActiveAnalysis(initialAnalysisId);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [summary, setSummary] = useState<ClientOpportunitySummary | null>(null);
  const [selectedRow, setSelectedRow] = useState<ClientOpportunityRow | null>(null);
  const [debugSummary, setDebugSummary] = useState<DebugSummary | null>(null);
  const [filter, setFilter] = useState<OpportunityFilter>(
    initialView === "this-week" ? "this-week" : "all",
  );
  const [sort, setSort] = useState<SortOption>("value-desc");

  useEffect(() => {
    if (initialView === "this-week") setFilter("this-week");
  }, [initialView]);

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
      setLoading();
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
          if (requestedId) {
            setLoadState("invalid");
            setAnalysis(null);
            setSummary(null);
            setDebugSummary(null);
          } else {
            setLoadState("empty");
            setAnalysis(null);
            setSummary(null);
            setDebugSummary(null);
          }
          return;
        }

        setAnalysis(json.data);
        const built = buildClientOpportunities(json.data);
        setDebugSummary({
          recordCount: built.clientsAnalyzed,
          reactivationCount: built.reactivationCount,
          referralCount: built.referralCount,
          giftCount: built.giftCount,
          trustedIntroCount: built.trustedIntroCount,
          rowCount: built.rows.length,
        });

        if (built.rows.length > 0 || analysisHasOpportunityArrays(json.data)) {
          setSummary(built);
          setLoadState(built.rows.length > 0 ? "ready" : "empty");
          return;
        }

        setSummary(built);
        setLoadState("empty");
      } catch {
        if (!cancelled) {
          setLoadState(requestedId ? "invalid" : "empty");
          setAnalysis(null);
          setSummary(null);
          setDebugSummary(null);
        }
      }
    }

    function setLoading() {
      setLoadState("loading");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeAnalysisId]);

  const thisWeekSelection = useMemo(
    () => (analysis ? buildThisWeekSelection(analysis) : { rowIds: new Set<string>(), clientNames: new Set<string>() }),
    [analysis],
  );

  const visibleRows = useMemo(() => {
    if (!summary) return [];
    const filtered = summary.rows.filter((row) => matchesFilter(row, filter, thisWeekSelection));
    return sortRows(filtered, sort);
  }, [summary, filter, sort, thisWeekSelection]);

  if (loadState === "loading") {
    return (
      <div style={{ padding: 48, textAlign: "center", color: VMB_THEME.muted }}>
        Loading opportunities…
      </div>
    );
  }

  if (loadState === "invalid") {
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
        {process.env.NODE_ENV === "development" && activeAnalysisId ? (
          <DevDebugPanel analysisId={activeAnalysisId} debug={debugSummary} />
        ) : null}
      </div>
    );
  }

  if (loadState === "empty" || !summary || summary.rows.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px", textAlign: "center" }}>
        <p style={{ margin: "0 0 16px", fontSize: 17, color: VMB_THEME.muted }}>
          Analysis loaded, but no client opportunities were found in this book yet.
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
          Try another export
        </Link>
        {process.env.NODE_ENV === "development" ? (
          <DevDebugPanel analysisId={activeAnalysisId} debug={debugSummary} />
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 72px" }}>
      <header style={{ marginBottom: 24 }}>
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
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: VMB_THEME.accent,
          }}
        >
          Expansion View
        </p>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Client Book
        </h1>
        <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.5, color: VMB_THEME.muted }}>
          All imported clients and VMB tags. Your weekly actions live on{" "}
          <Link
            href={appendVmbAnalysisQuery("/vmb/dashboard", activeAnalysisId)}
            style={{ color: VMB_THEME.accent, fontWeight: 700, textDecoration: "none" }}
          >
            Home
          </Link>
          .
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 20px",
            fontSize: 14,
            color: VMB_THEME.muted,
            marginBottom: 16,
          }}
        >
          <span>
            <strong style={{ color: VMB_THEME.ink }}>{summary.clientsAnalyzed}</strong> Clients Analyzed
          </span>
          <span>
            Recoverable Revenue:{" "}
            <strong style={{ color: VMB_THEME.accent }}>
              ${summary.recoverableRevenue.toLocaleString()}
            </strong>
          </span>
          <span>
            Showing <strong style={{ color: VMB_THEME.ink }}>{visibleRows.length}</strong> of{" "}
            <strong style={{ color: VMB_THEME.ink }}>{summary.rows.length}</strong>
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {FILTER_PILLS.map((pill) => (
            <FilterPill
              key={pill.id}
              label={pill.label}
              active={filter === pill.id}
              onClick={() => setFilter(pill.id)}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: VMB_THEME.muted }}>Sort:</span>
          {SORT_OPTIONS.map((option) => (
            <FilterPill
              key={option.id}
              label={option.label}
              active={sort === option.id}
              onClick={() => setSort(option.id)}
            />
          ))}
        </div>
      </header>

      {process.env.NODE_ENV === "development" ? (
        <DevDebugPanel analysisId={activeAnalysisId} debug={debugSummary} />
      ) : null}

      {visibleRows.length === 0 ? (
        <p
          style={{
            margin: "0 0 24px",
            padding: "16px 18px",
            borderRadius: 12,
            background: "#fff",
            border: `1px solid ${VMB_THEME.line}`,
            fontSize: 14,
            color: VMB_THEME.muted,
          }}
        >
          No opportunities match this filter.{" "}
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              border: "none",
              background: "none",
              padding: 0,
              color: VMB_THEME.accent,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Show all
          </button>
        </p>
      ) : null}

      <div
        style={{
          background: "#fff",
          border: `1px solid ${VMB_THEME.line}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: VMB_THEME.warmBg, borderBottom: `1px solid ${VMB_THEME.line}` }}>
              {["CLIENT", "TRIGGER", "ACTION", "VALUE"].map((col) => (
                <th
                  key={col}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: VMB_THEME.muted,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelectedRow(row)}
                style={{
                  borderBottom: `1px solid ${VMB_THEME.line}`,
                  cursor: "pointer",
                  background: selectedRow?.id === row.id ? VMB_THEME.accentSoft : "#fff",
                }}
              >
                <td style={{ padding: "9px 14px", fontWeight: 700, color: VMB_THEME.ink }}>
                  <div>{row.clientName}</div>
                  {row.secondaryBadges?.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                      {row.secondaryBadges.map((badge) => (
                        <span
                          key={`${row.id}-${badge}`}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: VMB_THEME.accent,
                            background: VMB_THEME.accentSoft,
                            borderRadius: 6,
                            padding: "2px 6px",
                          }}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td style={{ padding: "9px 14px", color: VMB_THEME.muted }}>{row.trigger}</td>
                <td style={{ padding: "9px 14px", fontWeight: 600, color: VMB_THEME.ink }}>
                  {row.action}
                </td>
                <td
                  style={{
                    padding: "9px 14px",
                    fontWeight: 800,
                    color: VMB_THEME.accent,
                    whiteSpace: "nowrap",
                  }}
                >
                  ${row.value.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow ? (
        <OpportunityDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />
      ) : null}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? VMB_THEME.accent : VMB_THEME.line}`,
        background: active ? VMB_THEME.accentSoft : "#fff",
        color: active ? VMB_THEME.accent : VMB_THEME.muted,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function DevDebugPanel({
  analysisId,
  debug,
}: {
  analysisId?: string;
  debug: DebugSummary | null;
}) {
  if (!debug && !analysisId) return null;
  return (
    <pre
      style={{
        margin: "16px 0 0",
        padding: "12px 14px",
        borderRadius: 10,
        background: "#fff",
        border: `1px dashed ${VMB_THEME.line}`,
        fontSize: 11,
        color: VMB_THEME.muted,
        textAlign: "left",
        overflowX: "auto",
      }}
    >
      {JSON.stringify({ analysisId: analysisId ?? null, ...debug }, null, 2)}
    </pre>
  );
}

function OpportunityDrawer({
  row,
  onClose,
}: {
  row: ClientOpportunityRow;
  onClose: () => void;
}) {
  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(28, 25, 23, 0.35)",
          zIndex: 50,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(420px, 100vw)",
          background: "#fff",
          borderLeft: `1px solid ${VMB_THEME.line}`,
          boxShadow: "-8px 0 32px rgba(28, 25, 23, 0.12)",
          zIndex: 51,
          padding: "24px 22px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{row.clientName}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "none",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              color: VMB_THEME.muted,
            }}
          >
            ×
          </button>
        </div>

        <dl style={{ margin: "0 0 24px", display: "grid", gap: 12, fontSize: 14 }}>
          <DetailItem label="Last Visit" value={row.lastVisit ?? "—"} />
          <DetailItem label="Last Service" value={row.lastService ?? "—"} />
          <DetailItem
            label="Lifetime Spend"
            value={row.lifetimeSpend ? `$${row.lifetimeSpend.toLocaleString()}` : "—"}
          />
          <DetailItem
            label="Potential Revenue"
            value={`$${row.potentialRevenue.toLocaleString()}`}
            accent
          />
          <DetailItem label="Opportunity Type" value={row.opportunityType} />
          <DetailItem label="Confidence" value={row.confidence} />
          <DetailItem label="Suggested Campaign" value={row.suggestedCampaign} />
        </dl>

        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: VMB_THEME.muted,
          }}
        >
          Suggested Message
        </p>
        <p
          style={{
            margin: 0,
            padding: "16px 14px",
            borderRadius: 12,
            background: VMB_THEME.warmBg,
            border: `1px solid ${VMB_THEME.line}`,
            fontSize: 15,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            color: VMB_THEME.ink,
          }}
        >
          {row.suggestedMessage}
        </p>
      </aside>
    </>
  );
}

function DetailItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt style={{ margin: 0, fontSize: 11, fontWeight: 700, color: VMB_THEME.muted }}>{label}</dt>
      <dd
        style={{
          margin: "4px 0 0",
          fontWeight: accent ? 800 : 600,
          color: accent ? VMB_THEME.accent : VMB_THEME.ink,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
