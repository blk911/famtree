"use client";
// app/(app)/admin/intelligence/transpo/resolver/page.tsx
// Carrier Resolver — collapse the Evidence Lake into resolved carrier targets
// and upsert them into the carrier master store.

import { useCallback, useEffect, useState } from "react";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";

type ResolveResult = {
  ok: boolean;
  resolved?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  carrierCount?: number;
  error?: string;
  detail?: string;
};

export default function TranspoResolverPage() {
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null);
  const [carrierCount, setCarrierCount] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [error, setError] = useState("");

  const refreshCounts = useCallback(async () => {
    try {
      const [evRes, carRes] = await Promise.all([
        fetch("/api/admin/intelligence/transpo/evidence", { cache: "no-store" }),
        fetch("/api/admin/intelligence/transpo/carriers", { cache: "no-store" }),
      ]);
      const ev = (await evRes.json()) as { ok: boolean; evidence?: unknown[] };
      const car = (await carRes.json()) as { ok: boolean; carriers?: unknown[] };
      setEvidenceCount(ev.ok && Array.isArray(ev.evidence) ? ev.evidence.length : 0);
      setCarrierCount(car.ok && Array.isArray(car.carriers) ? car.carriers.length : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  async function resolve() {
    setResolving(true);
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/carriers/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as ResolveResult;
      setResult(data);
      if (!data.ok) setError(data.error ?? "Resolution failed");
      await refreshCounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResolving(false);
    }
  }

  const statCardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e7e5e4",
    borderRadius: 12,
    padding: "16px 18px",
    minWidth: 150,
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <IntelligenceMarketNav />
      <IntelligenceSubNav config={transpoConfig} currentTool="resolver" />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Carrier Resolver
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 620, lineHeight: 1.55 }}>
          Collapse the Evidence Lake into resolved carriers and upsert them into the
          Carrier Master. Identity is keyed by USDOT, then MC, then company + location.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: 11, color: "#78716c", fontWeight: 700, letterSpacing: "0.04em" }}>
            EVIDENCE ITEMS
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1c1917" }}>
            {evidenceCount ?? "…"}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 11, color: "#78716c", fontWeight: 700, letterSpacing: "0.04em" }}>
            CARRIER MASTER
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1c1917" }}>
            {carrierCount ?? "…"}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={resolve}
        disabled={resolving}
        style={{
          fontSize: 13,
          fontWeight: 800,
          padding: "10px 20px",
          borderRadius: 10,
          border: "none",
          background: resolving ? "#a8a29e" : "#1c1917",
          color: "#fff",
          cursor: resolving ? "not-allowed" : "pointer",
        }}
      >
        {resolving ? "Resolving…" : "Resolve Carriers from Evidence"}
      </button>

      {error && (
        <div style={{
          marginTop: 16,
          fontSize: 12,
          color: "#dc2626",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 10,
          padding: "12px 16px",
        }}>
          ✗ {error}{result?.detail ? ` — ${result.detail}` : ""}
        </div>
      )}

      {result?.ok && (
        <div style={{
          marginTop: 16,
          fontSize: 13,
          color: "#166534",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 10,
          padding: "12px 16px",
        }}>
          ✓ Resolved {result.resolved ?? 0} carrier(s): {result.created ?? 0} created,{" "}
          {result.updated ?? 0} updated, {result.skipped ?? 0} skipped. Carrier master now
          holds {result.carrierCount ?? 0}.
        </div>
      )}
    </div>
  );
}
