"use client";

import { useEffect, useState, useMemo } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import { SalonProspectDrawer } from "@/components/admin/intelligence/salon/SalonProspectDrawer";
import { SalonOperatorSummary } from "@/components/admin/intelligence/salon/SalonOperatorSummary";
import { BookingProviderPill } from "@/components/admin/intelligence/salon/BookingProviderPill";
import { BookingProviderSourceChip } from "@/components/admin/intelligence/salon/BookingProviderSourceChip";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { ProviderDetectionSummary } from "@/lib/intelligence/salon/provider-detection-diagnostics";

export default function ImportCandidatesPage() {
  const [prospects, setProspects] = useState<ProspectRecord[]>([]);
  const [providerSummary, setProviderSummary] = useState<ProviderDetectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fProvider, setFProvider] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [fConfidence, setFConfidence] = useState("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/studios/prospects/provider-diagnostics", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok: boolean; summary?: ProviderDetectionSummary }) => {
        if (d.ok && d.summary) setProviderSummary(d.summary);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (fProvider !== "all") params.set("provider", fProvider);
    if (fSource !== "all") params.set("source", fSource);
    if (fConfidence !== "all") params.set("confidence", fConfidence);
    setLoading(true);
    fetch(`/api/admin/intelligence/salon/import-candidates?${params}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; prospects?: ProspectRecord[] }) => {
        if (d.ok) setProspects(d.prospects ?? []);
      })
      .finally(() => setLoading(false));
  }, [fProvider, fSource, fConfidence]);

  const providerCounts = useMemo(() => {
    const counts = { glossgenius: 0, vagaro: 0, square: 0, unknown: 0 };
    for (const p of prospects) {
      const key = (p.bookingProvider ?? "unknown").toLowerCase();
      if (key === "glossgenius") counts.glossgenius++;
      else if (key === "vagaro") counts.vagaro++;
      else if (key === "square") counts.square++;
      else counts.unknown++;
    }
    return counts;
  }, [prospects]);

  const summaryPills = useMemo(() => {
    const total = prospects.length;
    if (providerSummary) {
      return [
        { label: "Import Candidates", value: total, color: "#15803d" },
        { label: "GlossGenius", value: providerSummary.glossgenius, color: "#9d174d" },
        { label: "Vagaro", value: providerSummary.vagaro, color: "#1d4ed8" },
        { label: "Square", value: providerSummary.square, color: "#1c1917" },
        { label: "Unknown", value: providerSummary.unknownNoProvider, color: "#b45309" },
      ];
    }
    return [
      { label: "Import Candidates", value: total, color: "#15803d" },
      { label: "GlossGenius", value: providerCounts.glossgenius, color: "#9d174d" },
      { label: "Vagaro", value: providerCounts.vagaro, color: "#1d4ed8" },
      { label: "Square", value: providerCounts.square, color: "#1c1917" },
      { label: "Unknown", value: providerCounts.unknown, color: "#b45309" },
    ];
  }, [prospects.length, providerSummary, providerCounts]);

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <CreatorIntelligenceNav current="import-candidates" />
      <IntelligenceFeatureHeader
        title="Import Candidates"
        description="Booking-provider opportunities for back-office import and Hidden Money Reports."
        config={salonConfig}
      />
      <SalonStorageBadge />

      <SalonOperatorSummary pills={summaryPills} />

      {providerSummary ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
            PROVIDER INTELLIGENCE (STORE)
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: "#57534e" }}>
            {[
              ["Provider detected", providerSummary.providerDetected],
              ["GG handle match", providerSummary.ggHandleMatch],
              ["GG display match", providerSummary.ggDisplayMatch],
              ["Link-in-bio fetched", providerSummary.linkInBioPagesFetched],
            ].map(([label, val]) => (
              <span
                key={label}
                style={{ background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: 8, padding: "6px 10px" }}
              >
                <strong>{label}:</strong> {val}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
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
        <select value={fSource} onChange={(e) => setFSource(e.target.value)} style={selectStyle}>
          <option value="all">Source: All</option>
          <option value="direct_url">Direct</option>
          <option value="link_in_bio">Link-in-Bio</option>
          <option value="handle_derived">Handle Match</option>
          <option value="display_name_derived">Display Match</option>
          <option value="google_search">Search Match</option>
          <option value="website_crawl">Website Link</option>
          <option value="public_web">Public Web</option>
        </select>
        <select value={fConfidence} onChange={(e) => setFConfidence(e.target.value)} style={selectStyle}>
          <option value="all">Confidence: All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#78716c" }}>Loading…</div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#fafaf9", textAlign: "left" }}>
                {["Prospect", "Provider", "Source", "Conf.", "Import", "Booking URL", "Updated"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <tr
                  key={p.prospectId}
                  onClick={() => setDrawerId(p.prospectId)}
                  style={{ cursor: "pointer", borderTop: "1px solid #f5f5f4" }}
                >
                  <td style={tdStyle}>
                    <strong>@{p.identity.handle}</strong>
                    <div style={{ fontSize: 10, color: "#78716c" }}>{p.identity.name}</div>
                  </td>
                  <td style={tdStyle}>
                    <BookingProviderPill
                      provider={p.bookingProvider}
                      label={p.bookingProviderLabel}
                      bookingUrl={p.bookingUrl}
                      showImportChip
                    />
                  </td>
                  <td style={tdStyle}>
                    <BookingProviderSourceChip prospect={p} />
                  </td>
                  <td style={tdStyle}>{p.bookingProviderConfidence ?? "—"}</td>
                  <td style={tdStyle}>Yes</td>
                  <td style={tdStyle}>
                    {p.bookingUrl ? (
                      <a
                        href={p.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#0284c7", fontSize: 11 }}
                      >
                        Open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyle}>{new Date(p.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {prospects.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#78716c" }}>No import candidates match filters.</div>
          ) : null}
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

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e7e5e4",
  background: "#fff",
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 10,
  fontWeight: 800,
  color: "#a8a29e",
  letterSpacing: "0.04em",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
};
