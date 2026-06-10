"use client";

import { useState, type CSSProperties } from "react";
import type { HiddenMoneyReport, SalonBackOfficeImportRun } from "@/lib/intelligence/salon/backoffice/types";
import { HiddenMoneyReportPanel } from "@/components/studios/salon/HiddenMoneyReportPanel";
import { STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const ACCENT = "#9d174d";

type Props = {
  trialId: string;
  defaultProvider?: string;
  onAnalyzed?: (run: SalonBackOfficeImportRun) => void;
};

export function VmbSalonImportPanel({ trialId, defaultProvider = "glossgenius", onAnalyzed }: Props) {
  const [provider, setProvider] = useState(defaultProvider);
  const [entity, setEntity] = useState("auto");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<SalonBackOfficeImportRun | null>(null);

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
      form.append("trialId", trialId);
      const res = await fetch("/api/vmb/trial/import", { method: "POST", body: form });
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
      onAnalyzed?.(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const report: HiddenMoneyReport | undefined = lastRun?.report;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          padding: "22px 20px",
          borderRadius: 16,
          background: "#fff",
          border: `1px solid ${STUDIOS_LINE}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: ACCENT,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Provider ingest / upload
        </div>
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          style={{ marginBottom: 14 }}
        >
          <label style={{ fontSize: 13, color: STUDIOS_MUTED, display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, color: STUDIOS_INK }}>Choose provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={fieldStyle}
            >
              <option value="glossgenius">GlossGenius</option>
              <option value="vagaro">Vagaro</option>
              <option value="square">Square</option>
              <option value="fresha">Fresha</option>
              <option value="boulevard">Boulevard</option>
              <option value="unknown">Other / CSV</option>
            </select>
          </label>
          <label style={{ fontSize: 13, color: STUDIOS_MUTED, display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, color: STUDIOS_INK }}>Export type</span>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} style={fieldStyle}>
              <option value="auto">Auto detect</option>
              <option value="clients">Clients</option>
              <option value="appointments">Appointments</option>
              <option value="payments">Payments</option>
            </select>
          </label>
        </div>
        <label style={{ fontSize: 13, color: STUDIOS_MUTED, display: "grid", gap: 6, marginBottom: 14 }}>
          <span style={{ fontWeight: 700, color: STUDIOS_INK }}>Upload export (CSV)</span>
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 13 }}
          />
        </label>
        {error ? (
          <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div>
        ) : null}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={busy}
          style={{
            background: ACCENT,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 800,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.75 : 1,
          }}
        >
          {busy ? "Running analysis…" : "Run analysis"}
        </button>
      </div>

      {lastRun ? (
        <div
          style={{
            padding: "18px 20px",
            borderRadius: 16,
            background: "#fff",
            border: `1px solid ${STUDIOS_LINE}`,
            fontSize: 13,
            color: STUDIOS_MUTED,
          }}
        >
          <strong style={{ color: STUDIOS_INK }}>{lastRun.fileName}</strong> — {lastRun.rowCount}{" "}
          rows · {lastRun.mappedCount} mapped · {lastRun.provider} / {lastRun.entity}
        </div>
      ) : null}

      {report ? <HiddenMoneyReportPanel report={report} /> : null}
    </div>
  );
}

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  fontSize: 14,
  boxSizing: "border-box",
};
