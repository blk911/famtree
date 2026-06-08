"use client";
// app/(app)/admin/studios/education-directory/page.tsx
// Education Directory Import — admin-only.
// Paste directory rows / URLs / text blocks, parse, resolve IG, save to Prospects.

import { useState } from "react";
import Link from "next/link";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { IntelligenceContextBadge } from "@/components/admin/IntelligenceContextBadge";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import type {
  IdentityAssemblerResult,
  IdentityAssemblerRunResult,
} from "@/lib/studios/identity-seeds/types";
import type {
  ParsedDirectoryEntry,
  DirectoryRunResponse,
} from "@/lib/studios/education-directory/types";
import {
  EDUCATION_TYPE_LABELS,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confColor(n: number) {
  if (n >= 55) return "#15803d";
  if (n >= 20) return "#d97706";
  return "#dc2626";
}

function EduBadge({ type }: { type: string | null }) {
  if (!type) return <span style={{ color: "#d6d3d1", fontSize: 10 }}>—</span>;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
      background: "#dbeafe", color: "#1d4ed8",
      borderRadius: 20, padding: "2px 7px", whiteSpace: "nowrap",
    }}>
      {EDUCATION_TYPE_LABELS[type as keyof typeof EDUCATION_TYPE_LABELS] ?? type}
    </span>
  );
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

const FORMAT_LABELS: Record<string, string> = {
  pipe: "Pipe", csv: "CSV", dash: "Dash", handle: "Handle",
  url: "URL", text_block: "Text", name_only: "Name",
};

const PROGRESS_MSGS = [
  "Parsing directory entries…",
  "Generating IG handle candidates…",
  "Running identity resolver…",
  "Matching booking profiles…",
  "Upserting prospect records…",
  "Finalising…",
];

const PLACEHOLDER = `# Paste directory rows — one per line. Formats:
# Pipe:   Name | City ST | Category | URL
# CSV:    Name, City, ST, Category, URL
# Dash:   Name - City ST - Category
# Handle: @ighandle
# URL:    https://...
# Text:   Any freeform description

BrightPath Microschool | Castle Rock CO | microschool | https://brightpath.example
Sarah Wilson Math Tutoring | Denver CO | math tutor | https://example.com/sarah
Classical Learning Co-op - Parker CO - classical education
@denvermathmom
Denver Dyslexia Tutor | Denver CO | dyslexia tutor`;

// ─── Input form ───────────────────────────────────────────────────────────────

