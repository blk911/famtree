"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { CountyOpportunityDrawer } from "@/components/admin/intelligence/transpo/CountyOpportunityDrawer";
import { PromoteToActionQueueButton } from "@/components/admin/intelligence/transpo/PromoteToActionQueueButton";
import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory } from "@/lib/intelligence/transpo/market-gaps/types";
import {
  OPPORTUNITY_TYPE_LABELS,
  TIME_HORIZON_LABELS,
  type TranspoOpportunityType,
  type TranspoTimeHorizon,
} from "@/lib/intelligence/transpo/network-formation/network-formation-types";
import type {
  CountyOpportunityDossier,
  CountyOpportunityQuestion,
  CountyOpportunitySummary,
} from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-types";

const BAND_STYLE: Record<string, { fg: string; bg: string }> = {
  immediate: { fg: "#991b1b", bg: "#fef2f2" },
  priority: { fg: "#9a3412", bg: "#ffedd5" },
  investigate: { fg: "#92400e", bg: "#fef3c7" },
  watch: { fg: "#57534e", bg: "#f5f5f4" },
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 800,
  color: "#a8a29e",
  borderBottom: "1px solid #f0ede8",
  background: "#fafaf9",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#57534e",
  borderBottom: "1px solid #f5f4f2",
  verticalAlign: "top",
};

