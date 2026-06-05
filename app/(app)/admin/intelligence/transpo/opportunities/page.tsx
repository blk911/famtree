"use client";
// app/(app)/admin/intelligence/transpo/opportunities/page.tsx
// Transpo Opportunities — carrier master scored by the Opportunity Signal
// Engine, highest score first. Read-only view of
// GET /api/admin/intelligence/transpo/opportunities.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import {
  CarrierOpportunityDrawer,
  ReviewStatusBadge,
} from "@/components/admin/intelligence/transpo/CarrierOpportunityDrawer";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import type { TranspoOpportunityRecord } from "@/lib/intelligence/transpo/opportunity-engine";
import type { TranspoCarrierReview, TranspoReviewStatus } from "@/lib/intelligence/transpo/verification-types";

type FilterKey = "all" | TranspoReviewStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unreviewed", label: "Unreviewed" },
  { key: "approved", label: "Approved" },
  { key: "needs_verification", label: "Needs Verification" },
  { key: "watchlist", label: "Watchlist" },
  { key: "rejected", label: "Rejected" },
];

// Default view hides rejected unless explicitly selected.
const DEFAULT_VISIBLE: TranspoReviewStatus[] = ["unreviewed", "approved", "needs_verification", "watchlist"];

type SortColumn = "company" | "dot" | "fleet" | "drivers" | "score" | "review" | "play";
type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortColumn; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "dot", label: "DOT" },
  { key: "fleet", label: "Fleet" },
  { key: "drivers", label: "Drivers" },
  { key: "score", label: "Score" },
  { key: "review", label: "Review" },
  { key: "play", label: "Recommended Play" },
];

const REVIEW_SORT_ORDER: Record<TranspoReviewStatus, number> = {
  unreviewed: 0,
  needs_verification: 1,
  watchlist: 2,
  approved: 3,
  rejected: 4,
};

function compareOpportunities(
  a: TranspoOpportunityRecord,
  b: TranspoOpportunityRecord,
  col: SortColumn,
  dir: SortDir,
  reviewOf: (id: string) => TranspoReviewStatus,
): number {
  const sign = dir === "asc" ? 1 : -1;
  let cmp = 0;

  switch (col) {
    case "company":
      cmp = (a.companyName ?? "").localeCompare(b.companyName ?? "", undefined, { sensitivity: "base" });
      break;
    case "dot": {
      const na = Number.parseInt(a.dotNumber ?? "", 10);
      const nb = Number.parseInt(b.dotNumber ?? "", 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) cmp = na - nb;
      else cmp = (a.dotNumber ?? "").localeCompare(b.dotNumber ?? "");
      break;
    }
    case "fleet":
      cmp = compareOptionalNumber(a.fleetSize, b.fleetSize);
      break;
    case "drivers":
      cmp = compareOptionalNumber(a.driverCount, b.driverCount);
      break;
    case "score":
      cmp = a.score - b.score;
      break;
    case "review":
      cmp = REVIEW_SORT_ORDER[reviewOf(a.id)] - REVIEW_SORT_ORDER[reviewOf(b.id)];
      break;
    case "play":
      cmp = (a.recommendedPlay ?? "").localeCompare(b.recommendedPlay ?? "", undefined, { sensitivity: "base" });
      break;
  }

  return cmp * sign;
}

/** Missing numbers sort after present values (ascending base order). */
function compareOptionalNumber(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
}

function scoreColor(score: number): { fg: string; bg: string; bd: string } {
  if (score >= 60) return { fg: "#166534", bg: "#dcfce7", bd: "#bbf7d0" };
  if (score >= 35) return { fg: "#92400e", bg: "#fef3c7", bd: "#fde68a" };
  return { fg: "#57534e", bg: "#f5f5f4", bd: "#e7e5e4" };
}