function DirectoryInputForm({
  onRun, loading, error, progressIdx,
}: {
  onRun: (cfg: { inputText: string; mode: ResolveMode; maxCandidatesPerSeed: number; dryRun: boolean }) => void;
  loading: boolean;
  error: string | null;
  progressIdx: number;
}) {
  const [inputText,     setInputText]     = useState("");
  const [mode,          setMode]          = useState<ResolveMode>("fast");
  const [maxCandidates, setMaxCandidates] = useState(8);
  const [dryRun,        setDryRun]        = useState(false);

  const lineCount = inputText.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 8,
    fontSize: 13, color: "#1c1917", background: "#fff", boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 16 }}>
        DIRECTORY INPUT
      </div>

      {/* Textarea */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
          DIRECTORY ENTRIES
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={PLACEHOLDER}
          disabled={loading}
          rows={10}
          style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12, resize: "vertical", lineHeight: "1.6", minHeight: 180 }}
        />
        <div style={{ fontSize: 10, color: "#a8a29e", marginTop: 4 }}>
          {lineCount} active line{lineCount !== 1 ? "s" : ""} · Lines starting with # are comments
        </div>
      </div>

      {/* Options row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            MAX CANDIDATES / SEED
          </label>
          <select value={maxCandidates} onChange={(e) => setMaxCandidates(Number(e.target.value))} style={inputStyle} disabled={loading}>
            {[4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={loading} style={{ width: 15, height: 15 }} />
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
                borderColor: mode === m ? "#166534" : "#e7e5e4",
                background: mode === m ? "#166534" : "#fff",
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

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13, color: "#166534" }}>
          ⏳ {PROGRESS_MSGS[progressIdx]}
          <div style={{ fontSize: 11, color: "#86efac", marginTop: 4 }}>Resolving IG identity for each entry — may take 20–60s.</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => onRun({ inputText, mode, maxCandidatesPerSeed: maxCandidates, dryRun })}
          disabled={loading || lineCount === 0}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: loading || lineCount === 0 ? "#d6d3d1" : "#166534",
            color: "#fff", fontWeight: 800, fontSize: 14,
            cursor: loading || lineCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Processing…" : dryRun ? `Parse ${lineCount} Entries (Dry Run)` : `Import ${lineCount} Entries`}
        </button>
        <Link href="/admin/studios/prospects?vertical=education"
          style={{ fontSize: 12, fontWeight: 700, color: "#166534", textDecoration: "none" }}>
          View Education Prospects →
        </Link>
      </div>
    </div>
  );
}

// ─── Parsed seeds preview ─────────────────────────────────────────────────────

function ParsedPreview({ entries }: { entries: ParsedDirectoryEntry[] }) {
  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "7px 10px", fontSize: 10, fontWeight: 700,
    color: "#78716c", letterSpacing: "0.07em", borderBottom: "1px solid #e7e5e4",
    background: "#f9f9f8",
  };
  const tdStyle: React.CSSProperties = {
    padding: "7px 10px", fontSize: 11, color: "#57534e",
    borderBottom: "1px solid #f5f5f4", verticalAlign: "middle",
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflowX: "auto", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", background: "#f9f9f8", borderBottom: "1px solid #e7e5e4", fontSize: 10, fontWeight: 700, color: "#78716c", letterSpacing: "0.08em" }}>
        PARSED ENTRIES PREVIEW — {entries.length} entries
      </div>
      <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Format", "Name", "Location", "Category", "Edu Type", "Handle/URL", "Warnings"].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 30).map((e, i) => (
            <tr key={i} style={{ background: e.warnings.length > 0 ? "#fffbeb" : "transparent" }}>
              <td style={tdStyle}>
                <span style={{ fontSize: 9, background: "#f0fdf4", color: "#166534", borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>
                  {FORMAT_LABELS[e.format] ?? e.format}
                </span>
              </td>
              <td style={{ ...tdStyle, fontWeight: 600, color: "#1c1917", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.name ?? <span style={{ color: "#d6d3d1", fontStyle: "italic" }}>—</span>}
              </td>
              <td style={{ ...tdStyle, fontSize: 10 }}>
                {[e.city, e.state].filter(Boolean).join(", ") || <span style={{ color: "#d6d3d1" }}>—</span>}
              </td>
              <td style={{ ...tdStyle, fontSize: 10 }}>
                {e.category || <span style={{ color: "#d6d3d1" }}>—</span>}
              </td>
              <td style={tdStyle}>
                <EduBadge type={e.educationType} />
              </td>
              <td style={{ ...tdStyle, fontSize: 10, fontFamily: "monospace" }}>
                {e.handle ? (
                  <span style={{ color: "#0284c7" }}>@{e.handle}</span>
                ) : e.websiteUrl ? (
                  <a href={e.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#0284c7", textDecoration: "none" }}>
                    {e.websiteUrl.slice(0, 30)}…
                  </a>
                ) : (
                  <span style={{ color: "#d6d3d1" }}>—</span>
                )}
              </td>
              <td style={{ ...tdStyle, fontSize: 10 }}>
                {e.warnings.length > 0 ? (
                  <span style={{ color: "#b45309" }}>⚠ {e.warnings[0]}</span>
                ) : (
                  <span style={{ color: "#d6d3d1" }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length > 30 && (
        <div style={{ padding: "8px 16px", fontSize: 11, color: "#a8a29e", borderTop: "1px solid #f5f5f4" }}>
          Showing first 30 of {entries.length} entries.
        </div>
      )}
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ parsed, result }: { parsed: number; result: IdentityAssemblerRunResult }) {
  const stats = [
    { label: "Parsed",         val: parsed,                 color: "#1c1917" },
    { label: "IG found",       val: result.totalIgFound,    color: "#1d4ed8" },
    { label: "Saved",          val: result.savedCount,      color: "#15803d" },
    { label: "Failed to save", val: result.failedToSaveCount, color: result.failedToSaveCount > 0 ? "#b91c1c" : "#a8a29e" },
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
    background: "#f9f9f8",
  };
  const tdStyle: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#57534e", borderBottom: "1px solid #f5f5f4", verticalAlign: "middle" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ fontSize: 11, padding: "4px 7px", border: "1px solid #e7e5e4", borderRadius: 6, color: "#57534e", background: "#fff" }}>
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "#a8a29e", marginLeft: "auto" }}>{filtered.length} of {results.length}</span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Location", "Category", "IG Handle", "Conf.", "Cands.", "Status", "Best Match", "Prospect"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const seed = r.seed;
              const loc  = [seed.city, seed.state].filter(Boolean).join(", ");
              return (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "#1c1917", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {seed.name || <span style={{ color: "#a8a29e", fontStyle: "italic" }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>{loc || <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                  <td style={{ ...tdStyle, fontSize: 10 }}>
                    {seed.category ? (
                      <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 20, padding: "2px 7px", fontWeight: 700, fontSize: 9 }}>
                        {seed.category}
                      </span>
                    ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>
                    {r.igHandleFound ? (
                      <a href={`https://instagram.com/${r.igHandleFound}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#0284c7", textDecoration: "none", fontWeight: 700 }}>
                        @{r.igHandleFound}
                      </a>
                    ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: confColor(r.igConfidence) }}>
                      {r.igConfidence || <span style={{ color: "#d6d3d1" }}>—</span>}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}><span style={{ fontSize: 11 }}>{r.igCandidatesTried}</span></td>
                  <td style={tdStyle}><StatusBadge status={r.status} /></td>
                  <td style={{ ...tdStyle, fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {seed.knownUrls && seed.knownUrls.length > 0 ? (
                      <a href={seed.knownUrls[0].url} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#0284c7", textDecoration: "none" }}>
                        {seed.knownUrls[0].platform} ↗
                      </a>
                    ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    {r.prospectId ? (
                      <Link href="/admin/studios/prospects?vertical=education"
                        style={{ fontSize: 10, color: "#166534", fontWeight: 700, textDecoration: "none" }}>
                        Saved →
                      </Link>
                    ) : r.saveError ? (
                      <span title={r.saveError} style={{ fontSize: 10, color: "#b91c1c", fontWeight: 700, cursor: "help" }}>⚠ Failed</span>
                    ) : (
                      <span style={{ fontSize: 10, color: "#d6d3d1" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "28px 0", color: "#a8a29e", fontSize: 13 }}>No results match the filter.</div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline summary tab ─────────────────────────────────────────────────────

function PipelineSummary({ result, runData }: { result: IdentityAssemblerRunResult; runData: DirectoryRunResponse }) {
  const [debugOpen, setDebugOpen] = useState(false);
  const total = result.totalAttempted || 1;

  function Bar({ label, count, color = "#166534" }: { label: string; count: number; color?: string }) {
    const pct = Math.round((count / total) * 100);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 160, fontSize: 11, color: "#57534e", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ flex: 1, background: "#f5f5f4", borderRadius: 4, height: 8, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
        </div>
        <div style={{ width: 30, textAlign: "right", fontSize: 11, fontWeight: 700 }}>{count}</div>
        <div style={{ width: 32, fontSize: 10, color: "#a8a29e" }}>{pct}%</div>
      </div>
    );
  }

  const ig_verified  = result.results.filter((r) => r.status === "ig_verified").length;
  const ig_candidate = result.results.filter((r) => r.status === "ig_candidate").length;
  const unresolved   = result.results.filter((r) => r.status === "unresolved").length;

  // EduType breakdown
  const eduMap = new Map<string, number>();
  for (const r of result.results) {
    const t = (r.seed.educationType as string) ?? "unknown";
    eduMap.set(t, (eduMap.get(t) ?? 0) + 1);
  }

  // Audience breakdown
  const audMap = new Map<string, number>();
  for (const r of result.results) {
    const a = (r.seed.audienceType as string) ?? "unknown";
    audMap.set(a, (audMap.get(a) ?? 0) + 1);
  }

  // City breakdown
  const cityMap = new Map<string, number>();
  for (const r of result.results) {
    const c = [r.seed.city, r.seed.state].filter(Boolean).join(", ") || "Unknown";
    cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
  }

  return (
    <div>
      {/* Run summary row */}
      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>RUN SUMMARY</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
          {[
            { label: "Run ID",       val: runData.runId.slice(0, 24) + "…" },
            { label: "Parsed",       val: runData.parsedCount },
            { label: "Attempted",    val: result.totalAttempted },
            { label: "IG found",     val: result.totalIgFound },
            { label: "Saved",        val: result.savedCount },
            { label: "Failed",       val: result.failedToSaveCount },
            { label: "Before/After", val: `${runData.prospectsBeforeCount}/${runData.prospectsAfterCount}` },
            { label: "Delta",        val: `+${runData.prospectsAfterCount - runData.prospectsBeforeCount}` },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginTop: 2 }}>{String(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdowns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>IG STATUS</div>
          <Bar label="IG Verified (≥55)"    count={ig_verified}  color="#15803d" />
          <Bar label="IG Candidate (20–54)" count={ig_candidate} color="#d97706" />
          <Bar label="Unresolved"           count={unresolved}   color="#d6d3d1" />
        </div>
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>EDUCATION TYPE</div>
          {Array.from(eduMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => (
            <Bar key={t} label={EDUCATION_TYPE_LABELS[t as keyof typeof EDUCATION_TYPE_LABELS] ?? t} count={n} color="#166534" />
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>AUDIENCE TYPE</div>
          {Array.from(audMap.entries()).sort((a, b) => b[1] - a[1]).map(([a, n]) => (
            <Bar key={a} label={a} count={n} color="#1d4ed8" />
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>CITY / STATE</div>
          {Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => (
            <Bar key={c} label={c} count={n} color="#9d174d" />
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
                ["storePath",            runData.storePath],
                ["prospectsBeforeCount", String(runData.prospectsBeforeCount)],
                ["prospectsAfterCount",  String(runData.prospectsAfterCount)],
                ["delta",               `+${runData.prospectsAfterCount - runData.prospectsBeforeCount}`],
                ["parsedCount",         String(runData.parsedCount)],
                ["savedCount",          String(result.savedCount)],
                ["failedToSaveCount",   String(result.failedToSaveCount)],
                ["totalIgFound",        String(result.totalIgFound)],
                ["runId",               runData.runId],
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
        All entries saved to the Discovered Entities repository.{" "}
        <Link href="/admin/studios/prospects?vertical=education" style={{ color: "#166534", fontWeight: 700, textDecoration: "none" }}>
          View education prospects →
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EducationDirectoryPage() {
  const [loading,     setLoading]     = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [error,       setError]       = useState<string | null>(null);
  const [runData,     setRunData]     = useState<DirectoryRunResponse | null>(null);
  const [tab,         setTab]         = useState<"preview" | "results" | "summary">("preview");

  async function handleRun(cfg: { inputText: string; mode: ResolveMode; maxCandidatesPerSeed: number; dryRun: boolean }) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setRunData(null);
    setProgressIdx(0);
    setTab("preview");

    const interval = setInterval(() => setProgressIdx((i) => (i + 1) % PROGRESS_MSGS.length), 5000);

    try {
      const res  = await fetch("/api/admin/studios/education-directory/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(`${data.error}${data.detail ? ` — ${data.detail}` : ""}`);
        return;
      }

      setRunData(data as DirectoryRunResponse);
      setTab("preview");
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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <MarketIntelChrome showDiscoveryFlow />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Education Directory Import
        </h1>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0, maxWidth: 680 }}>
          Paste directory rows, URLs, or text blocks describing educators and education programs.
          Supports pipe, CSV, dash, handle, and freeform formats.
          Resolves IG identity and saves to the prospect repository.
        </p>
        <IntelligenceContextBadge
          verticalLabel="Education (legacy tool)"
          dataScope="Education prospects only"
        />
      </div>

      {!runData && (
        <DirectoryInputForm
          onRun={handleRun}
          loading={loading}
          error={error}
          progressIdx={progressIdx}
        />
      )}

      {runData && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button type="button" onClick={() => setRunData(null)}
              style={{ fontSize: 12, color: "#166534", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              ← New Import
            </button>
            <span style={{ fontSize: 12, color: "#78716c" }}>
              {runData.parsedCount} entries · {new Date(runData.processedAt).toLocaleString()}
            </span>
            <Link href="/admin/studios/prospects?vertical=education"
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#166534", textDecoration: "none" }}>
              View Education Prospects →
            </Link>
          </div>

          {/* Zero-save warning */}
          {runData.parsedCount > 0 && runData.assemblerResult.savedCount === 0 && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2", border: "2px solid #dc2626", borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626", marginBottom: 4 }}>
                ⛔ Zero prospects saved — {runData.parsedCount} entr{runData.parsedCount === 1 ? "y" : "ies"} parsed but none persisted.
              </div>
              <div style={{ fontSize: 11, color: "#b91c1c" }}>
                Store path: <code style={{ fontFamily: "monospace", background: "#fee2e2", padding: "1px 4px", borderRadius: 3 }}>{runData.storePath}</code>
              </div>
            </div>
          )}

          <SummaryCards parsed={runData.parsedCount} result={runData.assemblerResult} />

          <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#f5f5f4", borderRadius: 24, padding: 4, width: "fit-content" }}>
            <button type="button" style={tabStyle(tab === "preview")}  onClick={() => setTab("preview")}>
              Parsed Preview ({runData.entries.length})
            </button>
            <button type="button" style={tabStyle(tab === "results")}  onClick={() => setTab("results")}>
              Results ({runData.assemblerResult.results.length})
            </button>
            <button type="button" style={tabStyle(tab === "summary")}  onClick={() => setTab("summary")}>
              📊 Pipeline Summary
            </button>
          </div>

          {tab === "preview" && <ParsedPreview entries={runData.entries} />}
          {tab === "results" && <ResultsTable results={runData.assemblerResult.results} />}
          {tab === "summary" && <PipelineSummary result={runData.assemblerResult} runData={runData} />}
        </>
      )}

      <div style={{ marginTop: 20, fontSize: 11, color: "#d6d3d1", textAlign: "right" }}>
        Education Directory Import · Admin only · Education vertical · Not visible to members
      </div>
    </div>
  );
}
