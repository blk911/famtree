"use client";
// app/(app)/admin/intelligence/transpo/qualified-targets/page.tsx
// Transpo Qualified Targets — the human-approved queue. Joins approved reviews
// (GET /reviews) against scored carriers (GET /opportunities) and lists only
// carriers an operator marked "approved". Click a row for the full detail drawer.

import { useCallback, useEffect, useMemo, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { CarrierOpportunityDrawer } from "@/components/admin/intelligence/transpo/CarrierOpportunityDrawer";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import type { TranspoOpportunityRecord } from "@/lib/intelligence/transpo/opportunity-engine";
import type { TranspoCarrierReview } from "@/lib/intelligence/transpo/verification-types";

function scoreColor(score: number): { fg: string; bg: string; bd: string } {
  if (score >= 60) return { fg: "#166534", bg: "#dcfce7", bd: "#bbf7d0" };
  if (score >= 35) return { fg: "#92400e", bg: "#fef3c7", bd: "#fde68a" };
  return { fg: "#57534e", bg: "#f5f5f4", bd: "#e7e5e4" };
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function TranspoQualifiedTargetsPage() {
  const [opportunities, setOpportunities] = useState<TranspoOpportunityRecord[]>([]);
  const [reviews, setReviews] = useState<TranspoCarrierReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [oppRes, revRes] = await Promise.all([
        fetch("/api/admin/intelligence/transpo/opportunities", { cache: "no-store" }),
        fetch("/api/admin/intelligence/transpo/reviews", { cache: "no-store" }),
      ]);
      const oppData = (await oppRes.json()) as { ok: boolean; opportunities?: TranspoOpportunityRecord[]; error?: string };
      const revData = (await revRes.json()) as { ok: boolean; reviews?: TranspoCarrierReview[] };
      if (oppData.ok && Array.isArray(oppData.opportunities)) {
        setOpportunities(oppData.opportunities);
      } else {
        setError(oppData.error ?? "Failed to load carriers");
      }
      if (revData.ok && Array.isArray(revData.reviews)) {
        setReviews(revData.reviews);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const approved = useMemo(() => {
    const approvedAt = new Map<string, string | undefined>();
    for (const r of reviews) {
      if (r.reviewStatus === "approved") approvedAt.set(r.carrierId, r.approvedAt ?? r.updatedAt);
    }
    return opportunities
      .filter((o) => approvedAt.has(o.id))
      .map((o) => ({ opp: o, approvedAt: approvedAt.get(o.id) }))
      .sort((a, b) => (Date.parse(b.approvedAt ?? "") || 0) - (Date.parse(a.approvedAt ?? "") || 0));
  }, [opportunities, reviews]);

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
      <TranspoIntelligenceNav currentTool="qualified-targets" />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Qualified Targets
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
          Carriers an operator reviewed and marked <strong>approved</strong> in the detail drawer.
          This is the working outreach queue — data → signals → human review → qualified target.
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#78716c" }}>Loading qualified targets…</p>
      ) : error ? (
        <div style={{
          fontSize: 12, color: "#dc2626", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px",
        }}>
          ✗ {error}
        </div>
      ) : approved.length === 0 ? (
        <div style={{
          fontSize: 13, color: "#78716c", background: "#f9f9f8",
          border: "1px solid #ede9e4", borderRadius: 12, padding: "28px 24px", textAlign: "center",
        }}>
          <div style={{ fontWeight: 700, color: "#44403c", marginBottom: 4 }}>
            No qualified targets yet
          </div>
          Open a carrier from <strong>Opportunities</strong> and choose
          <strong> Approve Target</strong> to add it here.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: "#78716c", padding: "10px 14px", borderBottom: "1px solid #f0efed", background: "#fafaf9" }}>
            {approved.length} approved target{approved.length === 1 ? "" : "s"}. Click a row for full detail + review.
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "#78716c", borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                  {["Company", "DOT", "Score", "Recommended Play", "Phone", "Website", "City/State", "Approved At"].map((h) => (
                    <th key={h} style={headerCellStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approved.map(({ opp: o, approvedAt }) => {
                  const sc = scoreColor(o.score);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedCarrierId(o.id)}
                      style={{ borderBottom: "1px solid #f5f5f4", cursor: "pointer" }}
                    >
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600, color: "#3730a3" }}>{o.companyName}</div>
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{o.dotNumber ?? "—"}</td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-block", minWidth: 30, textAlign: "center", fontSize: 12,
                          fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                          color: sc.fg, background: sc.bg, border: `1px solid ${sc.bd}`,
                        }}>
                          {o.score}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, maxWidth: 280 }}>{o.recommendedPlay ?? "—"}</td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{o.phone ?? "—"}</td>
                      <td style={{ ...cellStyle, maxWidth: 200 }}>
                        {o.website ? (
                          <a
                            href={normalizeUrl(o.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "#2563eb", textDecoration: "none", wordBreak: "break-all" }}
                          >
                            {o.website}
                          </a>
                        ) : "—"}
                      </td>
                      <td style={cellStyle}>{[o.city, o.state].filter(Boolean).join(", ") || "—"}</td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(approvedAt)}</td>
                    </tr>
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
        onReviewed={() => void loadAll()}
      />
    </div>
  );
}