export default function TranspoOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<TranspoOpportunityRecord[]>([]);
  const [reviews, setReviews] = useState<Map<string, TranspoReviewStatus>>(new Map());
  const [carrierCount, setCarrierCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortColumn>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = useCallback((col: SortColumn) => {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir(col === "score" ? "desc" : "asc");
    }
  }, [sortKey]);

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/intelligence/transpo/reviews", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; reviews?: TranspoCarrierReview[] };
      if (data.ok && Array.isArray(data.reviews)) {
        setReviews(new Map(data.reviews.map((r) => [r.carrierId, r.reviewStatus])));
      }
    } catch {
      // Reviews are non-critical; leave the map empty on failure.
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/intelligence/transpo/opportunities", {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          ok: boolean;
          opportunities?: TranspoOpportunityRecord[];
          carrierCount?: number;
          error?: string;
        };
        if (!active) return;
        if (data.ok && Array.isArray(data.opportunities)) {
          setOpportunities(data.opportunities);
          setCarrierCount(data.carrierCount ?? data.opportunities.length);
        } else {
          setError(data.error ?? "Failed to load opportunities");
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    void loadReviews();
    return () => {
      active = false;
    };
  }, [loadReviews]);

  const statusOf = useCallback(
    (id: string): TranspoReviewStatus => reviews.get(id) ?? "unreviewed",
    [reviews],
  );

  const visible = useMemo(() => {
    return opportunities.filter((o) => {
      const status = statusOf(o.id);
      if (filter === "all") return DEFAULT_VISIBLE.includes(status);
      return status === filter;
    });
  }, [opportunities, statusOf, filter]);

  const sortedVisible = useMemo(() => {
    const list = [...visible];
    list.sort((a, b) => compareOpportunities(a, b, sortKey, sortDir, statusOf));
    return list;
  }, [visible, sortKey, sortDir, statusOf]);

  const headerCellStyle: React.CSSProperties = {
    padding: "9px 12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    textAlign: "left",
  };
  const cellStyle: React.CSSProperties = {
    padding: "9px 12px",
    color: "#1c1917",
    verticalAlign: "top",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="opportunities" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Opportunities
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
          Carrier master scored by buy-signals — active authority, fleet size,
          missing web/social presence, and local market — with a recommended
          sales play. Highest score first.
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#78716c" }}>Scoring carriers…</p>
      ) : error ? (
        <div style={{
          fontSize: 12,
          color: "#dc2626",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 10,
          padding: "12px 16px",
        }}>
          ✗ {error}
        </div>
      ) : opportunities.length === 0 ? (
        <div style={{
          fontSize: 13,
          color: "#78716c",
          background: "#f9f9f8",
          border: "1px solid #ede9e4",
          borderRadius: 12,
          padding: "28px 24px",
          textAlign: "center",
        }}>
          <div style={{ fontWeight: 700, color: "#44403c", marginBottom: 4 }}>
            No opportunities yet
          </div>
          Promote records into the <strong>Carrier Master</strong> first, then
          opportunities are scored automatically.
        </div>
      ) : (
        <div style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 14,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 14px",
            borderBottom: "1px solid #f0efed",
            background: "#fafaf9",
          }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                    border: `1px solid ${filter === f.key ? "#c7d2fe" : "#e7e5e4"}`,
                    background: filter === f.key ? "#eef2ff" : "#fff",
                    color: filter === f.key ? "#3730a3" : "#78716c", cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#78716c" }}>
              Showing {sortedVisible.length} of {opportunities.length} opportunit{opportunities.length === 1 ? "y" : "ies"} from {carrierCount} carrier{carrierCount === 1 ? "" : "s"}
              {filter === "all" ? " · rejected hidden" : ""}. Click a column to sort; click a row for detail + review.
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "#78716c", borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                  {SORT_COLUMNS.map(({ key, label }) => {
                    const active = sortKey === key;
                    return (
                      <th key={key} style={headerCellStyle}>
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          title={`Sort by ${label}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: 0,
                            border: "none",
                            background: "transparent",
                            font: "inherit",
                            fontWeight: 700,
                            color: active ? "#3730a3" : "#78716c",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                          <span style={{ fontSize: 10, opacity: active ? 1 : 0.35 }}>
                            {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedVisible.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...cellStyle, textAlign: "center", color: "#a8a29e", padding: "24px" }}>
                      No opportunities match this filter.
                    </td>
                  </tr>
                ) : null}
                {sortedVisible.map((o) => {
                  const sc = scoreColor(o.score);
                  const open = () => setSelectedCarrierId(o.id);
                  const rowClick = { cursor: "pointer" as const };
                  return (
                    <Fragment key={o.id}>
                      <tr onClick={open} style={rowClick}>
                        <td style={{ ...cellStyle, paddingBottom: 4 }}>
                          <div style={{ fontWeight: 600, color: "#3730a3" }}>{o.companyName}</div>
                          {(o.city || o.state) && (
                            <div style={{ fontSize: 10, color: "#a8a29e" }}>
                              {[o.city, o.state].filter(Boolean).join(", ")}
                            </div>
                          )}
                        </td>
                        <td style={{ ...cellStyle, whiteSpace: "nowrap", paddingBottom: 4 }}>{o.dotNumber ?? "—"}</td>
                        <td style={{ ...cellStyle, paddingBottom: 4 }}>{o.fleetSize ?? "—"}</td>
                        <td style={{ ...cellStyle, paddingBottom: 4 }}>{o.driverCount ?? "—"}</td>
                        <td style={{ ...cellStyle, whiteSpace: "nowrap", paddingBottom: 4 }}>
                          <span style={{
                            display: "inline-block",
                            minWidth: 30,
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 20,
                            color: sc.fg,
                            background: sc.bg,
                            border: `1px solid ${sc.bd}`,
                          }}>
                            {o.score}
                          </span>
                        </td>
                        <td style={{ ...cellStyle, whiteSpace: "nowrap", paddingBottom: 4 }}>
                          <ReviewStatusBadge status={statusOf(o.id)} />
                        </td>
                        <td style={{ ...cellStyle, fontSize: 11, color: "#44403c", maxWidth: 320, paddingBottom: 4 }}>
                          {o.recommendedPlay}
                        </td>
                      </tr>
                      <tr onClick={open} style={{ ...rowClick, borderBottom: "1px solid #f5f5f4" }}>
                        <td colSpan={7} style={{ padding: "0 12px 10px", verticalAlign: "top" }}>
                          <div style={{
                            display: "flex",
                            gap: 4,
                            flexWrap: "nowrap",
                            overflowX: "auto",
                            alignItems: "center",
                            minHeight: 22,
                          }}>
                            {o.signals.length === 0 ? (
                              <span style={{ fontSize: 10, color: "#a8a29e" }}>No signals</span>
                            ) : (
                              o.signals.map((s) => (
                                <span
                                  key={s.id}
                                  title={`weight ${s.weight}`}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 7px",
                                    borderRadius: 20,
                                    color: "#3730a3",
                                    background: "#eef2ff",
                                    border: "1px solid #c7d2fe",
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                  }}
                                >
                                  {s.label}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CarrierOpportunityDrawer
        carrierId={selectedCarrierId}
        open={selectedCarrierId !== null}
        onClose={() => setSelectedCarrierId(null)}
        onReviewed={(id, status) => setReviews((prev) => new Map(prev).set(id, status))}
      />
    </div>
  );
}
