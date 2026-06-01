"use client";

import { useState } from "react";
import { GgResolverDiagnosticsCard } from "./GgResolverDiagnosticsCard";
import type { GgResolverRunDiagnostics } from "@/lib/intelligence/salon/gg-resolver-types";

type Props = {
  limit?: number;
  label?: string;
};

export function GgResolverBackfillButton({ limit = 100, label = "Run GG Resolver Backfill" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<GgResolverRunDiagnostics | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setDiag(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/gg-resolver/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, noExistingProvider: true, runGgOnAllDeduped: false }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.detail ?? json.error ?? "Backfill failed");
        return;
      }
      setDiag(json.diagnostics);
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
        {loading ? "Running GG resolver…" : label}
      </button>
      {error ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{error}</div>
      ) : null}
      {diag ? <GgResolverDiagnosticsCard title="Backfill diagnostics" {...diag} /> : null}
    </div>
  );
}
