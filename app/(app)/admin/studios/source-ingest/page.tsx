"use client";

import { useState } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import {
  ADMIN_INTEL_BODY,
  ADMIN_INTEL_CARD_LABEL,
  ADMIN_INTEL_META,
} from "@/components/admin/intelligence/salon/admin-intelligence-typography";

type ScanResponse = {
  ok: boolean;
  sourceType?: string;
  provider?: string;
  providerLabel?: string;
  directoryUrl?: string;
  market?: string;
  category?: string;
  candidatesFound?: number;
  candidatesCreated?: number;
  duplicates?: number;
  warnings?: string[];
  errors?: string[];
  detail?: string;
  error?: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e7e5e4",
  borderRadius: 8,
  fontSize: 13,
  boxSizing: "border-box",
};

export default function SourceIngestPage() {
  const [url, setUrl] = useState(
    "https://www.vagaro.com/professionals/nails/parker--co",
  );
  const [market, setMarket] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  async function handleScan() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        "/api/admin/intelligence/salon/source-ingest/directory-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            market: market.trim() || undefined,
            category: category.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        },
      );
      const data = (await res.json()) as ScanResponse;
      if (!data.ok) {
        setError(data.detail ?? data.error ?? "Scan failed");
        setResult(data);
        return;
      }
      setResult(data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("salon-prospects:refresh"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: "24px 28px 48px",
        maxWidth: 1200,
        margin: "0 auto",
        overflowX: "hidden",
      }}
    >
      <CreatorIntelligenceNav current="source-ingest" />
      <IntelligenceFeatureHeader
        title="Source Ingest"
        description="Paste provider or suite directory URLs to discover import candidates — no hashtag harvest, no direct prospect scoring."
        config={salonConfig}
      />
      <SalonStorageBadge />

      <div
        style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 14,
          padding: "20px 22px",
          marginBottom: 20,
        }}
      >
        <h2 style={{ ...ADMIN_INTEL_CARD_LABEL, margin: "0 0 4px", fontSize: 14 }}>
          Directory URL Ingest
        </h2>
        <p style={{ ...ADMIN_INTEL_META, margin: "0 0 16px" }}>
          Directory listings (e.g. Vagaro /professionals/) are not operator profiles.
          Scanned rows route into Import Candidates for resolver review.
        </p>

        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={ADMIN_INTEL_CARD_LABEL}>Directory URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.vagaro.com/professionals/nails/parker--co"
              style={inputStyle}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={ADMIN_INTEL_CARD_LABEL}>Market (optional)</span>
              <input
                type="text"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                placeholder="Parker, CO"
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={ADMIN_INTEL_CARD_LABEL}>Category (optional)</span>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="nails"
                style={inputStyle}
              />
            </label>
          </div>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={ADMIN_INTEL_CARD_LABEL}>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleScan}
          disabled={loading || !url.trim()}
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: "9px 18px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#d6d3d1" : "#9d174d",
            color: "#fff",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Scanning…" : "Scan Directory"}
        </button>

        {error ? (
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>

      {result ? (
        <div
          style={{
            background: "#fafaf9",
            border: "1px solid #e7e5e4",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <h3 style={{ ...ADMIN_INTEL_CARD_LABEL, margin: "0 0 12px" }}>Scan results</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              ["Provider detected", result.providerLabel ?? result.provider ?? "—"],
              ["Source type", result.sourceType ?? "directory"],
              ["Candidates found", String(result.candidatesFound ?? 0)],
              ["Candidates created", String(result.candidatesCreated ?? 0)],
              ["Duplicates", String(result.duplicates ?? 0)],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  background: "#fff",
                  border: "1px solid #e7e5e4",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div style={ADMIN_INTEL_META}>{label}</div>
                <div style={{ ...ADMIN_INTEL_BODY, fontWeight: 700, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {result.directoryUrl ? (
            <p style={{ ...ADMIN_INTEL_META, margin: "0 0 10px", wordBreak: "break-all" }}>
              Directory: {result.directoryUrl}
            </p>
          ) : null}

          {(result.warnings?.length ?? 0) > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ ...ADMIN_INTEL_CARD_LABEL, marginBottom: 6 }}>Warnings</div>
              <ul style={{ margin: 0, paddingLeft: 18, ...ADMIN_INTEL_BODY }}>
                {result.warnings!.map((w) => (
                  <li key={w} style={{ marginBottom: 4 }}>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(result.errors?.length ?? 0) > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ ...ADMIN_INTEL_CARD_LABEL, marginBottom: 6, color: "#b91c1c" }}>
                Errors
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, ...ADMIN_INTEL_BODY, color: "#b91c1c" }}>
                {result.errors!.map((w) => (
                  <li key={w} style={{ marginBottom: 4 }}>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Link
            href="/admin/studios/import-candidates"
            style={{
              display: "inline-block",
              marginTop: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "#9d174d",
              textDecoration: "none",
            }}
          >
            → Import Candidates
          </Link>
        </div>
      ) : null}
    </div>
  );
}
