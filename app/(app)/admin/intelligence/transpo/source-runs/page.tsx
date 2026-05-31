"use client";
// app/(app)/admin/intelligence/transpo/source-runs/page.tsx
// Transpo Source Runs — read-only history of persisted source pull artifacts.
// Reads GET /api/admin/intelligence/transpo/source-runs (newest first).

import { useEffect, useState } from "react";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import type { TranspoSourceRun } from "@/lib/intelligence/transpo/types";

type RunStatus = "Mock" | "Live" | "Imported" | "Unknown";

function statusFor(sourceMode: string): RunStatus {
  if (sourceMode?.includes("mock")) return "Mock";
  if (sourceMode === "live_api") return "Live";
  if (sourceMode === "csv_import") return "Imported";
  return "Unknown";
}

const STATUS_COLORS: Record<RunStatus, { fg: string; bg: string; border: string }> = {
  Mock: { fg: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  Live: { fg: "#166534", bg: "#dcfce7", border: "#bbf7d0" },
  Imported: { fg: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
  Unknown: { fg: "#57534e", bg: "#f5f5f4", border: "#e7e5e4" },
};

export default function TranspoSourceRunsPage() {
  const [runs, setRuns] = useState<TranspoSourceRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/intelligence/transpo/source-runs");
        const data = (await res.json()) as {
          ok: boolean;
          runs?: TranspoSourceRun[];
          error?: string;
        };
        if (!active) return;
        if (data.ok && Array.isArray(data.runs)) {
          setRuns(data.runs);
        } else {
          setError(data.error ?? "Failed to load source runs");
        }
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

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      <IntelligenceSubNav config={transpoConfig} currentTool="source-runs" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Transpo Source Runs
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 600, lineHeight: 1.55 }}>
          Review source pull history before wiring live carrier data.
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#78716c" }}>Loading source runs…</p>
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
      ) : runs.length === 0 ? (
        <div style={{
          fontSize: 13,
          color: "#78716c",
          background: "#f9f9f8",
          border: "1px solid #ede9e4",
          borderRadius: 12,
          padding: "28px 24px",
          textAlign: "center",
        }}>
          <div style={{ fontWeight: 700, color: "#44403c", marginBottom: 4 }}>No source runs yet</div>
          Run a pull from <strong>Source Ingest</strong> to create your first source run artifact.
        </div>
      ) : (
        <div style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 14,
          overflow: "hidden",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "#78716c", borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                  <th style={{ ...headerCellStyle, width: 28 }} aria-label="Expand" />
                  {["Date", "Source", "Mode", "Provider", "Market", "State", "City", "Keywords", "Records", "Status"].map((h) => (
                    <th key={h} style={headerCellStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const status = statusFor(run.sourceMode);
                  const sc = STATUS_COLORS[status];
                  const isOpen = expanded.has(run.id);
                  const input = run.input ?? {};
                  return (
                    <FragmentRow
                      key={run.id}
                      run={run}
                      status={status}
                      statusColor={sc}
                      isOpen={isOpen}
                      input={input}
                      cellStyle={cellStyle}
                      onToggle={() => toggle(run.id)}
                    />
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

function FragmentRow({
  run,
  status,
  statusColor,
  isOpen,
  input,
  cellStyle,
  onToggle,
}: {
  run: TranspoSourceRun;
  status: RunStatus;
  statusColor: { fg: string; bg: string; border: string };
  isOpen: boolean;
  input: TranspoSourceRun["input"];
  cellStyle: React.CSSProperties;
  onToggle: () => void;
}) {
  const sampleRecords = (run.records ?? []).slice(0, 10);

  return (
    <>
      <tr
        onClick={onToggle}
        style={{ borderBottom: "1px solid #f5f5f4", cursor: "pointer" }}
      >
        <td style={{ ...cellStyle, color: "#a8a29e", textAlign: "center" }}>
          {isOpen ? "▾" : "▸"}
        </td>
        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
          {run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}
        </td>
        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{run.source}</td>
        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{run.sourceMode}</td>
        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{run.providerKind ?? "—"}</td>
        <td style={cellStyle}>{input.market || "—"}</td>
        <td style={cellStyle}>{input.state || "—"}</td>
        <td style={cellStyle}>{input.city || "—"}</td>
        <td style={cellStyle}>{input.keyword || "—"}</td>
        <td style={cellStyle}>{run.recordCount}</td>
        <td style={cellStyle}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 20,
            color: statusColor.fg,
            background: statusColor.bg,
            border: `1px solid ${statusColor.border}`,
            whiteSpace: "nowrap",
          }}>
            {status}
          </span>
        </td>
      </tr>

      {isOpen && (
        <tr style={{ borderBottom: "1px solid #f5f5f4", background: "#fafaf9" }}>
          <td colSpan={11} style={{ padding: "14px 18px 20px" }}>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 24px",
              fontSize: 11,
              color: "#57534e",
              marginBottom: 12,
            }}>
              <span><strong style={{ color: "#1c1917" }}>Run ID:</strong> <code style={{ fontSize: 10 }}>{run.id}</code></span>
              {run.providerKind && (
                <span><strong style={{ color: "#1c1917" }}>Provider:</strong> {run.providerKind}</span>
              )}
              {input.notes && (
                <span><strong style={{ color: "#1c1917" }}>Notes:</strong> {input.notes}</span>
              )}
              {run.message && (
                <span><strong style={{ color: "#1c1917" }}>Message:</strong> {run.message}</span>
              )}
            </div>

            {sampleRecords.length === 0 ? (
              <p style={{ fontSize: 11, color: "#a8a29e", margin: 0 }}>No records in this run.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ fontSize: 11, color: "#78716c", marginBottom: 6 }}>
                  Sample records (showing {sampleRecords.length} of {run.recordCount})
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#a8a29e", borderBottom: "1px solid #e7e5e4" }}>
                      {["Company", "DOT", "MC", "City", "State", "Fleet", "Drivers", "Status"].map((h) => (
                        <th key={h} style={{ padding: "6px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRecords.map((r, i) => (
                      <tr key={`${r.dotNumber ?? r.companyName}-${i}`} style={{ borderBottom: "1px solid #f0efed", color: "#44403c" }}>
                        <td style={{ padding: "6px 8px" }}>{r.companyName}</td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{r.dotNumber ?? "—"}</td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{r.mcNumber ?? "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{r.city ?? "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{r.state ?? "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{r.fleetSize ?? "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{r.driverCount ?? "—"}</td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{r.authorityStatus ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
