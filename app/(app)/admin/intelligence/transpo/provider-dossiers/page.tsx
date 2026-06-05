"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { ProviderDossierDrawer } from "@/components/admin/intelligence/transpo/ProviderDossierDrawer";
import type {
  TranspoProviderDossier,
  TranspoProviderDossierSummary,
} from "@/lib/intelligence/transpo/provider-dossiers/dossier-types";

const BAND_STYLE: Record<string, { fg: string; bg: string }> = {
  strong: { fg: "#166534", bg: "#dcfce7" },
  good: { fg: "#1d4ed8", bg: "#dbeafe" },
  fair: { fg: "#92400e", bg: "#fef3c7" },
  weak: { fg: "#991b1b", bg: "#fef2f2" },
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

export default function TranspoProviderDossiersPage() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<TranspoProviderDossierSummary | null>(null);
  const [dossiers, setDossiers] = useState<TranspoProviderDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<TranspoProviderDossier | null>(null);
  const [countyFilter, setCountyFilter] = useState(searchParams.get("county") ?? "");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (countyFilter) params.set("county", countyFilter);
      if (stateFilter) params.set("state", stateFilter);
      const qs = params.toString();
      const res = await fetch(`/api/admin/intelligence/transpo/provider-dossiers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
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
    if (county) setCountyFilter(county);
    if (state) setStateFilter(state);
  }, [searchParams]);

  useEffect(() => {
    const providerId = searchParams.get("provider");
    if (!providerId) return;
    const match = dossiers.find((d) => d.providerId === providerId);
    if (match) {
      setSelected(match);
      return;
    }
    fetch(`/api/admin/intelligence/transpo/provider-dossiers/${encodeURIComponent(providerId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.dossier) setSelected(data.dossier);
      })
      .catch(() => {});
  }, [searchParams, dossiers]);

  async function handleBackfill() {
    setBackfilling(true);
    try {
      const res = await fetch("/api/admin/intelligence/transpo/provider-dossiers/backfill", { method: "POST" });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Backfill failed"); return; }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfilling(false);
    }
  }

  const sorted = useMemo(
    () => [...dossiers].sort((a, b) => b.contactabilityScore - a.contactabilityScore),
    [dossiers],
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="provider-dossiers" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Provider Intelligence</h1>
          <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
            Investigate transportation providers, verification signals, and market participants.
          </p>
        </div>
        <button type="button" onClick={handleBackfill} disabled={backfilling} style={{
          fontSize: 13, fontWeight: 700, padding: "9px 18px", borderRadius: 8, border: "none",
          background: backfilling ? "#d6d3d1" : "#4338ca", color: "#fff", cursor: backfilling ? "default" : "pointer",
        }}>
          {backfilling ? "Building…" : "Build Provider Dossiers"}
        </button>
      </div>

      {error ? <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[["Total Providers", summary?.totalProviders ?? "…"], ["Verified", summary?.verifiedProviders ?? "…"], ["Strong Contact", summary?.strongContactability ?? "…"], ["Weak Contact", summary?.weakContactability ?? "…"], ["Avg Contact", summary?.averageContactability ?? "…"], ["Avg Fleet", summary?.averageFleetSize ?? "…"]].map(([l, v]) => (
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
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr>
              {["Company", "County", "Categories", "Phone", "Website", "Verification", "Contactability", "Fleet", "Drivers"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
              : sorted.length === 0 ? <tr><td colSpan={9} style={{ ...td, textAlign: "center" }}>No dossiers — run backfill after carrier ingest.</td></tr>
              : sorted.map((d) => {
                const band = BAND_STYLE[d.contactabilityBand] ?? BAND_STYLE.weak;
                return (
                  <tr key={d.providerId} onClick={() => setSelected(d)} style={{ cursor: "pointer" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#1c1917" }}>{d.companyName}</td>
                    <td style={td}>{d.county ?? "—"}</td>
                    <td style={{ ...td, maxWidth: 160 }}>{d.serviceCategories.join(", ")}</td>
                    <td style={td}>{d.phone ?? "—"}</td>
                    <td style={{ ...td, maxWidth: 140 }}>{d.website ? <span style={{ color: "#4338ca" }}>link</span> : "—"}</td>
                    <td style={td}>{d.verificationStatus}</td>
                    <td style={td}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: band.fg, background: band.bg }}>
                        {d.contactabilityScore} ({d.contactabilityBand})
                      </span>
                    </td>
                    <td style={td}>{d.fleetSize ?? "—"}</td>
                    <td style={td}>{d.driverCount ?? "—"}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <ProviderDossierDrawer dossier={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}
