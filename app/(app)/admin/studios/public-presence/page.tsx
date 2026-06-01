"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import type { SalonPublicPresenceResult } from "@/lib/intelligence/salon/public-presence/types";

type SearchStatus = {
  provider: string;
  connected: boolean;
  message: string;
};

type BackfillResult = {
  checked: number;
  providersFound: number;
  searchQueriesRun: number;
  resultsScanned: number;
  ggFallbackUsed: number;
  errors: string[];
};

type ResultRow = SalonPublicPresenceResult & { prospectHandle?: string };

export default function PublicPresencePage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [onlyUnknown, setOnlyUnknown] = useState(true);
  const [forceSearch, setForceSearch] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  async function loadResults() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/intelligence/salon/public-presence/results?limit=300", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) {
        setResults(json.results ?? []);
        setSearchStatus(json.searchStatus ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, []);

  const coverage = useMemo(() => {
    const counts: Record<string, number> = {
      glossgenius: 0,
      vagaro: 0,
      booksy: 0,
      fresha: 0,
      square: 0,
      unknown: 0,
    };
    for (const r of results) {
      if (r.urlType !== "booking_provider" || !r.provider) continue;
      const k = r.provider.toLowerCase();
      if (k in counts) counts[k]++;
      else counts.unknown++;
    }
    return counts;
  }, [results]);

  const metrics = useMemo(() => {
    let websites = 0;
    let bookingUrls = 0;
    for (const r of results) {
      if (r.urlType === "business_website") websites++;
      if (r.urlType === "booking_provider" && r.provider) bookingUrls++;
    }
    return { websites, bookingUrls };
  }, [results]);

  async function runBackfill() {
    if (forceSearch) {
      const ok = window.confirm(
        "Public web discovery uses configured search API credits. Continue?",
      );
      if (!ok) return;
    }
    setBackfillLoading(true);
    setBackfillError(null);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/public-presence/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, onlyUnknown, forceSearch }),
      });
      const json = await res.json();
      if (!json.ok) {
        setBackfillError(json.detail ?? json.error ?? "Backfill failed");
        return;
      }
      setBackfillResult(json);
      await loadResults();
    } catch (e) {
      setBackfillError(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfillLoading(false);
    }
  }

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
      <CreatorIntelligenceNav current="public-presence" />
      <IntelligenceFeatureHeader
        title="Public Presence Discovery"
        description="Find Google/web/booking-provider traces from IG prospect identity."
        config={salonConfig}
      />
      <SalonStorageBadge />

      <div
        style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", marginBottom: 10 }}>
          CONTROLS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={selectStyle}
          >
            {[50, 100, 250].map((n) => (
              <option key={n} value={n}>
                Limit {n}
              </option>
            ))}
          </select>
          <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={onlyUnknown}
              onChange={(e) => setOnlyUnknown(e.target.checked)}
            />
            Only unknown
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={forceSearch}
              onChange={(e) => setForceSearch(e.target.checked)}
            />
            Force search
          </label>
          <button type="button" onClick={runBackfill} disabled={backfillLoading} style={btnStyle}>
            {backfillLoading ? "Running backfill…" : "Run Backfill"}
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: searchStatus?.connected ? "#15803d" : "#b45309" }}>
          Search provider: {searchStatus?.message ?? "Loading…"}
        </div>
        {backfillError ? (
          <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{backfillError}</div>
        ) : null}
        {backfillResult ? (
          <div style={{ marginTop: 8, fontSize: 11, color: "#57534e", display: "flex", flexWrap: "wrap", gap: 12 }}>
            <span>Checked {backfillResult.checked}</span>
            <span>Providers {backfillResult.providersFound}</span>
            <span>Queries {backfillResult.searchQueriesRun}</span>
            <span>Scanned {backfillResult.resultsScanned}</span>
            <span>GG fallback {backfillResult.ggFallbackUsed}</span>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          ["Stored results", results.length],
          ["Booking URLs", metrics.bookingUrls],
          ["Websites", metrics.websites],
          ["GG", coverage.glossgenius],
          ["Vagaro", coverage.vagaro],
          ["Booksy", coverage.booksy],
          ["Fresha", coverage.fresha],
          ["Square", coverage.square],
          ["Unknown", coverage.unknown],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            style={{
              background: "#fff",
              border: "1px solid #e7e5e4",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#78716c" }}>Loading results…</div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafaf9" }}>
                {[
                  "Prospect",
                  "Source",
                  "URL Type",
                  "Provider",
                  "URL",
                  "Conf.",
                  "Evidence",
                  "Discovered",
                ].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: "center", color: "#a8a29e" }}>
                    No presence results yet. Run a backfill or discover from a prospect.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id}>
                    <td style={tdStyle}>
                      {r.prospectHandle ? `@${r.prospectHandle.replace(/^@/, "")}` : r.prospectId ?? "—"}
                      {r.prospectId ? (
                        <div>
                          <Link
                            href={`/admin/studios/prospects?open=${encodeURIComponent(r.prospectId)}`}
                            style={{ fontSize: 10, color: "#0284c7" }}
                          >
                            open
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td style={tdStyle}>{r.source}</td>
                    <td style={tdStyle}>{r.urlType}</td>
                    <td style={tdStyle}>{r.providerLabel ?? r.provider ?? "—"}</td>
                    <td style={tdStyle}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "#0284c7" }}>
                        {r.url.length > 48 ? `${r.url.slice(0, 48)}…` : r.url}
                      </a>
                    </td>
                    <td style={tdStyle}>{Math.round((r.confidence ?? 0) * 100)}%</td>
                    <td style={tdStyle}>
                      {(r.evidence ?? []).slice(0, 2).join(" · ") || "—"}
                    </td>
                    <td style={tdStyle}>{r.discoveredAt?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))
              )}
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
  border: "1px solid #e7e5e4",
  borderRadius: 8,
};

const btnStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 8,
  border: "none",
  background: "#1c1917",
  color: "#fff",
  cursor: "pointer",
};
