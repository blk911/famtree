"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { CountyOpportunityDrawer } from "@/components/admin/intelligence/transpo/CountyOpportunityDrawer";
import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory } from "@/lib/intelligence/transpo/market-gaps/types";
import type {
  CountyOpportunityDossier,
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

export default function TranspoOpportunityRadarPage() {
  const [summary, setSummary] = useState<CountyOpportunitySummary | null>(null);
  const [dossiers, setDossiers] = useState<CountyOpportunityDossier[]>([]);
  const [topImmediate, setTopImmediate] = useState<CountyOpportunityDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CountyOpportunityDossier | null>(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(
    () => [...dossiers].sort((a, b) => b.actionabilityScore - a.actionabilityScore),
    [dossiers],
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="opportunity-radar" />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Opportunity Radar</h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
          Ranked county/service opportunities by actionability — gap, confidence, payer presence, and provider scarcity.
        </p>
      </div>

      {error ? <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[["Dossiers", summary?.totalDossiers ?? "…"], ["Immediate", summary?.immediateOpportunities ?? "…"], ["Priority", summary?.priorityOpportunities ?? "…"], ["Zero Provider", summary?.zeroProviderRows ?? "…"]].map(([l, v]) => (
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
                <strong>{d.county}, {d.state}</strong> — {SERVICE_CATEGORY_LABELS[d.serviceCategory as TranspoServiceCategory] ?? d.serviceCategory} · actionability {d.actionabilityScore} · {d.recommendedPlay}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr>
              {["County", "Service", "Gap", "Confidence", "Providers", "Payer", "Actionability", "Recommended Play"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
              : sorted.length === 0 ? <tr><td colSpan={8} style={{ ...td, textAlign: "center" }}>No opportunities — run provider dossier backfill after service deficits.</td></tr>
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
                    <td style={{ ...td, fontWeight: 800 }}>{d.deficitScore}</td>
                    <td style={td}>{d.confidenceScore}</td>
                    <td style={{ ...td, fontWeight: d.providerCount === 0 ? 800 : 400, color: d.providerCount === 0 ? "#991b1b" : undefined }}>{d.providerCount}</td>
                    <td style={td}>{d.payerPresenceScore}</td>
                    <td style={td}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: band.fg, background: band.bg }}>
                        {d.actionabilityScore} ({d.actionabilityBand})
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 220 }}>{d.recommendedPlay}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

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
