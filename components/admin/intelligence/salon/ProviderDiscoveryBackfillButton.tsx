"use client";

import { useState } from "react";

type BackfillResult = {
  prospectsChecked: number;
  directProvidersFound: number;
  linkTrailProvidersFound: number;
  ggHandleMatches: number;
  ggDisplayMatches: number;
  stillUnknown: number;
  errors: string[];
};

type Props = {
  limit?: number;
  label?: string;
};

export function ProviderDiscoveryBackfillButton({
  limit = 100,
  label = "Run Provider Discovery Backfill",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackfillResult | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/provider-discovery/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, noExistingProvider: false }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.detail ?? json.error ?? "Backfill failed");
        return;
      }
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        style={{
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 8,
          border: "1px solid #e7e5e4",
          background: loading ? "#f5f5f4" : "#fff",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Running provider discovery…" : label}
      </button>
      {error ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{error}</div>
      ) : null}
      {result ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: "#57534e",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>Checked {result.prospectsChecked}</span>
          <span>Direct {result.directProvidersFound}</span>
          <span>Link trail {result.linkTrailProvidersFound}</span>
          <span>GG handle {result.ggHandleMatches}</span>
          <span>GG display {result.ggDisplayMatches}</span>
          <span>Unknown {result.stillUnknown}</span>
          {result.errors.length > 0 ? (
            <span style={{ color: "#b91c1c" }}>Errors {result.errors.length}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