const sel: React.CSSProperties = { fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff" };

export default function TranspoOpportunityRadarPage() {
  const [summary, setSummary] = useState<CountyOpportunitySummary | null>(null);
  const [dossiers, setDossiers] = useState<CountyOpportunityDossier[]>([]);
  const [topImmediate, setTopImmediate] = useState<CountyOpportunityDossier[]>([]);
  const [questions, setQuestions] = useState<CountyOpportunityQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CountyOpportunityDossier | null>(null);
  const [typeFilter, setTypeFilter] = useState<TranspoOpportunityType | "">("");
  const [horizonFilter, setHorizonFilter] = useState<TranspoTimeHorizon | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/opportunity-radar", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setSummary(data.summary ?? null);
      setDossiers(data.dossiers ?? []);
      setTopImmediate(data.topImmediate ?? data.summary?.topImmediate ?? []);
      setQuestions(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => dossiers.filter((d) => {
    if (typeFilter && d.opportunityType !== typeFilter) return false;
    if (horizonFilter && d.timeHorizon !== horizonFilter) return false;
    return true;
  }), [dossiers, typeFilter, horizonFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.actionabilityScore - a.actionabilityScore),
    [filtered],
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="opportunity-radar" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Opportunity Radar</h1>
          <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 720, lineHeight: 1.55 }}>
            Ranked county/service opportunities — gap, confidence, actionability, and near-term network formation plays.
          </p>
        </div>
        <Link href="/admin/intelligence/transpo/network-plays" style={{ fontSize: 12, fontWeight: 700, color: "#4338ca", alignSelf: "flex-start" }}>
          Network Plays →
        </Link>
      </div>

      {error ? <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[["Dossiers", summary?.totalDossiers ?? "…"], ["Immediate", summary?.immediateOpportunities ?? "…"], ["Next Week", summary?.nextWeekPlays ?? "…"], ["Network Formation", summary?.networkFormationPlays ?? "…"], ["College Network", summary?.collegeNetworkPlays ?? "…"], ["Zero Provider", summary?.zeroProviderRows ?? "…"]].map(([l, v]) => (
          <div key={l} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e" }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      {topImmediate.length > 0 ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#991b1b", marginBottom: 8 }}>TOP 10 IMMEDIATE OPPORTUNITIES</div>
          <div style={{ display: "grid", gap: 6 }}>
            {topImmediate.slice(0, 10).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelected(d)}
                style={{ textAlign: "left", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "#7f1d1d", padding: 0 }}
              >
                <strong>{d.county}, {d.state}</strong> — {SERVICE_CATEGORY_LABELS[d.serviceCategory as TranspoServiceCategory] ?? d.serviceCategory}
                {d.opportunityType ? ` · ${OPPORTUNITY_TYPE_LABELS[d.opportunityType]}` : ""} · {d.firstMove ?? d.recommendedPlay}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TranspoOpportunityType | "")} style={sel}>
          <option value="">All opportunity types</option>
          {(Object.keys(OPPORTUNITY_TYPE_LABELS) as TranspoOpportunityType[]).map((t) => (
            <option key={t} value={t}>{OPPORTUNITY_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={horizonFilter} onChange={(e) => setHorizonFilter(e.target.value as TranspoTimeHorizon | "")} style={sel}>
          <option value="">All time horizons</option>
          {(Object.keys(TIME_HORIZON_LABELS) as TranspoTimeHorizon[]).map((h) => (
            <option key={h} value={h}>{TIME_HORIZON_LABELS[h]}</option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "#a8a29e" }}>{sorted.length} shown</span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1280 }}>
          <thead>
            <tr>
              {["County", "Service", "Type", "Horizon", "Gap", "Confidence", "Actionability", "Near-Term Play", "First Move", "Queue"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
              : sorted.length === 0 ? <tr><td colSpan={10} style={{ ...td, textAlign: "center" }}>No opportunities — run provider dossier backfill after service deficits.</td></tr>
              : sorted.map((d) => {
                const band = BAND_STYLE[d.actionabilityBand] ?? BAND_STYLE.watch;
                const svc = d.serviceCategory as TranspoServiceCategory;
                return (
                  <tr key={d.id} onClick={() => setSelected(d)} style={{ cursor: "pointer", background: d.actionabilityBand === "immediate" ? "#fffbfb" : undefined }}>
                    <td style={{ ...td, fontWeight: 700, color: "#1c1917" }}>
                      <Link
                        href={`/admin/intelligence/transpo/county-opportunities?county=${encodeURIComponent(d.county)}&state=${d.state}&service=${d.serviceCategory}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#4338ca", textDecoration: "none" }}
                      >
                        {d.county}, {d.state}
                      </Link>
                    </td>
                    <td style={td}>{SERVICE_CATEGORY_LABELS[svc] ?? d.serviceCategory}</td>
                    <td style={td}>{d.opportunityType ? OPPORTUNITY_TYPE_LABELS[d.opportunityType] : "—"}</td>
                    <td style={td}>
                      {d.timeHorizon ? (
                        <span>
                          {TIME_HORIZON_LABELS[d.timeHorizon]}
                          {d.timeHorizon === "next_week" ? (
                            <span style={{ display: "block", marginTop: 4, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 20, color: "#991b1b", background: "#fecaca", width: "fit-content" }}>Next Week</span>
                          ) : null}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ ...td, fontWeight: 800 }}>{d.deficitScore}</td>
                    <td style={td}>{d.confidenceScore}</td>
                    <td style={td}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: band.fg, background: band.bg }}>
                        {d.actionabilityScore}
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 200 }}>{d.nearTermPlay ?? d.recommendedPlay}</td>
                    <td style={{ ...td, maxWidth: 180 }}>{d.firstMove ?? "—"}</td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      <PromoteToActionQueueButton
                        county={d.county}
                        state={d.state}
                        serviceCategory={d.serviceCategory}
                        countyOpportunityId={d.id}
                        compact
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {questions.length > 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px" }}>Network Formation Questions</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {questions.map((q) => (
              <div key={q.id} style={{ borderTop: "1px solid #f5f4f2", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#4338ca" }}>{q.id}</div>
                <div style={{ fontSize: 13, fontWeight: 700, margin: "4px 0" }}>{q.question}</div>
                <div style={{ fontSize: 12, color: "#57534e", lineHeight: 1.55 }}>{q.answer}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <CountyOpportunityDrawer
        dossier={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSelectProvider={(id) => {
          window.location.href = `/admin/intelligence/transpo/provider-dossiers?provider=${id}`;
        }}
      />
    </div>
  );
}
