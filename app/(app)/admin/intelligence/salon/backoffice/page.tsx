"use client";
// app/(app)/admin/intelligence/salon/backoffice/page.tsx
// Salon Back Office Import Lab — owner-approved export upload & Hidden Money Report

import { useCallback, useEffect, useState } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import type {
  HiddenMoneyReport,
  NormalizedSalonRecord,
  SalonBackOfficeImportRun,
} from "@/lib/intelligence/salon/backoffice/types";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7e5e4",
  borderRadius: 14,
  padding: "18px 20px",
  marginBottom: 18,
};

function formatRecordPreview(r: NormalizedSalonRecord): string {
  if (r.type === "client") {
    return [r.fullName ?? [r.firstName, r.lastName].filter(Boolean).join(" "), r.email, r.phone]
      .filter(Boolean)
      .join(" · ");
  }
  if (r.type === "appointment") {
    return [r.clientName, r.serviceName, r.appointmentDate, r.status]
      .filter(Boolean)
      .join(" · ");
  }
  return [r.clientName, r.serviceName, r.paymentDate, r.amount != null ? `$${r.amount}` : null]
    .filter(Boolean)
    .join(" · ");
}

export default function SalonBackOfficeImportPage() {
  const [provider, setProvider] = useState("glossgenius");
  const [entity, setEntity] = useState("auto");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<SalonBackOfficeImportRun | null>(null);
  const [history, setHistory] = useState<SalonBackOfficeImportRun[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/intelligence/salon/backoffice/import", {
        cache: "no-store",
      });
      const data = (await res.json()) as { ok: boolean; runs?: SalonBackOfficeImportRun[] };
      if (data.ok && Array.isArray(data.runs)) {
        setHistory(data.runs);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleAnalyze() {
    if (!file) {
      setError("Choose a CSV export file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("provider", provider);
      form.append("entity", entity);
      const res = await fetch("/api/admin/intelligence/salon/backoffice/import", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        ok: boolean;
        run?: SalonBackOfficeImportRun;
        error?: string;
        detail?: string;
      };
      if (!data.ok || !data.run) {
        setError(data.error ?? data.detail ?? "Import analysis failed");
        return;
      }
      setLastRun(data.run);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const report: HiddenMoneyReport | undefined = lastRun?.report;
  const preview = (lastRun?.normalizedPreview ?? []).slice(0, 10);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <CreatorIntelligenceNav current="backoffice" />

      <IntelligenceFeatureHeader
        title="Salon Back Office Import Lab"
        description="Upload owner-approved GlossGenius/Vagaro/Square exports to find hidden revenue opportunities. Upload/import only — no scraping of private accounts."
        config={salonConfig}
      />
      <p style={{ fontSize: 11, color: "#a8a29e", margin: "-12px 0 18px", maxWidth: 720, lineHeight: 1.5 }}>
        Use only owner-approved exports. Data is used to generate this salon&apos;s report and is not sold or reused.
      </p>

      {/* Upload */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 14 }}>
          UPLOAD EXPORT
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#57534e" }}>
            <span style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d6d3d1",
                fontSize: 13,
              }}
            >
              <option value="glossgenius">GlossGenius</option>
              <option value="vagaro">Vagaro</option>
              <option value="square">Square</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label style={{ fontSize: 12, color: "#57534e" }}>
            <span style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Entity</span>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d6d3d1",
                fontSize: 13,
              }}
            >
              <option value="auto">Auto Detect</option>
              <option value="clients">Clients</option>
              <option value="appointments">Appointments</option>
              <option value="payments">Payments</option>
            </select>
          </label>
        </div>
        <label style={{ fontSize: 12, color: "#57534e", display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>File (CSV)</span>
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 12 }}
          />
        </label>
        {error && (
          <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 10 }}>{error}</div>
        )}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={busy}
          style={{
            background: "#1c1917",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Analyzing…" : "Analyze Export"}
        </button>
      </div>

      {/* Result panel */}
      {lastRun && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 12 }}>
            DETECTION & PREVIEW
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14, fontSize: 12 }}>
            {[
              ["Provider", lastRun.provider],
              ["Entity", lastRun.entity],
              ["Schema confidence", lastRun.schemaConfidence],
              ["Rows", String(lastRun.rowCount)],
              ["Mapped", String(lastRun.mappedCount)],
            ].map(([k, v]) => (
              <span
                key={k}
                style={{
                  background: "#f5f4f2",
                  border: "1px solid #e7e5e4",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}
              >
                <strong>{k}:</strong> {v}
              </span>
            ))}
          </div>
          {lastRun.unmappedHeaders.length > 0 && (
            <p style={{ fontSize: 11, color: "#78716c", margin: "0 0 12px" }}>
              Unmapped headers: {lastRun.unmappedHeaders.join(", ")}
            </p>
          )}
          {preview.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e7e5e4", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px" }}>#</th>
                    <th style={{ padding: "6px 8px" }}>Type</th>
                    <th style={{ padding: "6px 8px" }}>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f5f4f2" }}>
                      <td style={{ padding: "6px 8px", color: "#a8a29e" }}>{i + 1}</td>
                      <td style={{ padding: "6px 8px" }}>{row.type}</td>
                      <td style={{ padding: "6px 8px", color: "#44403c" }}>{formatRecordPreview(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
              No normalized rows mapped yet. Try GlossGenius client export columns or adjust entity.
            </p>
          )}
        </div>
      )}

      {/* Hidden Money Report */}
      {report && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 10 }}>
            HIDDEN MONEY REPORT
          </div>
          <p style={{ fontSize: 13, color: "#44403c", margin: "0 0 14px", lineHeight: 1.5 }}>
            {report.summary}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {Object.entries(report.metrics).map(([k, v]) =>
              v != null ? (
                <span
                  key={k}
                  style={{
                    fontSize: 11,
                    background: "#ecfdf5",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    borderRadius: 8,
                    padding: "5px 10px",
                  }}
                >
                  {k}:{" "}
                  {typeof v === "number" &&
                  (k === "totalRevenue" || k === "avgTicket")
                    ? `$${v}`
                    : v}
                </span>
              ) : null,
            )}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {report.opportunities.map((opp) => (
              <div
                key={opp.id}
                style={{
                  border: "1px solid #e7e5e4",
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: "#fafaf9",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{opp.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#78716c", textTransform: "uppercase" }}>
                    {opp.confidence}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#57534e", margin: 0, lineHeight: 1.5 }}>{opp.description}</p>
                {opp.estimatedValue && (
                  <p style={{ fontSize: 11, color: "#a8a29e", margin: "6px 0 0" }}>{opp.estimatedValue}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 12 }}>
          IMPORT HISTORY
        </div>
        {history.length === 0 ? (
          <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>No import runs yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e7e5e4", textAlign: "left" }}>
                  <th style={{ padding: "6px 8px" }}>File</th>
                  <th style={{ padding: "6px 8px" }}>Provider</th>
                  <th style={{ padding: "6px 8px" }}>Entity</th>
                  <th style={{ padding: "6px 8px" }}>Rows</th>
                  <th style={{ padding: "6px 8px" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run) => (
                  <tr
                    key={run.id}
                    style={{
                      borderBottom: "1px solid #f5f4f2",
                      cursor: "pointer",
                    }}
                    onClick={() => setLastRun(run)}
                  >
                    <td style={{ padding: "6px 8px" }}>{run.fileName}</td>
                    <td style={{ padding: "6px 8px" }}>{run.provider}</td>
                    <td style={{ padding: "6px 8px" }}>{run.entity}</td>
                    <td style={{ padding: "6px 8px" }}>{run.rowCount}</td>
                    <td style={{ padding: "6px 8px", color: "#78716c" }}>
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
