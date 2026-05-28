"use client";
// app/(app)/admin/studios/styleseat/page.tsx
// StyleSeat Discovery — admin-only. Not public. Not member-facing.
// Harvests independent beauty operators from StyleSeat → IG enrichment → prospect store.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import {
  STYLESEAT_CATEGORY_LABELS,
  STYLESEAT_STATUS_LABELS,
  STYLESEAT_STATUS_COLORS,
  type StyleSeatCategory,
  type StyleSeatDiscoveryMode,
  type StyleSeatOperator,
  type StyleSeatResolverResult,
  type StyleSeatHarvestRun,
  type StyleSeatPipelineMode,
  type StyleSeatRunResponse,
  type StyleSeatErrorResponse,
  type StyleSeatListResponse,
  type StyleSeatDetailResponse,
  type StyleSeatIntelligenceReport,
  type StyleSeatExtractionDiagnosticSummary,
} from "@/lib/studios/styleseat/types";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confColor(n: number) {
  if (n >= 55) return "#15803d";
  if (n >= 25) return "#d97706";
  return "#dc2626";
}

function StatusChip({ status }: { status: import("@/lib/studios/styleseat/types").StyleSeatOperatorStatus }) {
  const c = STYLESEAT_STATUS_COLORS[status] ?? { bg: "#f5f5f4", fg: "#78716c" };
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
      background: c.bg, color: c.fg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {STYLESEAT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

const ALL_CATEGORIES: StyleSeatCategory[] = [
  "hair", "braids", "barber", "locs", "makeup", "lashes", "brows", "nails", "extensions",
];

const PROGRESS_MSGS = [
  "Connecting to StyleSeat…",
  "Harvesting operator listings…",
  "Extracting business profiles…",
  "Generating IG handle candidates…",
  "Running IG resolver pipeline…",
  "Matching booking profiles…",
  "Upserting prospect records…",
  "Finalising run…",
];

type StyleSeatPageRunData = {
  run: StyleSeatHarvestRun;
  operators: StyleSeatOperator[];
  results: StyleSeatResolverResult[];
  crawl?: import("@/lib/studios/styleseat/types").StyleSeatCrawlResult | null;
  raw?: StyleSeatOperator[];
  normalized?: unknown[];
  prospects?: unknown[];
  failures?: unknown[];
  log?: unknown[];
  intelligence?: StyleSeatIntelligenceReport | null;
  diagnosticSummary?: StyleSeatExtractionDiagnosticSummary;
};

// ─── Run form ─────────────────────────────────────────────────────────────────

function RunForm({
  onRun,
  loading,
  error,
  progressIdx,
}: {
  onRun: (config: {
    debug?: boolean;
    discoveryMode: StyleSeatDiscoveryMode;
    sourceUrl?: string;
    city?: string; state: string;
    categories: StyleSeatCategory[];
    maxOperators: number; crawlDepth: number;
    pipelineMode: StyleSeatPipelineMode; resolverMode: ResolveMode;
  }) => void;
  loading: boolean;
  error: string | null;
  progressIdx: number;
}) {
  const [market, setMarket]           = useState("");
  const [state, setState]             = useState("");
  const [discoveryMode, setDiscoveryMode] = useState<StyleSeatDiscoveryMode>("aggregator_crawl");
  const [sourceUrl, setSourceUrl] = useState("https://www.styleseat.com/m/");
  const [debugExtraction, setDebugExtraction] = useState(false);
  const [crawlDepth, setCrawlDepth] = useState(2);
  const [categories, setCategories]   = useState<StyleSeatCategory[]>(["braids", "hair"]);
  const [maxOperators, setMaxOperators]   = useState(25);
  const [resolverMode, setResolverMode] = useState<ResolveMode>("fast");

  function toggleCategory(cat: StyleSeatCategory) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function selectDiscoveryMode(mode: StyleSeatDiscoveryMode) {
    setDiscoveryMode(mode);
    if (mode === "aggregator_crawl") setSourceUrl("https://www.styleseat.com/m/");
    if (mode === "direct_url") setSourceUrl("");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 8,
    fontSize: 13, color: "#1c1917", background: "#fff", boxSizing: "border-box",
  };
  const actionsDisabled = loading
    || (discoveryMode === "market_search" && (!market || !state))
    || (discoveryMode === "direct_url" && !sourceUrl);

  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 16 }}>
        DISCOVERY SOURCE
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {([
          ["Aggregator Crawl", "aggregator_crawl"],
          ["Direct URL", "direct_url"],
          ["Market Search", "market_search"],
        ] as [string, StyleSeatDiscoveryMode][]).map(([label, mode]) => (
          <button
            key={mode}
            type="button"
            onClick={() => selectDiscoveryMode(mode)}
            disabled={loading}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: "2px solid",
              borderColor: discoveryMode === mode ? "#9d174d" : "#e7e5e4",
              background: discoveryMode === mode ? "#9d174d" : "#fff",
              color: discoveryMode === mode ? "#fff" : "#57534e",
              fontSize: 12,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {discoveryMode !== "market_search" && (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
              {discoveryMode === "direct_url" ? "PASTE STYLESEAT URL" : "START URL"}
            </label>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.styleseat.com/m/" style={inputStyle} disabled={loading} />
            {discoveryMode === "aggregator_crawl" && (
              <div style={{ marginTop: 7, fontSize: 11, color: "#78716c", lineHeight: 1.45 }}>
                Aggregator root may not expose profiles. For reliable pulls, use Direct URL with a StyleSeat search URL.
                <div style={{ color: "#9d174d", fontWeight: 700, marginTop: 2 }}>
                  https://www.styleseat.com/m/search/denver-co/braids
                </div>
              </div>
            )}
          </div>
        )}

        {discoveryMode === "market_search" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
                CITY
              </label>
              <input value={market} onChange={(e) => setMarket(e.target.value)}
                placeholder="City" style={inputStyle} disabled={loading} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
                STATE
              </label>
              <input value={state} onChange={(e) => setState(e.target.value)}
                placeholder="State" style={{ ...inputStyle }} disabled={loading} maxLength={2} />
            </div>
          </>
        )}

        {/* Categories */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 8 }}>
            CATEGORIES
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_CATEGORIES.map((cat) => {
              const active = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  disabled={loading}
                  style={{
                    padding: "5px 13px", borderRadius: 20, border: "2px solid",
                    borderColor: active ? "#9d174d" : "#e7e5e4",
                    background: active ? "#fce7f3" : "#fff",
                    color: active ? "#9d174d" : "#78716c",
                    fontWeight: active ? 700 : 500, fontSize: 12, cursor: "pointer",
                  }}
                >
                  {STYLESEAT_CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
          {categories.length === 0 && (
            <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>Optional. The crawler will infer categories from profile content.</div>
          )}
        </div>

        {discoveryMode !== "market_search" && (
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
              CRAWL DEPTH
            </label>
            <select value={crawlDepth} onChange={(e) => setCrawlDepth(Number(e.target.value))}
              style={inputStyle} disabled={loading}>
              {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        {/* Max operators */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            MAX OPERATORS
          </label>
          <select value={maxOperators} onChange={(e) => setMaxOperators(Number(e.target.value))}
            style={inputStyle} disabled={loading}>
            {[5, 10, 25, 50, 75, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Resolver mode */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            IG RESOLVER MODE
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["fast", "deep"] as ResolveMode[]).map((m) => (
              <button key={m} type="button" onClick={() => setResolverMode(m)} disabled={loading}
                style={{
                  padding: "7px 16px", borderRadius: 20, border: "2px solid",
                  borderColor: resolverMode === m ? "#9d174d" : "#e7e5e4",
                  background: resolverMode === m ? "#9d174d" : "#fff",
                  color: resolverMode === m ? "#fff" : "#57534e",
                  fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}>
                {m === "fast" ? "Fast" : "Deep"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
            {resolverMode === "fast" ? "URL pattern matching only. No AI spend." : "AI identity analysis. Slower, higher accuracy."}
          </div>
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 12, fontWeight: 800, color: "#57534e" }}>
        <input
          type="checkbox"
          checked={debugExtraction}
          onChange={(e) => setDebugExtraction(e.target.checked)}
          disabled={loading}
        />
        Debug Extraction
      </label>

      <div style={{ marginTop: 16, padding: "12px 14px", background: "#fafaf9", border: "1px solid #e7e5e4", borderRadius: 10, fontSize: 11, color: "#57534e" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 6 }}>RUN PLAN PREVIEW</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <span><strong>Mode:</strong> {discoveryMode.replace(/_/g, " ")}</span>
          <span><strong>Seed:</strong> {discoveryMode === "market_search" ? `${market}, ${state}` : sourceUrl}</span>
          <span><strong>Max:</strong> {maxOperators}</span>
          <span><strong>Depth:</strong> {discoveryMode === "market_search" ? "market results" : crawlDepth}</span>
          <span><strong>Resolver:</strong> {resolverMode}</span>
          <span><strong>Debug:</strong> {debugExtraction ? "on" : "off"}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ {error}
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#f5f5f4", borderRadius: 8, fontSize: 13, color: "#57534e" }}>
          <span style={{ marginRight: 8 }}>...</span>{PROGRESS_MSGS[progressIdx]}
          <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
            This can take 30–90s. Harvesting StyleSeat listings, then running IG resolver on each operator.
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center", flexWrap: "wrap" }}>
        {([
          ["Run Harvest", "harvest_only"],
          ["Run + IG Resolve", "harvest_and_resolve"],
          ["Run Full Pipeline", "full_pipeline"],
        ] as [string, StyleSeatPipelineMode][]).map(([label, pipelineMode], idx) => (
          <button
            key={pipelineMode}
            type="button"
            onClick={() => onRun({ debug: debugExtraction, discoveryMode, sourceUrl, city: market, state, categories, maxOperators, crawlDepth, pipelineMode, resolverMode })}
            disabled={actionsDisabled}
            style={{
              padding: "10px 18px", borderRadius: 10, border: idx === 0 ? "1px solid #e7e5e4" : "none",
              background: actionsDisabled ? "#d6d3d1" : idx === 0 ? "#fff" : "#1c1917",
              color: actionsDisabled ? "#fff" : idx === 0 ? "#57534e" : "#fff",
              fontWeight: 800, fontSize: 14,
              cursor: actionsDisabled ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Running..." : label}
          </button>
        ))}
        <Link href="/admin/studios/prospects?vertical=beauty"
          style={{ fontSize: 12, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
          View Beauty Prospects →
        </Link>
      </div>
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ run }: { run: StyleSeatHarvestRun }) {
  const stats = [
    { label: "Operators found",  val: run.totalHarvested,  color: "#1c1917" },
    { label: "IG matches",       val: run.totalIgFound,    color: "#1d4ed8" },
    { label: "Resolved",         val: run.totalResolved,   color: "#15803d" },
    { label: "Prospects saved",  val: run.totalProspects,  color: "#9d174d" },
    { label: "Failed to save",   val: run.failedToSaveCount, color: run.failedToSaveCount > 0 ? "#b91c1c" : "#a8a29e" },
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

function DiagnosticSummaryCard({ summary }: { summary?: StyleSeatExtractionDiagnosticSummary }) {
  if (!summary) return null;
  return (
    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#c2410c", letterSpacing: "0.08em", marginBottom: 8 }}>
        EXTRACTION DIAGNOSTICS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, fontSize: 12, color: "#7c2d12" }}>
        <span><strong>Likely source:</strong> {summary.likelyExtractionSource.replace(/_/g, " ")}</span>
        <span><strong>Profile-like links:</strong> {summary.profileLikeLinkCount}</span>
        <span><strong>Embedded candidates:</strong> {summary.embeddedCandidateCount}</span>
        <span><strong>Network hints:</strong> {summary.networkHintCount}</span>
      </div>
      {summary.recommendation && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#9a3412" }}>
          <strong>Recommendation:</strong> {summary.recommendation}
        </div>
      )}
      {summary.debugArtifactPath && (
        <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 11, color: "#9a3412", wordBreak: "break-all" }}>
          {summary.debugArtifactPath}
        </div>
      )}
    </div>
  );
}

// ─── Expanded operator detail ─────────────────────────────────────────────────

function OperatorDetail({ result }: { result: StyleSeatResolverResult }) {
  const { operator } = result;
  const tdStyle: React.CSSProperties = { padding: "4px 0", fontSize: 11, color: "#57534e" };
  const lStyle: React.CSSProperties  = { fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em" };

  return (
    <div style={{ padding: "14px 18px", background: "#fafaf9", borderTop: "1px solid #f0ede8",
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, fontSize: 12 }}>
      {/* Left */}
      <div>
        <div style={lStyle}>STYLESEAT PROFILE</div>
        <a href={operator.styleseatUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: "block", color: "#0284c7", textDecoration: "none", marginBottom: 8, fontSize: 11 }}>
          {operator.styleseatUrl}
        </a>

        {operator.bio && (
          <div style={{ marginBottom: 8 }}>
            <div style={lStyle}>BIO</div>
            <div style={{ ...tdStyle, fontStyle: "italic", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 5, padding: "5px 9px" }}>
              "{operator.bio.slice(0, 160)}"
            </div>
          </div>
        )}

        {operator.services.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={lStyle}>SERVICES</div>
            {operator.services.slice(0, 4).map((s, i) => (
              <div key={i} style={{ ...tdStyle }}>
                {s.name}{s.price ? ` — $${s.price}` : ""}
              </div>
            ))}
          </div>
        )}

        {operator.specialties.length > 0 && (
          <div>
            <div style={lStyle}>SPECIALTIES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {operator.specialties.map((sp) => (
                <span key={sp} style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                  {sp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right */}
      <div>
        <div style={lStyle}>IG RESOLUTION</div>
        <div style={{ marginBottom: 8 }}>
          <div style={tdStyle}>Candidates tried: {result.igCandidatesTried}</div>
          {result.igHandleFound && (
            <a href={`https://instagram.com/${result.igHandleFound}`} target="_blank" rel="noopener noreferrer"
              style={{ color: "#0284c7", textDecoration: "none", fontWeight: 700, fontSize: 12 }}>
              @{result.igHandleFound} ↗
            </a>
          )}
          {!result.igHandleFound && <div style={{ color: "#a8a29e", fontSize: 11 }}>No IG handle found</div>}
        </div>

        {result.bestMatchUrl && (
          <div style={{ marginBottom: 8 }}>
            <div style={lStyle}>BEST BOOKING MATCH</div>
            <a href={result.bestMatchUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: "#0284c7", textDecoration: "none", fontSize: 11 }}>
              {result.bestMatchPlatform} — {result.bestMatchUrl.slice(0, 55)}…
            </a>
          </div>
        )}

        {result.notes && (
          <div style={{ marginBottom: 8 }}>
            <div style={lStyle}>RESOLVER NOTES</div>
            <div style={{ ...tdStyle }}>{result.notes}</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {result.prospectId && (
            <Link href="/admin/studios/prospects?vertical=beauty"
              style={{ fontSize: 11, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
              View in Discovered Entities →
            </Link>
          )}
          {result.bestMatchUrl && (
            <a href={`/admin/studios/creator-lab?url=${encodeURIComponent(result.bestMatchUrl)}`}
              style={{ fontSize: 11, fontWeight: 700, color: "#78716c", textDecoration: "none" }}>
              Assemble in Studio Assembler →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Operators table ──────────────────────────────────────────────────────────

function OperatorsTable({
  results,
}: {
  results: StyleSeatResolverResult[];
}) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const categories = Array.from(new Set(results.flatMap((r) => r.operator.categories))).sort();
  const statuses   = Array.from(new Set(results.map((r) => r.status))).sort();

  let filtered = [...results];
  if (filterCat    !== "all") filtered = filtered.filter((r) => r.operator.categories.includes(filterCat as StyleSeatCategory));
  if (filterStatus !== "all") filtered = filtered.filter((r) => r.status === filterStatus);

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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={selStyle}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{STYLESEAT_CATEGORY_LABELS[c as StyleSeatCategory] ?? c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{STYLESEAT_STATUS_LABELS[s as keyof typeof STYLESEAT_STATUS_LABELS] ?? s}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "#a8a29e", marginLeft: "auto" }}>
          {filtered.length} of {results.length}
        </span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "City", "Category", "Reviews", "StyleSeat", "IG Handle", "Conf.", "Status", "Prospect"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((result) => {
              const { operator } = result;
              const isExpanded   = expandedSlug === operator.slug;

              return (
                <>
                  <tr key={operator.slug}
                    onClick={() => setExpandedSlug(isExpanded ? null : operator.slug)}
                    style={{ cursor: "pointer", background: isExpanded ? "#fdf2f8" : "transparent" }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#1c1917", fontSize: 12 }}>
                      {operator.name}
                    </td>
                    <td style={tdStyle}>{operator.city}</td>
                    <td style={tdStyle}>
                      {operator.categories.map((c) => (
                        <span key={c} style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d", borderRadius: 20, padding: "2px 7px", fontWeight: 700, marginRight: 3 }}>
                          {STYLESEAT_CATEGORY_LABELS[c]}
                        </span>
                      ))}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: operator.reviewCount >= 20 ? "#15803d" : "#57534e" }}>
                        {operator.reviewCount}
                      </span>
                      {operator.rating && (
                        <span style={{ fontSize: 10, color: "#a8a29e", marginLeft: 4 }}>★{operator.rating}</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <a href={operator.styleseatUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 10, color: "#0284c7", textDecoration: "none" }}>
                        → SS
                      </a>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>
                      {result.igHandleFound ? (
                        <a href={`https://instagram.com/${result.igHandleFound}`} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "#0284c7", textDecoration: "none", fontWeight: 700 }}>
                          @{result.igHandleFound}
                        </a>
                      ) : (
                        <span style={{ color: "#d6d3d1" }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: confColor(result.igConfidence) }}>
                        {result.igConfidence || <span style={{ color: "#d6d3d1" }}>—</span>}
                      </span>
                    </td>
                    <td style={tdStyle}><StatusChip status={result.status} /></td>
                    <td style={tdStyle}>
                      {result.prospectId ? (
                        <Link href="/admin/studios/prospects?vertical=beauty" onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 10, color: "#9d174d", fontWeight: 700, textDecoration: "none" }}>
                          Saved →
                        </Link>
                      ) : result.saveError ? (
                        <span title={result.saveError} style={{ fontSize: 10, color: "#b91c1c", fontWeight: 700, cursor: "help" }}>
                          ⚠ Failed
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: "#d6d3d1" }}>—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${operator.slug}-detail`}>
                      <td colSpan={9} style={{ padding: 0 }}>
                        <OperatorDetail result={result} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#a8a29e", fontSize: 13 }}>
            No operators match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline summary ─────────────────────────────────────────────────────────

function PipelineSummary({
  run,
  results,
}: {
  run: StyleSeatHarvestRun;
  results: StyleSeatResolverResult[];
}) {
  const [debugOpen, setDebugOpen] = useState(false);

  // Category breakdown
  const catCounts = results.reduce<Record<string, number>>((acc, r) => {
    const c = r.operator.categories[0] ?? "unknown";
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});

  // Status breakdown
  const statusCounts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const total = results.length || 1;

  function Bar({ label, count, color = "#9d174d" }: { label: string; count: number; color?: string }) {
    const pct = Math.round((count / total) * 100);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 150, fontSize: 11, color: "#57534e", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ flex: 1, background: "#f5f5f4", borderRadius: 4, height: 8, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
        </div>
        <div style={{ width: 30, textAlign: "right", fontSize: 11, fontWeight: 700 }}>{count}</div>
        <div style={{ width: 30, fontSize: 10, color: "#a8a29e" }}>{pct}%</div>
      </div>
    );
  }

  return (
    <div>
      {/* Run summary */}
      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>RUN SUMMARY</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {[
            { label: "Run ID",        val: run.runId.slice(0, 20) + "…" },
            { label: "Market",        val: `${run.market}, ${run.state}` },
            { label: "Categories",    val: run.categories.length },
            { label: "Harvested",     val: run.totalHarvested },
            { label: "IG matches",    val: run.totalIgFound },
            { label: "Resolved",      val: run.totalResolved },
            { label: "Saved",         val: run.savedCount },
            { label: "Errors",        val: run.errors.length },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Save results */}
      <div style={{
        background: run.failedToSaveCount > 0 ? "#fffbeb" : "#f0fdf4",
        border: `1px solid ${run.failedToSaveCount > 0 ? "#fde68a" : "#bbf7d0"}`,
        borderRadius: 12, padding: "14px 18px", marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 10 }}>SAVE RESULTS</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>Saved</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#15803d" }}>{run.savedCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>Failed</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: run.failedToSaveCount > 0 ? "#b91c1c" : "#a8a29e" }}>
              {run.failedToSaveCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>Total operators</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1c1917" }}>{run.totalHarvested}</div>
          </div>
        </div>
        {run.saveErrors.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>FAILED SAVES:</div>
            {run.saveErrors.map((se, i) => (
              <div key={i} style={{ fontSize: 11, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 10px", marginBottom: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{se.handle}</span>
                <span style={{ color: "#b91c1c" }}>{se.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdowns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>CATEGORY BREAKDOWN</div>
          {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <Bar key={cat} label={STYLESEAT_CATEGORY_LABELS[cat as StyleSeatCategory] ?? cat} count={count} color="#9d174d" />
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>STATUS BREAKDOWN</div>
          {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
            const c = STYLESEAT_STATUS_COLORS[status as keyof typeof STYLESEAT_STATUS_COLORS];
            return (
              <Bar key={status} label={STYLESEAT_STATUS_LABELS[status as keyof typeof STYLESEAT_STATUS_LABELS] ?? status} count={count} color={c?.fg ?? "#9d174d"} />
            );
          })}
        </div>
      </div>

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
                ["prospectStorePath",    run.prospectStorePath],
                ["prospectsBeforeCount", String(run.prospectsBeforeCount)],
                ["prospectsAfterCount",  String(run.prospectsAfterCount)],
                ["delta",               `+${(run.prospectsAfterCount ?? 0) - (run.prospectsBeforeCount ?? 0)}`],
                ["savedCount",          String(run.savedCount)],
                ["failedToSaveCount",   String(run.failedToSaveCount)],
                ["totalHarvested",      String(run.totalHarvested)],
                ["totalIgFound",        String(run.totalIgFound)],
                ["runId",               run.runId],
              ] as [string, string][]).map(([k, v]) => (
                <>
                  <span key={`k-${k}`} style={{ color: "#a8a29e", whiteSpace: "nowrap" }}>{k}</span>
                  <span key={`v-${k}`} style={{ color: "#fef3c7", wordBreak: "break-all" }}>{v}</span>
                </>
              ))}
            </div>
            {(run.savedHandles?.length ?? 0) > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: "#a8a29e", marginBottom: 4 }}>savedHandles ({run.savedHandles.length})</div>
                <div style={{ color: "#bbf7d0" }}>{run.savedHandles.join(", ")}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#a8a29e" }}>
        All operators are saved to the Discovered Entities repository.{" "}
        <Link href="/admin/studios/prospects?vertical=beauty" style={{ color: "#9d174d", fontWeight: 700, textDecoration: "none" }}>
          View beauty prospects →
        </Link>
      </div>
    </div>
  );
}

function IntelligenceDashboard({ intelligence }: { intelligence: StyleSeatIntelligenceReport | null | undefined }) {
  if (!intelligence) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: 18, color: "#78716c", fontSize: 13 }}>
        Intelligence artifacts are not available for this run.
      </div>
    );
  }

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: 16 };
  const title: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 10 };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={title}>TOP MARKETS</div>
          {intelligence.markets.slice(0, 6).map((market) => (
            <div key={market.market} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "7px 0", borderBottom: "1px solid #f5f5f4" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{market.market}</div>
                <div style={{ fontSize: 11, color: "#78716c" }}>{Object.entries(market.categoryCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3).map(([cat]) => cat).join(", ")}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "#57534e" }}>
                <strong style={{ fontSize: 18, color: confColor(market.marketScore) }}>{market.marketScore}</strong><br />
                {market.operatorCount} ops
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={title}>TOP CATEGORIES</div>
          {intelligence.categories.slice(0, 6).map((category) => (
            <div key={category.category} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "7px 0", borderBottom: "1px solid #f5f5f4" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{STYLESEAT_CATEGORY_LABELS[category.category]}</div>
                <div style={{ fontSize: 11, color: "#78716c" }}>{category.topMarkets.join(", ") || "No market concentration yet"}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "#57534e" }}>
                <strong style={{ fontSize: 18, color: "#9d174d" }}>{category.count}</strong><br />
                {category.IGActivePercent}% IG
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={title}>TOP CREATOR CANDIDATES</div>
        <div style={{ display: "grid", gap: 8 }}>
          {intelligence.operators.slice(0, 8).map((operator) => (
            <div key={operator.operatorId} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f5f5f4" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{operator.name}</div>
                <div style={{ fontSize: 11, color: "#78716c" }}>{operator.market} · {operator.specialties.slice(0, 3).join(", ") || operator.categories.join(", ")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {operator.labels.slice(0, 4).map((label) => (
                    <span key={label} style={{ fontSize: 9, fontWeight: 700, color: "#9d174d", background: "#fce7f3", borderRadius: 20, padding: "2px 7px" }}>{label.replace(/_/g, " ")}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "#57534e" }}>
                <strong style={{ fontSize: 18, color: confColor(operator.score) }}>{operator.score}</strong><br />
                {operator.igHandleFound ? `@${operator.igHandleFound}` : "no IG"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={title}>MARKET CLUSTERS</div>
          {intelligence.clusters.slice(0, 6).map((cluster) => (
            <div key={cluster.market} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{cluster.ecosystemType}</div>
              <div style={{ fontSize: 11, color: "#78716c" }}>{cluster.market} · {cluster.dominantCategories.join(", ")}</div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={title}>RECOMMENDATIONS</div>
          {intelligence.recommendations.slice(0, 8).map((rec, i) => (
            <div key={i} style={{ fontSize: 12, color: "#57534e", marginBottom: 8 }}>{rec}</div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={title}>INSIGHTS</div>
        {intelligence.insights.slice(0, 10).map((insight, i) => (
          <div key={i} style={{ fontSize: 12, color: "#57534e", marginBottom: 6 }}>{insight}</div>
        ))}
      </div>
    </div>
  );
}

function RecentRunsList({
  runs,
  onOpen,
  loadingRunId,
}: {
  runs: StyleSeatHarvestRun[];
  onOpen: (runId: string) => void;
  loadingRunId: string | null;
}) {
  if (runs.length === 0) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: 18, marginBottom: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 10 }}>
        RECENT STYLESEAT RUNS
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {runs.slice(0, 8).map((run) => {
          const totals = run.report?.totals;
          return (
            <button
              key={run.runId}
              type="button"
              onClick={() => onOpen(run.runId)}
              style={{
                textAlign: "left",
                border: "1px solid #f0ede8",
                borderRadius: 10,
                background: "#fafaf9",
                padding: "10px 12px",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>
                  {run.discoveryMode?.replace(/_/g, " ") ?? "market search"} · {run.sourceUrl ?? `${run.market}${run.state ? `, ${run.state}` : ""}`}
                </div>
                <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>
                  {new Date(run.createdAt).toLocaleString()} · {run.categories.join(", ") || "derived categories"}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#57534e", textAlign: "right", whiteSpace: "nowrap" }}>
                <strong>{totals?.profileUrls ?? 0}</strong> profiles · <strong>{totals?.harvested ?? run.totalHarvested}</strong> harvested<br />
                <strong>{totals?.igCandidates ?? run.totalIgFound}</strong> IG · <strong>{totals?.resolverMerged ?? run.totalResolved}</strong> merged · <strong>{totals?.prospectsCreated ?? run.savedCount}</strong> saved · <strong>{totals?.failed ?? run.failedToSaveCount}</strong> failed
                {loadingRunId === run.runId && <div style={{ color: "#9d174d", marginTop: 2 }}>Loading...</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StyleSeatDiscoveryPage() {
  const [loading, setLoading]       = useState(false);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const [error, setError]           = useState<string | null>(null);
  const [runs, setRuns]             = useState<StyleSeatHarvestRun[]>([]);
  const [runData, setRunData]       = useState<StyleSeatPageRunData | null>(null);
  const [tab, setTab]               = useState<"operators" | "summary" | "intelligence">("operators");

  async function loadRuns() {
    try {
      const res = await fetch("/api/admin/studios/styleseat/list", { cache: "no-store" });
      const data: StyleSeatListResponse | StyleSeatErrorResponse = await res.json();
      if (data.ok) setRuns(data.runs);
    } catch {
      // Recent runs are non-critical for the run form.
    }
  }

  useEffect(() => {
    void loadRuns();
  }, []);

  async function openRun(runId: string) {
    setLoadingRunId(runId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/studios/styleseat/${encodeURIComponent(runId)}`, { cache: "no-store" });
      const data: StyleSeatDetailResponse | StyleSeatErrorResponse = await res.json();
      if (!data.ok) {
        const e = data as StyleSeatErrorResponse;
        setError(`${e.error}${e.detail ? ` - ${e.detail}` : ""}`);
        return;
      }
      setRunData({
        run: data.run,
        crawl: data.crawl,
        operators: data.operators,
        results: data.results,
        raw: data.raw,
        normalized: data.normalized,
        prospects: data.prospects,
        failures: data.failures,
        log: data.log,
        intelligence: data.intelligence,
      });
      setTab(data.intelligence ? "intelligence" : "summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingRunId(null);
    }
  }

  async function handleRun(config: {
    debug?: boolean;
    discoveryMode: StyleSeatDiscoveryMode;
    sourceUrl?: string;
    city?: string; state: string;
    categories: StyleSeatCategory[];
    maxOperators: number; crawlDepth: number;
    pipelineMode: StyleSeatPipelineMode; resolverMode: ResolveMode;
  }) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setRunData(null);
    setProgressIdx(0);
    setTab("operators");

    const interval = setInterval(() => {
      setProgressIdx((i) => (i + 1) % PROGRESS_MSGS.length);
    }, 4000);

    try {
      const res  = await fetch("/api/admin/studios/styleseat/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data: StyleSeatRunResponse | StyleSeatErrorResponse = await res.json();

      if (!data.ok) {
        const e = data as StyleSeatErrorResponse;
        setError(`${e.error}${e.detail ? ` — ${e.detail}` : ""}`);
        return;
      }

      const ok = data as StyleSeatRunResponse;
      setRunData({
        run: ok.run,
        crawl: ok.crawl,
        operators: ok.operators,
        results: ok.results,
        raw: ok.operators,
        normalized: ok.normalized,
        prospects: ok.prospects,
        failures: ok.failures,
        log: ok.log,
        intelligence: ok.intelligence,
        diagnosticSummary: ok.diagnosticSummary,
      });
      await loadRuns();
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
      <CreatorIntelligenceNav current="styleseat" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          StyleSeat Discovery
        </h1>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0, maxWidth: 680 }}>
          Discover independent beauty operators from StyleSeat — braiders, barbers, lash artists, nail techs — then resolve their IG identity and save to the prospect repository.
        </p>
      </div>

      {/* Run form (pre-run) */}
      {!runData && (
        <>
          <RunForm
            onRun={handleRun}
            loading={loading}
            error={error}
            progressIdx={progressIdx}
          />
          <RecentRunsList runs={runs} onOpen={openRun} loadingRunId={loadingRunId} />
        </>
      )}

      {/* Results */}
      {runData && (
        <>
          {/* Result header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button type="button" onClick={() => setRunData(null)}
              style={{ fontSize: 12, color: "#9d174d", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              ← New Discovery
            </button>
            <span style={{ fontSize: 12, color: "#78716c" }}>
              {runData.run.market}, {runData.run.state} · {new Date(runData.run.createdAt).toLocaleString()} · {runData.run.mode.replace(/_/g, " ")}
            </span>
            <Link href="/admin/studios/prospects?vertical=beauty"
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
              View Beauty Prospects →
            </Link>
          </div>

          {/* Run-level errors */}
          {runData.run.errors.length > 0 && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
              {runData.run.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: "#92400e" }}>⚠️ {e}</div>
              ))}
            </div>
          )}

          {/* Zero-save warning */}
          {runData.run.totalHarvested > 0 && runData.run.savedCount === 0 && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2", border: "2px solid #dc2626", borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626", marginBottom: 4 }}>
                ⛔ Zero prospects saved — {runData.run.totalHarvested} operator(s) harvested but none persisted.
              </div>
              <div style={{ fontSize: 11, color: "#b91c1c" }}>
                Store path: <code style={{ fontFamily: "monospace", background: "#fee2e2", padding: "1px 4px", borderRadius: 3 }}>{runData.run.prospectStorePath}</code>
              </div>
            </div>
          )}

          <SummaryCards run={runData.run} />
          <DiagnosticSummaryCard summary={runData.diagnosticSummary} />

          <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 8 }}>RUN ARTIFACTS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "#57534e" }}>
              <span><strong>{runData.raw?.length ?? runData.operators.length}</strong> harvested</span>
              <span><strong>{runData.normalized?.length ?? 0}</strong> normalized</span>
              <span><strong>{runData.run.report?.totals.igCandidates ?? runData.run.totalIgFound}</strong> IG candidates</span>
              <span><strong>{runData.run.report?.totals.resolverMerged ?? runData.run.totalResolved}</strong> resolver merged</span>
              <span><strong>{runData.run.report?.totals.prospectsCreated ?? runData.run.savedCount}</strong> prospects created/updated</span>
              <span><strong>{runData.failures?.length ?? runData.run.failedToSaveCount}</strong> failures</span>
            </div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11, color: "#78716c" }}>
              <div>
                <strong>Discovered markets:</strong> {(runData.run.report?.discoveredMarkets ?? runData.crawl?.discoveredMarkets ?? []).slice(0, 5).join(", ") || "none captured"}
              </div>
              <div>
                <strong>Discovered categories:</strong> {(runData.run.report?.discoveredCategories ?? runData.crawl?.discoveredCategories ?? []).slice(0, 8).join(", ") || "none captured"}
              </div>
              <div style={{ gridColumn: "1 / -1", fontFamily: "monospace", wordBreak: "break-all" }}>
                <strong>Artifacts:</strong> {Object.entries(runData.run.report?.artifactPaths ?? {}).map(([k, v]) => `${k}:${v}`).join(" | ") || "not available"}
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#f5f5f4", borderRadius: 24, padding: 4, width: "fit-content" }}>
            <button type="button" style={tabStyle(tab === "operators")} onClick={() => setTab("operators")}>
              Operators ({runData.results.length})
            </button>
            <button type="button" style={tabStyle(tab === "summary")} onClick={() => setTab("summary")}>
              📊 Pipeline Summary
            </button>
            <button type="button" style={tabStyle(tab === "intelligence")} onClick={() => setTab("intelligence")}>
              Intelligence
            </button>
          </div>

          {tab === "operators" && (
            <>
              {runData.run.saveErrors.length > 0 && (
                <div style={{ marginBottom: 10, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#b91c1c" }}>
                  ⚠️ {runData.run.saveErrors.length} operator(s) failed to save — check Pipeline Summary for details.
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 8 }}>
                DISCOVERED OPERATORS — click row to expand
              </div>
              <OperatorsTable results={runData.results} />
            </>
          )}

          {tab === "summary" && (
            <PipelineSummary run={runData.run} results={runData.results} />
          )}

          {tab === "intelligence" && (
            <IntelligenceDashboard intelligence={runData.intelligence} />
          )}
        </>
      )}

      <div style={{ marginTop: 20, fontSize: 11, color: "#d6d3d1", textAlign: "right" }}>
        StyleSeat Discovery · Admin only · Beauty vertical · Not visible to members
      </div>
    </div>
  );
}
