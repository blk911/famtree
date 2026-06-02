"use client";

import { useState } from "react";
import type { IgResolverBackfillSummary } from "@/lib/intelligence/salon/ig-resolver-backfill";

type Props = {
  defaultLimit?: number;
  onlyMissingUrls?: boolean;
};

export function IgResolverUrlBackfillButton({
  defaultLimit = 250,
  onlyMissingUrls = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IgResolverBackfillSummary | null>(null);
  const [limit, setLimit] = useState(defaultLimit);
  const [onlyMissing, setOnlyMissing] = useState(onlyMissingUrls);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/ig-resolver/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, onlyMissingUrls: onlyMissing }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.detail ?? json.error ?? "Backfill failed");
        return;
      }
      setResult(json as IgResolverBackfillSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setLoading(false);
    }
  }

  const preview = result?.results.slice(0, 20) ?? [];

  return (
    <div
      style={{
        marginBottom: 16,
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "#44403c", marginBottom: 8 }}>
        IG profile URL backfill
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #e7e5e4",
          }}
        >
          <option value={50}>Limit 50</option>
          <option value={100}>Limit 100</option>
          <option value={250}>Limit 250</option>
        </select>
        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />
          Only prospects missing URLs
        </label>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          style={{
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            border: "none",
            background: loading ? "#f5f5f4" : "#6d28d9",
            color: loading ? "#78716c" : "#fff",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Backfilling IG URLs…" : "Backfill IG URLs"}
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{error}</div>
      ) : null}

      {result ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: "#57534e",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <span>Checked {result.checked}</span>
            <span>Updated {result.updated}</span>
            <span>URLs found {result.urlsFound}</span>
            <span>Providers {result.providersFound}</span>
            <span>Website {result.websiteFound}</span>
            <span>Square {result.squareFound}</span>
            <span>GG {result.glossGeniusFound}</span>
            <span>Vagaro {result.vagaroFound}</span>
            <span>No handle {result.skippedNoHandle}</span>
            {result.failed > 0 ? (
              <span style={{ color: "#b91c1c" }}>Failed {result.failed}</span>
            ) : null}
          </div>

          {preview.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#f5f5f4" }}>
                    {["Handle", "URLs", "Provider", "Best URL", "Status", "Errors"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          fontWeight: 700,
                          color: "#78716c",
                          borderBottom: "1px solid #e7e5e4",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.handle} style={{ borderBottom: "1px solid #f5f5f4" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 700 }}>@{r.handle}</td>
                      <td style={{ padding: "6px 8px" }}>{r.urlsFound}</td>
                      <td style={{ padding: "6px 8px" }}>{r.provider ?? "—"}</td>
                      <td style={{ padding: "6px 8px", maxWidth: 220, wordBreak: "break-all" }}>
                        {r.bestUrl ? (
                          <a
                            href={r.bestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0284c7" }}
                          >
                            {r.bestUrl}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "6px 8px" }}>{r.status}</td>
                      <td style={{ padding: "6px 8px", color: "#b91c1c" }}>
                        {r.errors.length ? r.errors.join("; ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.results.length > 20 ? (
                <div style={{ marginTop: 6, fontSize: 10, color: "#a8a29e" }}>
                  Showing first 20 of {result.results.length} rows.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
