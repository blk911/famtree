"use client";

import { useEffect, useState, useMemo } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import type { ProviderAuditRow } from "@/lib/intelligence/salon/business-stack/provider-audit";

type AuditResponse = {
  ok: boolean;
  totalStacks?: number;
  totalSignals?: number;
  prospectsWithSignals?: number;
  providers?: ProviderAuditRow[];
  validationSummary?: {
    confirmed: number;
    candidates: number;
    rejectedGeneric: number;
    rejectedNotFound: number;
    timeoutError: number;
  };
  detail?: string;
};

export default function ProviderAuditPage() {
  const [report, setReport] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (filter !== "all") params.set("provider", filter);
      const res = await fetch(
        `/api/admin/intelligence/salon/business-stack/provider-audit?${params}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as AuditResponse;
      setReport(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  const rows = useMemo(() => {
    const list = report?.providers ?? [];
    if (filter === "all") return list;
    return list.filter((r) => r.count > 0);
  }, [report, filter]);

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

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <CreatorIntelligenceNav current="provider-audit" />
      <IntelligenceFeatureHeader
        title="Provider Audit"
        description="Verify salon business-stack fingerprints: counts by source, confidence, and sample prospects."
        config={salonConfig}
      />
      <SalonStorageBadge />

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={selectStyle}>
          <option value="all">All providers</option>
          <option value="glossgenius">GlossGenius</option>
          <option value="vagaro">Vagaro</option>
          <option value="square">Square</option>
          <option value="booksy">Booksy</option>
          <option value="gocheckin">GoCheckIn</option>
          <option value="stripe">Stripe</option>
          <option value="meta_pixel">Meta Pixel</option>
        </select>
        <button type="button" onClick={load} style={btnStyle}>
          Refresh
        </button>
      </div>

      {report?.ok ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            ["Stacks stored", report.totalStacks ?? 0],
            ["Total signals", report.totalSignals ?? 0],
            ["Prospects w/ signals", report.prospectsWithSignals ?? 0],
            ["Providers w/ hits", rows.filter((r) => r.count > 0).length],
            ["Confirmed validations", report.validationSummary?.confirmed ?? 0],
            ["Candidate only", report.validationSummary?.candidates ?? 0],
            ["Rejected generic", report.validationSummary?.rejectedGeneric ?? 0],
            ["Rejected not found", report.validationSummary?.rejectedNotFound ?? 0],
            ["Timeout / error", report.validationSummary?.timeoutError ?? 0],
          ].map(([label, val]) => (
            <div
              key={label}
              style={{
                background: "#fafaf9",
                border: "1px solid #e7e5e4",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1c1917" }}>{val}</div>
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div style={{ fontSize: 13, color: "#78716c" }}>Loading…</div>
      ) : !report?.ok ? (
        <div style={{ fontSize: 12, color: "#b91c1c" }}>
          {report?.detail ?? "Audit failed"}
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "Provider",
                  "Category",
                  "Count",
                  "Direct URL",
                  "Link-in-bio",
                  "Website crawl",
                  "Avg conf.",
                  "Sample URL",
                  "Sample prospects",
                ].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.providerId}
                  style={{
                    background: r.count === 0 ? "#fafaf9" : "transparent",
                    opacity: r.count === 0 ? 0.65 : 1,
                  }}
                >
                  <td style={tdStyle}>
                    <strong>{r.label}</strong>
                    <div style={{ fontSize: 10, color: "#a8a29e" }}>{r.providerId}</div>
                  </td>
                  <td style={tdStyle}>{r.category}</td>
                  <td style={tdStyle}>{r.count}</td>
                  <td style={tdStyle}>{r.directUrlCount}</td>
                  <td style={tdStyle}>{r.linkInBioCount}</td>
                  <td style={tdStyle}>{r.websiteCrawlCount}</td>
                  <td style={tdStyle}>{r.averageConfidence ? `${r.averageConfidence}%` : "—"}</td>
                  <td style={tdStyle}>
                    {r.sampleUrl ? (
                      <a
                        href={r.sampleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#0284c7", fontSize: 10, wordBreak: "break-all" }}
                      >
                        {r.sampleUrl.slice(0, 48)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyle}>
                    {r.sampleProspects.length > 0
                      ? r.sampleProspects.map((h) => `@${h}`).join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#44403c",
  background: "#fff",
  border: "1px solid #e7e5e4",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};
