"use client";

import { useEffect, useState, useMemo } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import { SalonProspectDrawer } from "@/components/admin/intelligence/salon/SalonProspectDrawer";
import { SalonOperatorSummary } from "@/components/admin/intelligence/salon/SalonOperatorSummary";
import { BookingProviderPill } from "@/components/admin/intelligence/salon/BookingProviderPill";
import { ImportCandidateChip } from "@/components/admin/intelligence/salon/BusinessStackChips";
import {
  QUALIFICATION_STATUS_COLORS,
  QUALIFICATION_STATUS_LABELS,
  RECOMMENDED_ACTION_LABELS,
  type QualifiedOperatorResult,
  type QualificationStatus,
} from "@/lib/intelligence/salon/qualified-operator/types";
import type { QualifiedOperatorListSummary } from "@/lib/intelligence/salon/qualified-operator/list";

type ApiResponse = {
  ok: boolean;
  operators?: QualifiedOperatorResult[];
  summary?: QualifiedOperatorListSummary;
  detail?: string;
};

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e7e5e4",
  background: "#fff",
  color: "#44403c",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 10,
  fontWeight: 700,
  color: "#78716c",
  borderBottom: "1px solid #e7e5e4",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 11,
  color: "#57534e",
  borderBottom: "1px solid #f5f5f4",
  verticalAlign: "top",
};

function scoreColor(n: number): string {
  if (n >= 70) return "#15803d";
  if (n >= 50) return "#1d4ed8";
  if (n >= 35) return "#b45309";
  return "#78716c";
}

export default function QualifiedOperatorsPage() {
  const [operators, setOperators] = useState<QualifiedOperatorResult[]>([]);
  const [summary, setSummary] = useState<QualifiedOperatorListSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState<string>("all");
  const [fProvider, setFProvider] = useState("all");
  const [fCategory, setFCategory] = useState("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (fStatus !== "all") params.set("status", fStatus);
      if (fProvider !== "all") params.set("provider", fProvider);
      if (fCategory !== "all") params.set("category", fCategory);
      const res = await fetch(
        `/api/admin/intelligence/salon/qualified-operators?${params}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as ApiResponse;
      if (json.ok) {
        setOperators(json.operators ?? []);
        setSummary(json.summary ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [fStatus, fProvider, fCategory]);

  const summaryPills = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Campaign ready", value: summary.campaign_ready, color: "#14532d" },
      { label: "Qualified", value: summary.qualified, color: "#1d4ed8" },
      { label: "Needs enrichment", value: summary.needs_enrichment, color: "#b45309" },
      { label: "Prospect only", value: summary.prospect_only, color: "#78716c" },
      { label: "Rejected", value: summary.rejected, color: "#b91c1c" },
    ];
  }, [summary]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const o of operators) {
      if (o.businessCategory) set.add(o.businessCategory);
    }
    return Array.from(set).sort();
  }, [operators]);

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <CreatorIntelligenceNav current="qualified-operators" />
      <IntelligenceFeatureHeader
        title="Qualified Operators"
        description="Salon operator qualification from booking confirmation, business stack, import candidacy, and contact signals."
        config={salonConfig}
      />
      <SalonStorageBadge />

      {summary ? <SalonOperatorSummary pills={summaryPills} /> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={selectStyle}>
          <option value="all">Status: All</option>
          {(Object.keys(QUALIFICATION_STATUS_LABELS) as QualificationStatus[]).map((s) => (
            <option key={s} value={s}>
              {QUALIFICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select value={fProvider} onChange={(e) => setFProvider(e.target.value)} style={selectStyle}>
          <option value="all">Provider: All</option>
          <option value="glossgenius">GlossGenius</option>
          <option value="vagaro">Vagaro</option>
          <option value="square">Square</option>
          <option value="booksy">Booksy</option>
          <option value="fresha">Fresha</option>
          <option value="styleseat">StyleSeat</option>
          <option value="unknown">Unknown</option>
        </select>
        <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} style={selectStyle}>
          <option value="all">Category: All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={load}
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #e7e5e4",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#78716c" }}>Loading…</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e7e5e4", borderRadius: 12, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Handle</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Booking</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Stack</th>
                <th style={thStyle}>Next action</th>
              </tr>
            </thead>
            <tbody>
              {operators.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#a8a29e" }}>
                    No operators match filters.
                  </td>
                </tr>
              ) : (
                operators.map((o) => {
                  const sc = QUALIFICATION_STATUS_COLORS[o.qualificationStatus];
                  return (
                    <tr
                      key={o.prospectId}
                      onClick={() => setDrawerId(o.prospectId)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: "#1c1917" }}>@{o.instagramHandle}</div>
                        <div style={{ fontSize: 10, color: "#a8a29e" }}>{o.displayName}</div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: scoreColor(o.qualifiedOperatorScore) }}>
                        {o.qualifiedOperatorScore}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            background: sc.bg,
                            color: sc.fg,
                            borderRadius: 20,
                            padding: "2px 8px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {QUALIFICATION_STATUS_LABELS[o.qualificationStatus]}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          <BookingProviderPill
                            provider={o.bookingProvider}
                            label={o.bookingProviderLabel}
                            showImportChip={false}
                          />
                          {o.importCandidate ? <ImportCandidateChip /> : null}
                        </div>
                      </td>
                      <td style={tdStyle}>{o.businessCategory ?? "—"}</td>
                      <td style={tdStyle}>{o.stackSignalCount || "—"}</td>
                      <td style={{ ...tdStyle, maxWidth: 200 }}>
                        {RECOMMENDED_ACTION_LABELS[o.recommendedNextAction]}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <SalonProspectDrawer
        prospectId={drawerId}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
      />
    </div>
  );
}
