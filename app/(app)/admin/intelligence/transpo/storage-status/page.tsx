"use client";

import { useCallback, useEffect, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";

type StorageStatus = {
  durable?: boolean;
  backend?: string;
  databaseUrlPresent?: boolean;
  sourceRunsCount?: number;
  evidenceCount?: number;
  carrierCount?: number;
  googleProviderConnected?: boolean;
};

export default function TranspoStorageStatusPage() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/storage/status", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = status
    ? [
        ["Backend", status.backend ?? "—"],
        ["Durable storage", status.durable ? "Yes (Postgres)" : "No (JSON /tmp)"],
        ["DATABASE_URL", status.databaseUrlPresent ? "Present" : "Missing"],
        ["Source runs", status.sourceRunsCount ?? 0],
        ["Evidence items", status.evidenceCount ?? 0],
        ["Carriers", status.carrierCount ?? 0],
        ["Google provider", status.googleProviderConnected ? "Connected" : "Not connected"],
      ]
    : [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="storage-status" />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Storage Status</h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.55 }}>
          Transpo intelligence backend — Postgres durable vs JSON runtime fallback.
        </p>
      </div>

      {error ? <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div> : null}

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: "18px 20px" }}>
        {loading ? <p style={{ fontSize: 12, color: "#78716c" }}>Loading…</p> : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "160px 1fr", fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: "#a8a29e" }}>{label}</span>
                <span style={{ color: "#44403c" }}>{value}</span>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={load} style={{ marginTop: 16, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, border: "1px solid #e7e5e4", background: "#fafaf9", cursor: "pointer" }}>
          Refresh
        </button>
      </div>
    </div>
  );
}
