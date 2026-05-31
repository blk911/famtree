"use client";
// app/(app)/admin/intelligence/transpo/evidence/page.tsx
// Transpo Evidence Lake — raw, typed proof extracted from source runs before
// carrier resolution. Read-only view of GET /api/admin/intelligence/transpo/evidence.

import { useEffect, useState } from "react";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import type { TranspoEvidence } from "@/lib/intelligence/transpo/types";

const TYPE_COLORS: Record<string, { fg: string; bg: string; bd: string }> = {
  identity: { fg: "#3730a3", bg: "#eef2ff", bd: "#c7d2fe" },
  authority: { fg: "#9a3412", bg: "#fff7ed", bd: "#fed7aa" },
  fleet: { fg: "#155e75", bg: "#ecfeff", bd: "#a5f3fc" },
  contact: { fg: "#166534", bg: "#f0fdf4", bd: "#bbf7d0" },
  location: { fg: "#7c2d12", bg: "#fef2f2", bd: "#fecaca" },
  website: { fg: "#1e40af", bg: "#dbeafe", bd: "#bfdbfe" },
};

type EvidenceStorage = {
  backend: "postgres" | "json";
  durable?: boolean;
  path?: string;
  ephemeral?: boolean;
};

export default function TranspoEvidencePage() {
  const [evidence, setEvidence] = useState<TranspoEvidence[]>([]);
  const [storage, setStorage] = useState<EvidenceStorage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/intelligence/transpo/evidence", {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          ok: boolean;
          evidence?: TranspoEvidence[];
          storage?: EvidenceStorage;
          error?: string;
        };
        if (!active) return;
        if (data.storage) setStorage(data.storage);
        if (data.ok && Array.isArray(data.evidence)) setEvidence(data.evidence);
        else setError(data.error ?? "Failed to load evidence");
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const showEphemeralWarning = storage ? storage.backend !== "postgres" : false;

  const headerCellStyle: React.CSSProperties = {
    padding: "9px 12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    textAlign: "left",
  };
  const cellStyle: React.CSSProperties = {
    padding: "9px 12px",
    color: "#1c1917",
    verticalAlign: "top",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <IntelligenceMarketNav />
      <IntelligenceSubNav config={transpoConfig} currentTool="evidence" />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Transpo Evidence Lake
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
          Raw proof collected from source runs before carrier resolution.
        </p>
        {storage && (
          <p style={{ fontSize: 11, color: "#a8a29e", margin: "6px 0 0" }}>
            Storage: <strong style={{ color: "#78716c" }}>
              {storage.backend === "postgres" ? "Postgres (durable)" : "runtime JSON"}
            </strong>
            {storage.ephemeral ? " · ephemeral (per-instance /tmp)" : ""}
            {storage.path ? ` · ${storage.path}` : ""}
          </p>
        )}
      </div>

      {showEphemeralWarning && (
        <div style={{
          fontSize: 12,
          color: "#9a3412",
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 16,
          lineHeight: 1.5,
        }}>
          ⚠ Evidence storage is runtime-local on this deployment. Rows may not appear
          across server invocations until durable storage is enabled. Use the
          “Created Evidence Preview” on the Source Runs page for immediate proof.
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: "#78716c" }}>Loading evidence…</p>
      ) : error ? (
        <div style={{
          fontSize: 12,
          color: "#dc2626",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 10,
          padding: "12px 16px",
        }}>
          ✗ {error}
        </div>
      ) : evidence.length === 0 ? (
        <div style={{
          fontSize: 13,
          color: "#78716c",
          background: "#f9f9f8",
          border: "1px solid #ede9e4",
          borderRadius: 12,
          padding: "28px 24px",
          textAlign: "center",
        }}>
          <div style={{ fontWeight: 700, color: "#44403c", marginBottom: 4 }}>
            No evidence yet
          </div>
          Create evidence from a <strong>Source Run</strong>.
        </div>
      ) : (
        <div style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 14,
          overflow: "hidden",
        }}>
          <div style={{
            fontSize: 11,
            color: "#78716c",
            padding: "10px 14px",
            borderBottom: "1px solid #f0efed",
            background: "#fafaf9",
          }}>
            {evidence.length} evidence item{evidence.length === 1 ? "" : "s"}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "#78716c", borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                  {["Observed", "Carrier Key", "Source", "Type", "Value", "Confidence"].map((h) => (
                    <th key={h} style={headerCellStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evidence.map((e) => {
                  const c = TYPE_COLORS[e.evidenceType] ?? { fg: "#57534e", bg: "#f5f5f4", bd: "#e7e5e4" };
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {e.observedAt ? new Date(e.observedAt).toLocaleString() : "—"}
                      </td>
                      <td style={{ ...cellStyle }}>
                        <code style={{ fontSize: 10 }}>{e.carrierKey}</code>
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{e.source}</td>
                      <td style={cellStyle}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          color: c.fg,
                          background: c.bg,
                          border: `1px solid ${c.bd}`,
                          whiteSpace: "nowrap",
                        }}>
                          {e.evidenceType}
                        </span>
                      </td>
                      <td style={cellStyle}>{e.value}</td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {typeof e.confidence === "number" ? e.confidence.toFixed(2) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
