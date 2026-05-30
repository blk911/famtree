"use client";
// app/(app)/admin/intelligence/transpo/source-ingest/page.tsx
// Carrier Source Ingest — start a new carrier discovery run from
// FMCSA/SAFER/DOT data, CSV upload, URL, or freetext/PDF source.

import { useState } from "react";
import Link from "next/link";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { KeywordPackSelector } from "@/components/admin/intelligence/transpo/KeywordPackSelector";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";

const SOURCE_TYPES = ["FMCSA", "SAFER", "CSV", "URL", "Text / PDF"] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

type RunState = "idle" | "saving" | "saved" | "error";

type FmcsaCarrierRecord = {
  companyName: string;
  dotNumber: string;
  mcNumber: string;
  city: string;
  state: string;
  phone: string;
  fleetSize: number;
  driverCount: number;
  authorityStatus: string;
  sourceUrl: string;
  rawSource: string;
};

type FmcsaSourceRun = {
  id: string;
  vertical: string;
  source: string;
  sourceMode: string;
  recordCount: number;
  records: FmcsaCarrierRecord[];
  createdAt: string;
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
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState<FmcsaSourceRun | null>(null);

  async function handleRunFmcsaTestPull() {
    setIsRunning(true);
    setError("");
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
          }),
        },
      );
      const data = (await res.json()) as {
        ok: boolean;
        run?: FmcsaSourceRun;
        error?: string;
      };
      if (data.ok && data.run) {
        setLastRun(data.run);
      } else {
        setError(data.error ?? "Unknown error");
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
      <IntelligenceMarketNav />
      <IntelligenceSubNav config={transpoConfig} currentTool="source-ingest" />

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
            <span><strong style={{ color: "#1c1917" }}>Source mode:</strong> {lastRun.sourceMode}</span>
            <span><strong style={{ color: "#1c1917" }}>Records:</strong> {lastRun.recordCount}</span>
            <span><strong style={{ color: "#1c1917" }}>Created:</strong> {new Date(lastRun.createdAt).toLocaleString()}</span>
            <Link
              href="/admin/intelligence/transpo/source-runs"
              style={{ color: "#1c1917", fontWeight: 700, textDecoration: "underline" }}
            >
              View Source Runs →
            </Link>
          </div>

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
                  <tr key={`${r.dotNumber}-${i}`} style={{ borderBottom: "1px solid #f5f5f4", color: "#1c1917" }}>
                    <td style={{ padding: "8px 10px" }}>{r.companyName}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.dotNumber}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.mcNumber}</td>
                    <td style={{ padding: "8px 10px" }}>{r.city}</td>
                    <td style={{ padding: "8px 10px" }}>{r.state}</td>
                    <td style={{ padding: "8px 10px" }}>{r.fleetSize}</td>
                    <td style={{ padding: "8px 10px" }}>{r.driverCount}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.authorityStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
