"use client";
// app/(app)/admin/studios/education-seeds/page.tsx
// Education Manual Seed Import — admin-only.
// Paste a list of educator names/handles/URLs, resolve IG identities,
// save to the prospect repository.

import { useState } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import type {
  IdentityAssemblerResult,
  IdentityAssemblerRunResult,
} from "@/lib/studios/identity-seeds/types";
import type { EducationType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import { EDUCATION_TYPE_LABELS } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";

// ─── Types for API response ───────────────────────────────────────────────────

interface RunResponse {
  ok: true;
  runId: string;
  parsedCount: number;
  assemblerResult: IdentityAssemblerRunResult;
  processedAt: string;
  storePath: string | null;
  prospectStoreBackend: string;
  prospectsBeforeCount: number;
  prospectsAfterCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confColor(n: number) {
  if (n >= 55) return "#15803d";
  if (n >= 20) return "#d97706";
  return "#dc2626";
}

function StatusBadge({ status }: { status: IdentityAssemblerResult["status"] }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    ig_verified:  { bg: "#dcfce7", fg: "#15803d", label: "IG Verified" },
    ig_candidate: { bg: "#fef3c7", fg: "#b45309", label: "IG Candidate" },
    unresolved:   { bg: "#f5f5f4", fg: "#78716c", label: "Unresolved" },
  };
  const c = map[status] ?? map.unresolved;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
      background: c.bg, color: c.fg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}

const PROGRESS_MSGS = [
  "Parsing seed list…",
  "Generating IG handle candidates…",
  "Running IG resolver pipeline…",
  "Matching booking profiles…",
  "Upserting prospect records…",
  "Finalising run…",
];

const PLACEHOLDER = `# Paste educator names, handles, or URLs — one per line
# Formats supported:
#   @handle                        — IG handle only
#   https://instagram.com/handle   — IG URL
#   Jane Smith                     — name (generates candidates)
#   Jane Smith, Denver, CO         — name + location
#   Jane Smith, @janesmith, Denver, CO, homeschool  — CSV
#   Jane Smith | @janesmith | Denver | CO | tutor   — pipe-delimited

@homeschoolwithjane
Jane Smith, Denver, CO, homeschool
Sarah Chen | @sarahlearnsCO | Boulder | CO | microschool
https://instagram.com/mathwithjamie
Rebecca Torres, Austin, TX`;

const EDU_TYPE_OPTIONS: EducationType[] = [
  "homeschool", "microschool", "learning_pod", "tutor", "subject_tutor",
  "classical_education", "montessori", "stem_science", "math", "reading_literacy",
  "dyslexia_special_needs", "test_prep", "curriculum", "parent_community", "co_op", "unknown",
];

// ─── Input form ───────────────────────────────────────────────────────────────

function SeedImportForm({
  onRun, loading, error, progressIdx,
}: {
  onRun: (cfg: {
    inputText: string; mode: ResolveMode;
    maxCandidatesPerSeed: number; defaultEducationType?: EducationType; dryRun: boolean;
  }) => void;
  loading: boolean;
  error: string | null;
  progressIdx: number;
}) {
  const [inputText,         setInputText]        = useState("");
  const [mode,              setMode]             = useState<ResolveMode>("fast");
  const [maxCandidates,     setMaxCandidates]    = useState(8);
  const [defaultEduType,    setDefaultEduType]   = useState<EducationType | "">("");
  const [dryRun,            setDryRun]           = useState(false);

  const lineCount = inputText.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 8,
    fontSize: 13, color: "#1c1917", background: "#fff", boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 16 }}>
        SEED LIST INPUT
      </div>

      {/* Textarea */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
          EDUCATOR IDENTITIES
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={PLACEHOLDER}
          disabled={loading}
          rows={12}
          style={{
            ...inputStyle,
            fontFamily: "monospace", fontSize: 12, resize: "vertical",
            lineHeight: "1.6", minHeight: 200,
          }}
        />
        <div style={{ fontSize: 10, color: "#a8a29e", marginTop: 4 }}>
          {lineCount} active line{lineCount !== 1 ? "s" : ""} · Lines starting with # are comments
        </div>
      </div>

      {/* Options row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Max candidates */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            MAX CANDIDATES / SEED
          </label>
          <select value={maxCandidates} onChange={(e) => setMaxCandidates(Number(e.target.value))} style={inputStyle} disabled={loading}>
            {[4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Default education type */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            DEFAULT EDUCATION TYPE
          </label>
          <select value={defaultEduType} onChange={(e) => setDefaultEduType(e.target.value as EducationType | "")} style={inputStyle} disabled={loading}>
            <option value="">— infer from line —</option>
            {EDU_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{EDUCATION_TYPE_LABELS[t]}</option>)}
          </select>
        </div>

        {/* Dry run */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={loading}
              style={{ width: 15, height: 15 }}
            />
            <span style={{ fontWeight: 600, color: "#57534e" }}>Dry run (parse only — no save)</span>
          </label>
        </div>
      </div>

      {/* Mode selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
          IG RESOLVER MODE
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["fast", "deep"] as ResolveMode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} disabled={loading}
              style={{
                padding: "7px 16px", borderRadius: 20, border: "2px solid",
                borderColor: mode === m ? "#1d4ed8" : "#e7e5e4",
                background: mode === m ? "#1d4ed8" : "#fff",
                color: mode === m ? "#fff" : "#57534e",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>
              {m === "fast" ? "⚡ Fast" : "🔬 Deep"}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
          {mode === "fast" ? "URL pattern matching only. No AI spend." : "AI identity analysis. Slower, higher accuracy."}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 0, marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ {error}
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, color: "#1d4ed8" }}>
          <span style={{ marginRight: 8 }}>⏳</span>{PROGRESS_MSGS[progressIdx]}
          <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>
            Resolving IG identity for each seed — may take 20–60s.
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => onRun({
            inputText, mode,
            maxCandidatesPerSeed: maxCandidates,
            defaultEducationType: defaultEduType || undefined,
            dryRun,
          })}
          disabled={loading || lineCount === 0}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: loading || lineCount === 0 ? "#d6d3d1" : "#1d4ed8",
            color: "#fff", fontWeight: 800, fontSize: 14,
            cursor: loading || lineCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Resolving…" : dryRun ? `Parse ${lineCount} Seeds (Dry Run)` : `Import ${lineCount} Seeds`}
        </button>
        <Link href="/admin/studios/prospects?vertical=education"
          style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", textDecoration: "none" }}>
          View Education Prospects →
        </Link>
      </div>
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({
  parsedCount, result,
}: {
  parsedCount: number;
  result: IdentityAssemblerRunResult;
}) {
  const stats = [
    { label: "Seeds parsed",     val: parsedCount,           color: "#1c1917" },
    { label: "IG found",         val: result.totalIgFound,   color: "#1d4ed8" },
    { label: "Prospects saved",  val: result.savedCount,     color: "#15803d" },
    { label: "Failed to save",   val: result.failedToSaveCount, color: result.failedToSaveCount > 0 ? "#b91c1c" : "#a8a29e" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
      {stats.map(({ label, val, color }) => (
        <div key={label} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 90 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
          <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Results table ────────────────────────────────────────────────────────────

function ResultsTable({ results }: { results: IdentityAssemblerResult[] }) {
  const [filterStatus, setFilterStatus] = useState("all");

  const statuses = Array.from(new Set(results.map((r) => r.status)));
  const filtered = filterStatus === "all" ? results : results.filter((r) => r.status === filterStatus);

  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700,
    color: "#78716c", letterSpacing: "0.07em", borderBottom: "1px solid #e7e5e4",
    whiteSpace: "nowrap", background: "#f9f9f8",
  };
  const tdStyle: React.CSSProperties = {
    padding: "8px 10px", fontSize: 12, color: "#57534e",
    borderBottom: "1px solid #f5f5f4", verticalAlign: "middle",
  };
  const selStyle: React.CSSProperties = {
    fontSize: 11, padding: "4px 7px", border: "1px solid #e7e5e4",
    borderRadius: 6, color: "#57534e", background: "#fff",
  };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "#a8a29e", marginLeft: "auto" }}>
          {filtered.length} of {results.length}
        </span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Category", "City/State", "IG Handle", "Conf.", "Candidates", "Status", "Prospect"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#1c1917" }}>
                  {r.seed.name || <span style={{ color: "#a8a29e", fontStyle: "italic" }}>—</span>}
                </td>
                <td style={tdStyle}>
                  {r.seed.category ? (
                    <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>
                      {r.seed.category}
                    </span>
                  ) : (
                    <span style={{ color: "#d6d3d1", fontSize: 11 }}>—</span>
                  )}
                </td>
                <td style={{ ...tdStyle, fontSize: 11 }}>
                  {[r.seed.city, r.seed.state].filter(Boolean).join(", ") || <span style={{ color: "#d6d3d1" }}>—</span>}
                </td>
                <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>
                  {r.igHandleFound ? (
                    <a href={`https://instagram.com/${r.igHandleFound}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#0284c7", textDecoration: "none", fontWeight: 700 }}>
                      @{r.igHandleFound}
                    </a>
                  ) : (
                    <span style={{ color: "#d6d3d1" }}>—</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 700, color: confColor(r.igConfidence) }}>
                    {r.igConfidence || <span style={{ color: "#d6d3d1" }}>—</span>}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <span style={{ fontSize: 11, color: "#78716c" }}>{r.igCandidatesTried}</span>
                </td>
                <td style={tdStyle}><StatusBadge status={r.status} /></td>
                <td style={tdStyle}>
                  {r.prospectId ? (
                    <Link href="/admin/studios/prospects?vertical=education"
                      style={{ fontSize: 10, color: "#1d4ed8", fontWeight: 700, textDecoration: "none" }}>
                      Saved →
                    </Link>
                  ) : r.saveError ? (
                    <span title={r.saveError} style={{ fontSize: 10, color: "#b91c1c", fontWeight: 700, cursor: "help" }}>
                      ⚠ Failed
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: "#d6d3d1" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#a8a29e", fontSize: 13 }}>
            No results match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline summary tab ─────────────────────────────────────────────────────

function PipelineSummary({
  result, runResponse,
}: {
  result: IdentityAssemblerRunResult;
  runResponse: RunResponse;
}) {
  const [debugOpen, setDebugOpen] = useState(false);

  const total = result.totalAttempted || 1;

  function Bar({ label, count, color = "#1d4ed8" }: { label: string; count: number; color?: string }) {
    const pct = Math.round((count / total) * 100);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 160, fontSize: 11, color: "#57534e", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ flex: 1, background: "#f5f5f4", borderRadius: 4, height: 8, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
        </div>
        <div style={{ width: 30, textAlign: "right", fontSize: 11, fontWeight: 700 }}>{count}</div>
        <div style={{ width: 32, fontSize: 10, color: "#a8a29e" }}>{pct}%</div>
      </div>
    );
  }

  // Status breakdown
  const ig_verified  = result.results.filter((r) => r.status === "ig_verified").length;
  const ig_candidate = result.results.filter((r) => r.status === "ig_candidate").length;
  const unresolved   = result.results.filter((r) => r.status === "unresolved").length;

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const r of result.results) {
    const cat = r.seed.category ?? "Uncategorized";
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }

  return (
    <div>
      {/* Run summary */}
      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>RUN SUMMARY</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
          {[
            { label: "Run ID",         val: runResponse.runId.slice(0, 24) + "…" },
            { label: "Seeds parsed",   val: runResponse.parsedCount },
            { label: "Attempted",      val: result.totalAttempted },
            { label: "IG found",       val: result.totalIgFound },
            { label: "Saved",          val: result.savedCount },
            { label: "Failed",         val: result.failedToSaveCount },
            { label: "Before / After", val: `${runResponse.prospectsBeforeCount} / ${runResponse.prospectsAfterCount}` },
            { label: "Delta",          val: `+${runResponse.prospectsAfterCount - runResponse.prospectsBeforeCount}` },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginTop: 2 }}>{String(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status + category breakdowns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>IG STATUS BREAKDOWN</div>
          <Bar label="IG Verified (≥55)"    count={ig_verified}  color="#15803d" />
          <Bar label="IG Candidate (20–54)" count={ig_candidate} color="#d97706" />
          <Bar label="Unresolved"           count={unresolved}   color="#d6d3d1" />
        </div>
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>CATEGORY BREAKDOWN</div>
          {Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <Bar key={cat} label={cat} count={count} color="#1d4ed8" />
          ))}
        </div>
      </div>

      {/* Save errors */}
      {result.saveErrors.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", letterSpacing: "0.07em", marginBottom: 8 }}>FAILED SAVES</div>
          {result.saveErrors.map((e, i) => (
            <div key={i} style={{ fontSize: 11, background: "#fff", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 10px", marginBottom: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{e.handle}</span>
              <span style={{ color: "#b91c1c" }}>{e.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Debug panel */}
      <div style={{ marginBottom: 14 }}>
        <button type="button" onClick={() => setDebugOpen((v) => !v)}
          style={{ fontSize: 10, fontWeight: 700, color: "#78716c", background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
          🔍 Debug Panel {debugOpen ? "▲" : "▼"}
        </button>
        {debugOpen && (
          <div style={{ marginTop: 8, background: "#1c1917", color: "#e7e5e4", borderRadius: 10, padding: "14px 18px", fontSize: 11, fontFamily: "monospace" }}>
            <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em" }}>SAVE DIAGNOSTICS</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", alignItems: "start" }}>
              {([
                ["storePath",            runResponse.storePath],
                ["prospectsBeforeCount", String(runResponse.prospectsBeforeCount)],
                ["prospectsAfterCount",  String(runResponse.prospectsAfterCount)],
                ["delta",               `+${runResponse.prospectsAfterCount - runResponse.prospectsBeforeCount}`],
                ["parsedCount",         String(runResponse.parsedCount)],
                ["savedCount",          String(result.savedCount)],
                ["failedToSaveCount",   String(result.failedToSaveCount)],
                ["totalIgFound",        String(result.totalIgFound)],
                ["runId",               runResponse.runId],
              ] as [string, string][]).map(([k, v]) => (
                <>
                  <span key={`k-${k}`} style={{ color: "#a8a29e", whiteSpace: "nowrap" }}>{k}</span>
                  <span key={`v-${k}`} style={{ color: "#fef3c7", wordBreak: "break-all" }}>{v}</span>
                </>
              ))}
            </div>
            {result.savedHandles.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: "#a8a29e", marginBottom: 4 }}>savedHandles ({result.savedHandles.length})</div>
                <div style={{ color: "#bbf7d0" }}>{result.savedHandles.join(", ")}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#a8a29e" }}>
        All seeds are saved to the Discovered Entities repository.{" "}
        <Link href="/admin/studios/prospects?vertical=education" style={{ color: "#1d4ed8", fontWeight: 700, textDecoration: "none" }}>
          View education prospects →
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EducationSeedsPage() {
  const [loading,      setLoading]      = useState(false);
  const [progressIdx,  setProgressIdx]  = useState(0);
  const [error,        setError]        = useState<string | null>(null);
  const [runData,      setRunData]      = useState<RunResponse | null>(null);
  const [tab,          setTab]          = useState<"results" | "summary">("results");

  async function handleRun(cfg: {
    inputText: string; mode: ResolveMode;
    maxCandidatesPerSeed: number; defaultEducationType?: EducationType; dryRun: boolean;
  }) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setRunData(null);
    setProgressIdx(0);
    setTab("results");

    const interval = setInterval(() => {
      setProgressIdx((i) => (i + 1) % PROGRESS_MSGS.length);
    }, 5000);

    try {
      const res  = await fetch("/api/admin/studios/education-seeds/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(`${data.error}${data.detail ? ` — ${data.detail}` : ""}`);
        return;
      }

      setRunData(data as RunResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px", borderRadius: 20, border: "none",
    background: active ? "#1c1917" : "transparent",
    color: active ? "#fff" : "#78716c",
    fontWeight: 700, fontSize: 12, cursor: "pointer",
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <CreatorIntelligenceNav current="education-seeds" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Education Seed Import
        </h1>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0, maxWidth: 680 }}>
          Paste educator names, IG handles, or URLs to resolve their online identity and save to the prospect repository.
          Supports name-only, CSV, pipe-delimited, and raw handle formats.
        </p>
      </div>

      {/* Input form (pre-run) */}
      {!runData && (
        <SeedImportForm
          onRun={handleRun}
          loading={loading}
          error={error}
          progressIdx={progressIdx}
        />
      )}

      {/* Results */}
      {runData && (
        <>
          {/* Result header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button type="button" onClick={() => setRunData(null)}
              style={{ fontSize: 12, color: "#1d4ed8", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              ← New Import
            </button>
            <span style={{ fontSize: 12, color: "#78716c" }}>
              {runData.parsedCount} seeds · {new Date(runData.processedAt).toLocaleString()}
            </span>
            <Link href="/admin/studios/prospects?vertical=education"
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#1d4ed8", textDecoration: "none" }}>
              View Education Prospects →
            </Link>
          </div>

          {/* Zero-save warning */}
          {runData.parsedCount > 0 && runData.assemblerResult.savedCount === 0 && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2", border: "2px solid #dc2626", borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626", marginBottom: 4 }}>
                ⛔ Zero prospects saved — {runData.parsedCount} seed(s) parsed but none persisted.
              </div>
              <div style={{ fontSize: 11, color: "#b91c1c" }}>
                Store path: <code style={{ fontFamily: "monospace", background: "#fee2e2", padding: "1px 4px", borderRadius: 3 }}>{runData.storePath}</code>
              </div>
            </div>
          )}

          <SummaryCards parsedCount={runData.parsedCount} result={runData.assemblerResult} />

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#f5f5f4", borderRadius: 24, padding: 4, width: "fit-content" }}>
            <button type="button" style={tabStyle(tab === "results")} onClick={() => setTab("results")}>
              Results ({runData.assemblerResult.results.length})
            </button>
            <button type="button" style={tabStyle(tab === "summary")} onClick={() => setTab("summary")}>
              📊 Pipeline Summary
            </button>
          </div>

          {tab === "results" && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 8 }}>
                RESOLVED SEEDS
              </div>
              <ResultsTable results={runData.assemblerResult.results} />
            </>
          )}

          {tab === "summary" && (
            <PipelineSummary result={runData.assemblerResult} runResponse={runData} />
          )}
        </>
      )}

      <div style={{ marginTop: 20, fontSize: 11, color: "#d6d3d1", textAlign: "right" }}>
        Education Seed Import · Admin only · Education vertical · Not visible to members
      </div>
    </div>
  );
}
