"use client";
// app/(app)/admin/intelligence/transpo/source-ingest/page.tsx
// Carrier Source Ingest — start a new carrier discovery run from
// FMCSA/SAFER/DOT data, CSV upload, URL, or freetext/PDF source.

import { useState } from "react";
import Link from "next/link";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { KeywordPackSelector } from "@/components/admin/intelligence/transpo/KeywordPackSelector";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import {
  getTranspoSourceRegistry,
  type TranspoSourceStatus,
} from "@/lib/intelligence/transpo/source-registry";
import type { TranspoSourceRun, TranspoEvidence } from "@/lib/intelligence/transpo/types";

const SOURCE_TYPES = ["FMCSA", "SAFER", "CSV", "URL", "Text / PDF"] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

const FMCSA_PROVIDERS = [
  { id: "mock", label: "Mock" },
  { id: "csv", label: "CSV" },
  { id: "live", label: "Live" },
] as const;
type FmcsaProviderKind = (typeof FMCSA_PROVIDERS)[number]["id"];

type RunState = "idle" | "saving" | "saved" | "error";

type FmcsaSourceRun = TranspoSourceRun;

const SOURCE_STATUS_COLORS: Record<TranspoSourceStatus, { fg: string; bg: string; border: string }> = {
  mock: { fg: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  available: { fg: "#166534", bg: "#dcfce7", border: "#bbf7d0" },
  placeholder: { fg: "#57534e", bg: "#f5f5f4", border: "#e7e5e4" },
  disabled: { fg: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
};

export default function TranspoSourceIngestPage() {
  const [sourceType, setSourceType] = useState<SourceType>("FMCSA");
  const [market, setMarket] = useState("Colorado");
  const [notes, setNotes] = useState("");
  const [runState, setRunState] = useState<RunState>("idle");
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // FMCSA test pull form state
  const [fmState, setFmState] = useState("CO");
  const [fmCity, setFmCity] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [fmLimit, setFmLimit] = useState(10);
  // Admin UI defaults to the live Company Census provider; failures degrade
  // gracefully and the selector lets you switch to mock/csv without env changes.
  const [fmProviderKind, setFmProviderKind] = useState<FmcsaProviderKind>("live");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState<FmcsaSourceRun | null>(null);

  // Inline evidence creation from the pull results panel.
  const [evidenceCreating, setEvidenceCreating] = useState(false);
  const [evidenceResult, setEvidenceResult] = useState("");
  const [evidenceError, setEvidenceError] = useState("");
  const [evidencePreviewRows, setEvidencePreviewRows] = useState<TranspoEvidence[]>([]);

  function resetEvidenceState() {
    setEvidenceCreating(false);
    setEvidenceResult("");
    setEvidenceError("");
    setEvidencePreviewRows([]);
  }

  async function handleCreateEvidenceFromPull() {
    if (!lastRun) return;
    setEvidenceCreating(true);
    setEvidenceResult("");
    setEvidenceError("");
    setEvidencePreviewRows([]);
    try {
      const res = await fetch("/api/admin/intelligence/transpo/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        // Send the full run as a fallback: on Vercel the source-runs store may
        // live in per-instance /tmp, so this invocation may not see it by id.
        body: JSON.stringify({ runId: lastRun.id, run: lastRun }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        created?: number;
        skipped?: number;
        evidenceCount?: number;
        evidence?: TranspoEvidence[];
        note?: string;
        error?: string;
        detail?: string;
        debug?: {
          runId?: string;
          sourceRecordCount?: number;
          builtEvidenceCount?: number;
          evidenceStorePath?: string;
          persistError?: string;
        };
      };
      if (data.ok) {
        const base = `Created ${data.created ?? 0} evidence items. Skipped ${data.skipped ?? 0}. Total evidence: ${data.evidenceCount ?? 0}.`;
        setEvidenceResult(data.note ? `${base} ${data.note}` : base);
        if (Array.isArray(data.evidence)) setEvidencePreviewRows(data.evidence);
      } else {
        const hints: string[] = [];
        if (data.debug?.runId) hints.push(`runId: ${data.debug.runId}`);
        if (typeof data.debug?.sourceRecordCount === "number") {
          hints.push(`records: ${data.debug.sourceRecordCount}`);
        }
        if (typeof data.debug?.builtEvidenceCount === "number") {
          hints.push(`built: ${data.debug.builtEvidenceCount}`);
        }
        if (data.debug?.evidenceStorePath) hints.push(`store: ${data.debug.evidenceStorePath}`);
        if (data.debug?.persistError) hints.push(`persist: ${data.debug.persistError}`);
        if (data.detail) hints.push(data.detail);
        const baseErr = data.error ?? "Evidence build failed";
        setEvidenceError(hints.length ? `${baseErr} (${hints.join(" · ")})` : baseErr);
      }
    } catch (e) {
      setEvidenceError(e instanceof Error ? e.message : String(e));
    } finally {
      setEvidenceCreating(false);
    }
  }

  async function handleRunFmcsaTestPull() {
    setIsRunning(true);
    setError("");
    // A new pull invalidates any prior evidence creation state.
    resetEvidenceState();
    try {
      const res = await fetch(
        "/api/admin/intelligence/transpo/source-runs/fmcsa",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market,
            state: fmState,
            city: fmCity,
            keyword: selectedKeywords.join(", "),
            limit: fmLimit,
            notes,
            providerKind: fmProviderKind,
          }),
        },
      );
      const data = (await res.json()) as {
        ok: boolean;
        run?: FmcsaSourceRun;
        error?: string;
        detail?: string;
      };
      // Surface the run whenever it exists (even on ok:false) so the diagnostics
      // panel shows providerKind / sourceMode / message / recordCount / DOTs.
      if (data.run) setLastRun(data.run);
      if (data.ok) {
        setError("");
      } else {
        const parts = [
          data.error ?? data.detail ?? "Unknown error",
          data.run?.providerKind ? `provider: ${data.run.providerKind}` : null,
          data.run?.sourceMode ? `mode: ${data.run.sourceMode}` : null,
        ].filter(Boolean);
        setError(parts.join(" · "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCreateRun() {
    setRunState("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/source-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, market, notes }),
      });
      const data = await res.json() as { ok: boolean; runId?: string; error?: string };
      if (data.ok && data.runId) {
        setLastRunId(data.runId);
        setRunState("saved");
        setNotes("");
        setTimeout(() => setRunState("idle"), 4000);
      } else {
        setErrorMsg(data.error ?? "Unknown error");
        setRunState("error");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setRunState("error");
    }
  }

  const isFmcsa = sourceType === "FMCSA";

  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    padding: "8px 10px",
    border: "1px solid #e7e5e4",
    borderRadius: 8,
    background: "#fff",
    color: "#1c1917",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#57534e",
    marginBottom: 5,
    letterSpacing: "0.03em",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="source-ingest" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Carrier Source Ingest
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 600, lineHeight: 1.55 }}>
          Start with FMCSA / SAFER / DOT data, a CSV upload, a public URL, or pasted
          text / PDF source. Each ingest creates a source run that feeds the
          Carrier Resolver and Market Harvest steps.
        </p>
      </div>

      {/* Source registry */}
      <div style={{
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 14,
        padding: "14px 18px",
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#57534e", letterSpacing: "0.03em", marginBottom: 10 }}>
          SOURCES
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {getTranspoSourceRegistry().map((src) => {
            const c = SOURCE_STATUS_COLORS[src.status];
            return (
              <div
                key={src.id}
                title={src.description}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                  padding: "5px 10px",
                  borderRadius: 20,
                  border: "1px solid #e7e5e4",
                  background: "#fafaf9",
                  color: "#1c1917",
                }}
              >
                <span style={{ fontWeight: 700 }}>{src.label}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  padding: "1px 6px",
                  borderRadius: 10,
                  color: c.fg,
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                }}>
                  {src.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column source control area */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>

        {/* Left: source form */}
        <div style={{
          flex: "1 1 420px",
          minWidth: 320,
          maxWidth: 560,
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 14,
          padding: "22px 24px",
        }}>
        <div style={{ display: "grid", gap: 18 }}>

          {/* Source type */}
          <div>
            <label style={labelStyle}>Source Type</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SOURCE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSourceType(t)}
                  style={{
                    fontSize: 11,
                    fontWeight: t === sourceType ? 800 : 500,
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: t === sourceType ? "1px solid #1c1917" : "1px solid #e7e5e4",
                    background: t === sourceType ? "#1c1917" : "#fff",
                    color: t === sourceType ? "#fff" : "#57534e",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Market */}
          <div>
            <label style={labelStyle} htmlFor="transpo-market">Market / State</label>
            <input
              id="transpo-market"
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="e.g. Colorado, Texas, National"
              style={inputStyle}
            />
          </div>

          {/* FMCSA provider selector */}
          {isFmcsa && (
            <div>
              <label style={labelStyle}>FMCSA Provider</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FMCSA_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFmProviderKind(p.id)}
                    style={{
                      fontSize: 11,
                      fontWeight: p.id === fmProviderKind ? 800 : 500,
                      padding: "5px 14px",
                      borderRadius: 20,
                      border: p.id === fmProviderKind ? "1px solid #1c1917" : "1px solid #e7e5e4",
                      background: p.id === fmProviderKind ? "#1c1917" : "#fff",
                      color: p.id === fmProviderKind ? "#fff" : "#57534e",
                      cursor: "pointer",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {fmProviderKind === "live" && (
                <div style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "#92400e",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}>
                  ⚠ Live Data.Transportation.gov Company Census pull. Limit is capped at 50.
                </div>
              )}
            </div>
          )}

          {/* FMCSA test pull params */}
          {isFmcsa && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle} htmlFor="transpo-fm-state">State</label>
                <input
                  id="transpo-fm-state"
                  type="text"
                  value={fmState}
                  onChange={(e) => setFmState(e.target.value)}
                  placeholder="e.g. CO"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="transpo-fm-city">City</label>
                <input
                  id="transpo-fm-city"
                  type="text"
                  value={fmCity}
                  onChange={(e) => setFmCity(e.target.value)}
                  placeholder="e.g. Denver"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="transpo-fm-limit">Limit</label>
                <input
                  id="transpo-fm-limit"
                  type="number"
                  min={1}
                  max={50}
                  value={fmLimit}
                  onChange={(e) => setFmLimit(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Notes / source text */}
          <div>
            <label style={labelStyle} htmlFor="transpo-notes">
              Notes / Source Text
              <span style={{ fontWeight: 400, color: "#a8a29e", marginLeft: 5 }}>(optional)</span>
            </label>
            <textarea
              id="transpo-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder={
                sourceType === "Text / PDF"
                  ? "Paste carrier data, DOT records, or any freetext source here…"
                  : sourceType === "URL"
                  ? "Paste a public URL to scrape…"
                  : sourceType === "CSV"
                  ? "Paste CSV rows here, or describe the file to upload…"
                  : `Describe the ${sourceType} query parameters or paste a data excerpt…`
              }
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {isFmcsa && (
              <button
                type="button"
                onClick={handleRunFmcsaTestPull}
                disabled={isRunning || !market.trim()}
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "9px 20px",
                  borderRadius: 9,
                  border: "none",
                  background: isRunning ? "#a8a29e" : "#1c1917",
                  color: "#fff",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  letterSpacing: "0.02em",
                }}
              >
                {isRunning ? "Running test pull..." : "Run FMCSA Test Pull"}
              </button>
            )}
            {isFmcsa && error && (
              <span style={{ fontSize: 11, color: "#dc2626" }}>✗ {error}</span>
            )}
            {/* The FMCSA pull persists its own source run (with records), so the
                manual "Create Source Run" action — which only writes an empty
                0-record placeholder — is hidden for FMCSA to avoid cluttering
                Source Runs with empty rows that can't produce evidence. */}
            {!isFmcsa && (
              <>
                <button
                  type="button"
                  onClick={handleCreateRun}
                  disabled={runState === "saving" || !market.trim()}
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "9px 20px",
                    borderRadius: 9,
                    border: "none",
                    background: runState === "saving" ? "#a8a29e" : "#1c1917",
                    color: "#fff",
                    cursor: runState === "saving" ? "not-allowed" : "pointer",
                    letterSpacing: "0.02em",
                  }}
                >
                  {runState === "saving" ? "Saving…" : "Create Source Run"}
                </button>

                {runState === "saved" && lastRunId && (
                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>
                    ✓ Run {lastRunId.slice(-8)} saved
                  </span>
                )}
                {runState === "error" && (
                  <span style={{ fontSize: 11, color: "#dc2626" }}>
                    ✗ {errorMsg}
                  </span>
                )}
              </>
            )}
            {isFmcsa && (
              <span style={{ fontSize: 11, color: "#a8a29e" }}>
                The test pull saves its own source run automatically — open{" "}
                <strong style={{ color: "#78716c" }}>Source Runs</strong> to create evidence.
              </span>
            )}
          </div>
        </div>
        </div>

        {/* Right: keyword packs */}
        <div style={{ flex: "1 1 320px", minWidth: 280, maxWidth: 440 }}>
          <KeywordPackSelector
            selectedKeywords={selectedKeywords}
            onChange={setSelectedKeywords}
          />
        </div>
      </div>

      {/* FMCSA test pull results */}
      {isFmcsa && lastRun && (
        <div style={{
          marginTop: 28,
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 14,
          padding: "20px 22px",
        }}>
          {lastRun.sourceMode.startsWith("mock") && (
            <div style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              color: "#92400e",
              background: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "5px 10px",
              marginBottom: 14,
            }}>
              ⚠ Mock FMCSA test data — live source not connected yet.
            </div>
          )}

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 24px",
            fontSize: 12,
            color: "#57534e",
            marginBottom: 16,
          }}>
            <span><strong style={{ color: "#1c1917" }}>Run ID:</strong> <code style={{ fontSize: 11 }}>{lastRun.id}</code></span>
            {lastRun.providerKind && (
              <span><strong style={{ color: "#1c1917" }}>Provider:</strong> {lastRun.providerKind}</span>
            )}
            <span><strong style={{ color: "#1c1917" }}>Source mode:</strong> {lastRun.sourceMode}</span>
            <span><strong style={{ color: "#1c1917" }}>Records:</strong> {lastRun.recordCount}</span>
            {lastRun.records.length > 0 && (
              <span>
                <strong style={{ color: "#1c1917" }}>First DOTs:</strong>{" "}
                {lastRun.records
                  .slice(0, 3)
                  .map((r) => r.dotNumber ?? "—")
                  .join(", ")}
              </span>
            )}
            <span><strong style={{ color: "#1c1917" }}>Created:</strong> {new Date(lastRun.createdAt).toLocaleString()}</span>
            <Link
              href="/admin/intelligence/transpo/source-runs"
              style={{ color: "#1c1917", fontWeight: 700, textDecoration: "underline" }}
            >
              View Source Runs →
            </Link>
          </div>

          {/* Inline evidence creation — skip the trip to Source Runs. */}
          {lastRun.recordCount > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleCreateEvidenceFromPull}
                  disabled={evidenceCreating}
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "8px 16px",
                    borderRadius: 9,
                    border: "1px solid #c7d2fe",
                    background: evidenceCreating ? "#e0e7ff" : "#eef2ff",
                    color: "#3730a3",
                    cursor: evidenceCreating ? "not-allowed" : "pointer",
                    letterSpacing: "0.02em",
                  }}
                >
                  {evidenceCreating ? "Creating evidence…" : "Create Evidence from This Run"}
                </button>
                {evidenceResult && (
                  <span style={{ fontSize: 11, color: "#3730a3", fontWeight: 700 }}>✓ {evidenceResult}</span>
                )}
                {evidenceError && (
                  <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>✗ {evidenceError}</span>
                )}
              </div>

              {evidenceResult && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                  <Link
                    href="/admin/intelligence/transpo/evidence"
                    style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textDecoration: "underline" }}
                  >
                    View Evidence →
                  </Link>
                  <Link
                    href="/admin/intelligence/transpo/resolver"
                    style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textDecoration: "underline" }}
                  >
                    Resolve Carriers →
                  </Link>
                </div>
              )}

              {evidencePreviewRows.length > 0 && (
                <div style={{
                  marginTop: 12,
                  border: "1px solid #c7d2fe",
                  borderRadius: 10,
                  background: "#f5f7ff",
                  overflow: "hidden",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#3730a3", padding: "8px 12px", borderBottom: "1px solid #e0e7ff" }}>
                    Created Evidence Preview — showing {Math.min(evidencePreviewRows.length, 10)} of {evidencePreviewRows.length}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ textAlign: "left", color: "#6366f1", borderBottom: "1px solid #e0e7ff" }}>
                          {["Carrier Key", "Type", "Value", "Confidence"].map((h) => (
                            <th key={h} style={{ padding: "6px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {evidencePreviewRows.slice(0, 10).map((ev) => (
                          <tr key={ev.id} style={{ borderBottom: "1px solid #eef2ff" }}>
                            <td style={{ padding: "6px 12px" }}><code style={{ fontSize: 10 }}>{ev.carrierKey}</code></td>
                            <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>{ev.evidenceType}</td>
                            <td style={{ padding: "6px 12px" }}>{ev.value}</td>
                            <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                              {typeof ev.confidence === "number" ? ev.confidence.toFixed(2) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {lastRun.message && (
            <div style={{
              fontSize: 12,
              color: "#57534e",
              background: "#f9f9f8",
              border: "1px solid #ede9e4",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 14,
            }}>
              {lastRun.message}
            </div>
          )}

          {lastRun.records.length === 0 ? (
            <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>No records returned for this run.</p>
          ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#78716c", borderBottom: "1px solid #e7e5e4" }}>
                  {["Company", "DOT", "MC", "City", "State", "Fleet", "Drivers", "Status"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lastRun.records.map((r, i) => (
                  <tr key={`${r.dotNumber ?? r.companyName}-${i}`} style={{ borderBottom: "1px solid #f5f5f4", color: "#1c1917" }}>
                    <td style={{ padding: "8px 10px" }}>{r.companyName}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.dotNumber ?? "—"}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.mcNumber ?? "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{r.city ?? "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{r.state ?? "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{r.fleetSize ?? "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{r.driverCount ?? "—"}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.authorityStatus ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Info panel */}
      <div style={{
        marginTop: 28,
        padding: "14px 18px",
        background: "#f9f9f8",
        border: "1px solid #ede9e4",
        borderRadius: 10,
        maxWidth: 540,
        fontSize: 12,
        color: "#78716c",
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>What happens next?</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Source run is saved to <code style={{ fontSize: 10, background: "#f0ede8", padding: "1px 5px", borderRadius: 4 }}>runtime-data/intelligence/transpo/source-runs/</code></li>
          <li>Use <strong>Carrier Resolver</strong> to resolve carrier names and USDOT records to public identity signals.</li>
          <li>Use <strong>Market Harvest</strong> for market-level aggregation.</li>
          <li>Qualified carriers appear in <strong>Red Dots</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
