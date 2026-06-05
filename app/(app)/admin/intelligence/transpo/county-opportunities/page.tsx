"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

export default function TranspoCountyOpportunitiesPage() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<CountyOpportunitySummary | null>(null);
  const [dossiers, setDossiers] = useState<CountyOpportunityDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CountyOpportunityDossier | null>(null);
  const [countyFilter, setCountyFilter] = useState(searchParams.get("county") ?? "");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") ?? "CO");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (countyFilter) params.set("county", countyFilter);
      if (stateFilter) params.set("state", stateFilter);
      const qs = params.toString();
      const res = await fetch(`/api/admin/intelligence/transpo/county-opportunities${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setSummary(data.summary ?? null);
      setDossiers(data.dossiers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [countyFilter, stateFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const county = searchParams.get("county");
    const state = searchParams.get("state");
    const service = searchParams.get("service");
    if (county) setCountyFilter(county);
    if (state) setStateFilter(state);

    if (county && service) {
      fetch(`/api/admin/intelligence/transpo/county-opportunities?county=${encodeURIComponent(county)}&state=${state ?? "CO"}&service=${service}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.dossier) setSelected(data.dossier);
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const sorted = useMemo(
    () => [...dossiers].sort((a, b) => b.actionabilityScore - a.actionabilityScore),
    [dossiers],
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="county-opportunities" />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>County Opportunities</h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
          County-level opportunity dossiers combining deficits, payers, providers, and recommended market-entry plays.
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <input
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          placeholder="Filter county"
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff" }}
        />
        <input
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          placeholder="State"
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff", width: 72 }}
        />
        <span style={{ fontSize: 11, color: "#a8a29e" }}>{sorted.length} shown</span>
        <Link href="/admin/intelligence/transpo/opportunity-radar" style={{ fontSize: 12, fontWeight: 700, color: "#4338ca", marginLeft: "auto" }}>
          Opportunity Radar →
        </Link>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr>
              {["County", "Service", "Gap", "Confidence", "Providers", "Payers", "Actionability", "Play"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
              : sorted.length === 0 ? <tr><td colSpan={8} style={{ ...td, textAlign: "center" }}>No county dossiers — build provider dossiers first.</td></tr>
              : sorted.map((d) => {
                const band = BAND_STYLE[d.actionabilityBand] ?? BAND_STYLE.watch;
                const svc = d.serviceCategory as TranspoServiceCategory;
                return (
                  <tr key={d.id} onClick={() => setSelected(d)} style={{ cursor: "pointer" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#1c1917" }}>{d.county}, {d.state}</td>
                    <td style={td}>{SERVICE_CATEGORY_LABELS[svc] ?? d.serviceCategory}</td>
                    <td style={{ ...td, fontWeight: 800 }}>{d.deficitScore}</td>
                    <td style={td}>{d.confidenceScore}</td>
                    <td style={{ ...td, fontWeight: d.providerCount === 0 ? 800 : 400, color: d.providerCount === 0 ? "#991b1b" : undefined }}>{d.providerCount}</td>
                    <td style={td}>{d.payers.length}</td>
                    <td style={td}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: band.fg, background: band.bg }}>
                        {d.actionabilityScore} ({d.actionabilityBand})
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 200 }}>{d.recommendedPlay}</td>
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
