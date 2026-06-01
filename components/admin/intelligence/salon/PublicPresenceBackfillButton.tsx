"use client";

import { useState } from "react";

type BackfillResult = {
  checked: number;
  providersFound: number;
  searchQueriesRun: number;
  resultsScanned: number;
  ggFallbackUsed: number;
  errors: string[];
  sampleResults?: Array<{
    handle: string;
    provider?: string;
    source?: string;
    confidence?: number;
  }>;
};

type Props = {
  defaultLimit?: number;
};

export function PublicPresenceBackfillButton({ defaultLimit = 50 }: Props) {
  const [limit, setLimit] = useState(defaultLimit);
  const [onlyUnknown, setOnlyUnknown] = useState(true);
  const [forceSearch, setForceSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackfillResult | null>(null);

  async function run() {
    if (forceSearch) {
      const ok = window.confirm(
        "Public web discovery uses configured search API credits (SerpAPI or Google Custom Search). Continue?",
      );
      if (!ok) return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/public-presence/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, onlyUnknown, forceSearch }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.detail ?? json.error ?? "Backfill failed");
        return;
      }
      setResult(json);
      window.dispatchEvent(new CustomEvent("salon-prospects:refresh"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, color: "#57534e", marginBottom: 8 }}>
        Public Presence Discovery
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          disabled={loading}
          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #e7e5e4" }}
        >
          {[50, 100, 250].map((n) => (
            <option key={n} value={n}>
              Limit {n}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={onlyUnknown}
            onChange={(e) => setOnlyUnknown(e.target.checked)}
            disabled={loading}
          />
          Only unknown providers
        </label>
        <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={forceSearch}
            onChange={(e) => setForceSearch(e.target.checked)}
            disabled={loading}
          />
          Force public search
        </label>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 6,
            border: "1px solid #c4b5fd",
            background: loading ? "#f5f5f4" : "#ede9fe",
            color: "#5b21b6",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Running…" : "Run Public Presence Backfill"}
        </button>
      </div>
      {forceSearch ? (
        <div style={{ fontSize: 10, color: "#b45309", marginBottom: 6 }}>
          Public web discovery uses configured search API credits.
        </div>
      ) : null}
      {error ? <div style={{ fontSize: 11, color: "#b91c1c" }}>{error}</div> : null}
      {result ? (
        <div style={{ fontSize: 11, color: "#57534e", display: "flex", flexWrap: "wrap", gap: 10 }}>
          <span>Checked {result.checked}</span>
          <span>Providers {result.providersFound}</span>
          <span>Queries {result.searchQueriesRun}</span>
          <span>Results {result.resultsScanned}</span>
          <span>GG fallback {result.ggFallbackUsed}</span>
          {result.errors.length > 0 ? (
            <span style={{ color: "#b91c1c" }}>Errors {result.errors.length}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
