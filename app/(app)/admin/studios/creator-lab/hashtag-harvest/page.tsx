"use client";
// app/(app)/admin/studios/creator-lab/hashtag-harvest/page.tsx
// Hashtag Harvest — admin-only. Not public. Not member-facing.

import { useState } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { parseHashtags } from "@/lib/studios/creator-lab/hashtag-harvest/normalize-creators";
import type {
  HashtagHarvestRun,
  HarvestedCreatorSeed,
  ResolverPipelineResult,
  HarvestRunResponse,
  HarvestErrorResponse,
} from "@/lib/studios/creator-lab/hashtag-harvest/types";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confColor(n: number) {
  if (n >= 65) return "#16a34a";
  if (n >= 35) return "#d97706";
  return "#dc2626";
}

function platformBadge(platform: string | null) {
  if (!platform) return null;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, background: "#f5f5f4", color: "#78716c",
      borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap",
    }}>{platform}</span>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ run, results }: { run: HashtagHarvestRun; results: ResolverPipelineResult[] }) {
  const byPlatform = results.reduce<Record<string, number>>((acc, r) => {
    if (r.bestMatchPlatform) acc[r.bestMatchPlatform] = (acc[r.bestMatchPlatform] ?? 0) + 1;
    return acc;
  }, {});

  const highConf = results.filter((r) => r.confidence >= 65).length;

  const stats = [
    { label: "Hashtags",       val: run.hashtags.length,      color: "#1c1917" },
    { label: "Posts scanned",  val: run.totalPosts,           color: "#57534e" },
    { label: "Creators found", val: run.totalCreators,        color: "#1d4ed8" },
    { label: "Resolved",       val: run.totalResolved,        color: "#15803d" },
    { label: "High confidence",val: highConf,                 color: "#16a34a" },
    { label: "Prospects saved",val: run.totalProspectsCreated,color: "#9d174d" },
    ...Object.entries(byPlatform).map(([p, n]) => ({ label: p, val: n, color: "#78716c" })),
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
      {stats.map(({ label, val, color }) => (
        <div key={label} style={{
          background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10,
          padding: "10px 16px", textAlign: "center", minWidth: 80,
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
          <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Creator result row ───────────────────────────────────────────────────────

function CreatorRow({
  result,
  expanded,
  onToggle,
}: {
  result: ResolverPipelineResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { seed } = result;

  const tdStyle: React.CSSProperties = {
    padding: "8px 10px", fontSize: 12, color: "#57534e",
    borderBottom: "1px solid #f5f5f4", verticalAlign: "middle",
  };

  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: "pointer", background: expanded ? "#fdf2f8" : "transparent" }}
      >
        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1c1917" }}>
          @{seed.handle}
        </td>
        <td style={tdStyle}>{seed.displayName !== seed.handle ? seed.displayName : <span style={{ color: "#d6d3d1" }}>—</span>}</td>
        <td style={{ ...tdStyle, fontSize: 10, color: "#9d174d" }}>#{seed.sourceHashtag}</td>
        <td style={tdStyle}>{seed.detectedCategory ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
        <td style={tdStyle}>
          {result.bestMatchUrl ? (
            <a href={result.bestMatchUrl} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: "#0284c7", textDecoration: "none", fontSize: 11,
                display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
              {result.bestMatchUrl}
            </a>
          ) : <span style={{ color: "#d6d3d1" }}>—</span>}
        </td>
        <td style={tdStyle}>{platformBadge(result.bestMatchPlatform) ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
        <td style={tdStyle}>{seed.detectedLocation ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
        <td style={tdStyle}>
          <span style={{ fontWeight: 700, color: confColor(result.confidence) }}>
            {result.confidence || <span style={{ color: "#d6d3d1" }}>—</span>}
          </span>
        </td>
        <td style={tdStyle}>
          {result.prospectId ? (
            <a href="/admin/studios/prospects" onClick={(e) => e.stopPropagation()}
              style={{ fontSize: 10, color: "#9d174d", fontWeight: 700, textDecoration: "none" }}>
              Saved →
            </a>
          ) : <span style={{ fontSize: 10, color: "#d6d3d1" }}>—</span>}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0, background: "#fafaf9", borderBottom: "1px solid #e7e5e4" }}>
            <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
              {/* Left */}
              <div>
                {seed.captionSnippet && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", marginBottom: 4 }}>CAPTION SNIPPET</div>
                    <div style={{ color: "#57534e", fontStyle: "italic", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 6, padding: "6px 10px" }}>
                      "{seed.captionSnippet.slice(0, 180)}"
                    </div>
                  </div>
                )}
                {seed.evidence.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", marginBottom: 4 }}>EVIDENCE</div>
                    {seed.evidence.map((e, i) => (
                      <div key={i} style={{ fontSize: 11, color: "#57534e", fontFamily: "monospace",
                        background: "#fff", border: "1px solid #e7e5e4", borderRadius: 4, padding: "3px 7px", marginBottom: 3 }}>
                        {e}
                      </div>
                    ))}
                  </div>
                )}
                {seed.postUrl && (
                  <a href={seed.postUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "#0284c7", textDecoration: "none" }}>
                    View source post →
                  </a>
                )}
              </div>
              {/* Right */}
              <div>
                {result.notes && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", marginBottom: 4 }}>RESOLVER NOTES</div>
                    <div style={{ fontSize: 11, color: "#78716c" }}>{result.notes}</div>
                  </div>
                )}
                <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", marginBottom: 4 }}>LINKS</div>
                {seed.profileUrl && (
                  <a href={seed.profileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "block", fontSize: 11, color: "#0284c7", textDecoration: "none", marginBottom: 4 }}>
                    Instagram profile →
                  </a>
                )}
                {result.bestMatchUrl && (
                  <div style={{ marginTop: 8 }}>
                    <a href={`/admin/studios/creator-lab?url=${encodeURIComponent(result.bestMatchUrl)}`}
                      style={{ fontSize: 11, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
                      Assemble in Studio Assembler →
                    </a>
                  </div>
                )}
                {result.prospectId && (
                  <div style={{ marginTop: 6 }}>
                    <a href="/admin/studios/prospects"
                      style={{ fontSize: 11, fontWeight: 700, color: "#78716c", textDecoration: "none" }}>
                      View in Prospect Directory →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Results table ────────────────────────────────────────────────────────────

type SortKey = "handle" | "hashtag" | "category" | "platform" | "confidence";

function ResultsTable({ creators, results }: { creators: HarvestedCreatorSeed[]; results: ResolverPipelineResult[] }) {
  const [expandedHandle, setExpandedHandle] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterHashtag, setFilterHashtag] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMinConf, setFilterMinConf] = useState(0);

  const hashtags = Array.from(new Set(creators.map((c) => c.sourceHashtag))).sort();
  const platforms = Array.from(new Set(results.map((r) => r.bestMatchPlatform).filter(Boolean) as string[])).sort();
  const categories = Array.from(new Set(creators.map((c) => c.detectedCategory).filter(Boolean) as string[])).sort();

  let filtered = [...results];
  if (filterHashtag !== "all") filtered = filtered.filter((r) => r.seed.sourceHashtag === filterHashtag);
  if (filterPlatform !== "all") filtered = filtered.filter((r) => r.bestMatchPlatform === filterPlatform);
  if (filterCategory !== "all") filtered = filtered.filter((r) => r.seed.detectedCategory === filterCategory);
  if (filterMinConf > 0) filtered = filtered.filter((r) => r.confidence >= filterMinConf);

  filtered.sort((a, b) => {
    let av: string | number = "", bv: string | number = "";
    switch (sortKey) {
      case "handle":     av = a.seed.handle;              bv = b.seed.handle; break;
      case "hashtag":    av = a.seed.sourceHashtag;       bv = b.seed.sourceHashtag; break;
      case "category":   av = a.seed.detectedCategory ?? ""; bv = b.seed.detectedCategory ?? ""; break;
      case "platform":   av = a.bestMatchPlatform ?? "";  bv = b.bestMatchPlatform ?? ""; break;
      case "confidence": av = a.confidence;               bv = b.confidence; break;
    }
    const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "confidence" ? "desc" : "asc"); }
  }

  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "7px 10px", fontSize: 10, fontWeight: 700,
    color: "#78716c", letterSpacing: "0.06em", borderBottom: "1px solid #e7e5e4",
    cursor: "pointer", userSelect: "none", background: "#f9f9f8", whiteSpace: "nowrap",
  };

  const selectStyle: React.CSSProperties = {
    fontSize: 11, padding: "4px 7px", border: "1px solid #e7e5e4",
    borderRadius: 6, color: "#57534e", background: "#fff",
  };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <select value={filterHashtag} onChange={(e) => setFilterHashtag(e.target.value)} style={selectStyle}>
          <option value="all">All hashtags</option>
          {hashtags.map((h) => <option key={h} value={h}>#{h}</option>)}
        </select>
        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} style={selectStyle}>
          <option value="all">All platforms</option>
          {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={selectStyle}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterMinConf} onChange={(e) => setFilterMinConf(Number(e.target.value))} style={selectStyle}>
          <option value={0}>Any confidence</option>
          <option value={30}>≥ 30</option>
          <option value={50}>≥ 50</option>
          <option value={65}>≥ 65</option>
        </select>
        <span style={{ fontSize: 11, color: "#a8a29e", alignSelf: "center", marginLeft: "auto" }}>
          {filtered.length} of {results.length}
        </span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {([
                ["handle",     "Handle"],
                [null,         "Display Name"],
                ["hashtag",    "Hashtag"],
                ["category",   "Category"],
                [null,         "Best URL"],
                ["platform",   "Platform"],
                [null,         "Location"],
                ["confidence", "Conf."],
                [null,         "Prospect"],
              ] as [SortKey | null, string][]).map(([key, label]) => (
                <th key={label} style={thStyle} onClick={() => key && toggleSort(key)}>
                  {label}
                  {key && sortKey === key && <span style={{ color: "#9d174d" }}>{sortDir === "asc" ? " ↑" : " ↓"}</span>}
                  {key && sortKey !== key && <span style={{ color: "#d6d3d1" }}> ↕</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((result) => (
              <CreatorRow
                key={result.seed.handle}
                result={result}
                expanded={expandedHandle === result.seed.handle}
                onToggle={() => setExpandedHandle(
                  expandedHandle === result.seed.handle ? null : result.seed.handle
                )}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#a8a29e", fontSize: 13 }}>
            No creators match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PROGRESS_MSGS = [
  "Connecting to Apify…",
  "Harvesting hashtag posts…",
  "Extracting creator signals…",
  "Running resolver pipeline…",
  "Matching booking profiles…",
  "Upserting prospect records…",
  "Finalising run…",
];

export default function HashtagHarvestPage() {
  const [hashtagText, setHashtagText] = useState("");
  const [market, setMarket] = useState("");
  const [category, setCategory] = useState("");
  const [maxPerHashtag, setMaxPerHashtag] = useState(10);
  const [mode, setMode] = useState<ResolveMode>("fast");
  const [loading, setLoading] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [runData, setRunData] = useState<{ run: HashtagHarvestRun; creators: HarvestedCreatorSeed[]; results: ResolverPipelineResult[] } | null>(null);

  const parsedHashtags = parseHashtags(hashtagText);

  async function handleRun() {
    if (parsedHashtags.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setRunData(null);
    setProgressIdx(0);

    // Rotate progress message while waiting
    const interval = setInterval(() => {
      setProgressIdx((i) => (i + 1) % PROGRESS_MSGS.length);
    }, 4000);

    try {
      const res = await fetch("/api/admin/studios/creator-lab/hashtag-harvest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtags: parsedHashtags, market, category, maxPerHashtag, mode }),
      });
      const data: HarvestRunResponse | HarvestErrorResponse = await res.json();
      if (!data.ok) {
        setError(`${(data as HarvestErrorResponse).error}${(data as HarvestErrorResponse).detail ? ` — ${(data as HarvestErrorResponse).detail}` : ""}`);
        return;
      }
      const ok = data as HarvestRunResponse;
      setRunData({ run: ok.run, creators: ok.creators, results: ok.results });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  function handleReset() {
    setRunData(null);
    setError(null);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 8,
    fontSize: 13, color: "#1c1917", background: "#fff", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>

      <CreatorIntelligenceNav current="hashtag-harvest" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Hashtag Harvest
        </h1>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
          Harvest public Instagram creator signals from hashtags and feed into the resolver/prospect pipeline.
        </p>
      </div>

      {/* Input form */}
      {!runData && (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Hashtags */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
                HASHTAGS — ONE PER LINE OR COMMA-SEPARATED
              </label>
              <textarea
                value={hashtagText}
                onChange={(e) => setHashtagText(e.target.value)}
                rows={5}
                placeholder={"#denvernails\n#denverlashes\n#denverhair\n#gelxnailsdenver"}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                disabled={loading}
              />
              {parsedHashtags.length > 0 && (
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {parsedHashtags.map((h) => (
                    <span key={h} style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                      #{h}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Market */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
                MARKET / CITY
              </label>
              <input type="text" value={market} onChange={(e) => setMarket(e.target.value)}
                placeholder="Denver, CO" style={inputStyle} disabled={loading} />
            </div>

            {/* Category */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
                CATEGORY HINT
              </label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="Nails, Lashes, Hair…" style={inputStyle} disabled={loading} />
            </div>

            {/* Max per hashtag */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
                MAX CREATORS PER HASHTAG
              </label>
              <select value={maxPerHashtag} onChange={(e) => setMaxPerHashtag(Number(e.target.value))}
                style={{ ...inputStyle }} disabled={loading}>
                {[5, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Mode */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
                RESOLVER MODE
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["fast", "deep"] as ResolveMode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)} disabled={loading}
                    style={{
                      padding: "7px 16px", borderRadius: 20, border: "2px solid",
                      borderColor: mode === m ? "#9d174d" : "#e7e5e4",
                      background: mode === m ? "#9d174d" : "#fff",
                      color: mode === m ? "#fff" : "#57534e",
                      fontWeight: 700, fontSize: 12, cursor: "pointer",
                    }}>
                    {m === "fast" ? "⚡ Fast" : "🔬 Deep Research"}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
                {mode === "fast" ? "URL pattern matching only. No AI spend." : "AI identity analysis on top candidates. Slower, higher accuracy."}
              </div>
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
              <span style={{ marginRight: 8 }}>⏳</span>{PROGRESS_MSGS[progressIdx]}
              <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
                This can take 30–90 seconds. Apify is harvesting hashtag posts, then the resolver is matching booking profiles.
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
            <button
              onClick={handleRun}
              disabled={loading || parsedHashtags.length === 0}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: loading || parsedHashtags.length === 0 ? "#d6d3d1" : "#1c1917",
                color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading || parsedHashtags.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Harvesting…" : `Harvest ${parsedHashtags.length > 0 ? parsedHashtags.length : ""} Hashtag${parsedHashtags.length !== 1 ? "s" : ""}`}
            </button>
            <Link href="/admin/studios/prospects"
              style={{ fontSize: 12, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
              View Prospects →
            </Link>
          </div>
        </div>
      )}

      {/* Results */}
      {runData && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={handleReset}
              style={{ fontSize: 12, color: "#9d174d", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              ← New harvest
            </button>
            <span style={{ fontSize: 12, color: "#78716c" }}>
              Run {runData.run.runId} · {new Date(runData.run.createdAt).toLocaleString()}
            </span>
            <Link href="/admin/studios/prospects"
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
              View Prospect Directory →
            </Link>
          </div>

          {/* Errors from run */}
          {runData.run.errors.length > 0 && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
              {runData.run.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: "#92400e" }}>⚠️ {e}</div>
              ))}
            </div>
          )}

          <SummaryCards run={runData.run} results={runData.results} />

          {runData.results.length > 0 ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 8 }}>
                CREATOR RESULTS — click row to expand
              </div>
              <ResultsTable creators={runData.creators} results={runData.results} />
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#a8a29e", fontSize: 14,
              background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
              {runData.run.totalPosts === 0
                ? "No posts returned from Apify. Check your APIFY_TOKEN and hashtag spelling."
                : "No creators could be resolved. Try different hashtags or Deep Research mode."}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: "#d6d3d1", textAlign: "right" }}>
        Admin only · Not visible to members or creators
      </div>
    </div>
  );
}
