"use client";
// app/(app)/admin/studios/creator-lab/hashtag-harvest/page.tsx
// Hashtag Harvest — admin-only. Not public. Not member-facing.

import { useState } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { parseHashtags } from "@/lib/studios/creator-lab/hashtag-harvest/normalize-creators";
import {
  EDUCATION_HASHTAG_PRESET,
  EDUCATION_HASHTAG_CLUSTERS,
  EDUCATION_TYPE_LABELS,
  AUDIENCE_TYPE_LABELS,
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_COLORS,
  type EducationType,
  type AudienceType,
  type ValidationStatus,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
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

// ─── Reports view ─────────────────────────────────────────────────────────────

function BreakdownBar({
  label, count, total, color = "#9d174d",
}: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: 160, fontSize: 11, color: "#57534e", flexShrink: 0, whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </div>
      <div style={{ flex: 1, background: "#f5f5f4", borderRadius: 4, height: 8, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`,
          background: color, borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <div style={{ width: 32, textAlign: "right", fontSize: 11, fontWeight: 700, color: "#1c1917" }}>{count}</div>
      <div style={{ width: 32, fontSize: 10, color: "#a8a29e" }}>{pct}%</div>
    </div>
  );
}

function BreakdownSection({
  title, entries, total, color,
}: { title: string; entries: [string, number][]; total: number; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>
        {title}
      </div>
      {entries.length === 0 ? (
        <div style={{ fontSize: 12, color: "#d6d3d1" }}>No data</div>
      ) : (
        entries.map(([label, count]) => (
          <BreakdownBar key={label} label={label} count={count} total={total} color={color} />
        ))
      )}
    </div>
  );
}

function ReportsView({
  run, creators, results,
}: { run: HashtagHarvestRun; creators: HarvestedCreatorSeed[]; results: ResolverPipelineResult[] }) {
  // ── By educationType ──
  const eduTypeCounts = results.reduce<Record<string, number>>((acc, r) => {
    const et = r.seed.educationType ?? "unknown";
    const label = EDUCATION_TYPE_LABELS[et as EducationType] ?? et;
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const eduTypeEntries = Object.entries(eduTypeCounts)
    .sort((a, b) => b[1] - a[1]);

  // ── By audienceType ──
  const audienceCounts = results.reduce<Record<string, number>>((acc, r) => {
    const at = r.seed.audienceType ?? "unknown";
    const label = AUDIENCE_TYPE_LABELS[at as AudienceType] ?? at;
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const audienceEntries = Object.entries(audienceCounts)
    .sort((a, b) => b[1] - a[1]);

  // ── By sourceHashtag ──
  const hashtagCounts = results.reduce<Record<string, number>>((acc, r) => {
    const tag = `#${r.seed.sourceHashtag}`;
    acc[tag] = (acc[tag] ?? 0) + 1;
    return acc;
  }, {});
  const hashtagEntries = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1]);

  // ── By platform ──
  const platformCounts = results.reduce<Record<string, number>>((acc, r) => {
    if (r.bestMatchPlatform) {
      acc[r.bestMatchPlatform] = (acc[r.bestMatchPlatform] ?? 0) + 1;
    }
    return acc;
  }, {});
  const platformEntries = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1]);

  // ── By resolution status (pseudo-validationStatus from run) ──
  const resolved = results.filter((r) => r.resolved && r.confidence >= 50).length;
  const partial = results.filter((r) => r.resolved && r.confidence < 50).length;
  const unresolved = results.filter((r) => !r.resolved).length;
  const resolutionEntries: [string, number][] = [
    ["Resolved (≥50 conf)", resolved],
    ["Partial (20-49 conf)", partial],
    ["Unresolved / needs review", unresolved],
  ];

  // ── By location ──
  const locationCounts = results.reduce<Record<string, number>>((acc, r) => {
    const loc = r.seed.detectedLocation;
    if (loc) acc[loc] = (acc[loc] ?? 0) + 1;
    return acc;
  }, {});
  const locationEntries = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  // ── Confidence histogram ──
  const confBuckets = [
    { label: "High (≥65)", count: results.filter((r) => r.confidence >= 65).length, color: "#16a34a" },
    { label: "Medium (35–64)", count: results.filter((r) => r.confidence >= 35 && r.confidence < 65).length, color: "#d97706" },
    { label: "Low (1–34)", count: results.filter((r) => r.confidence > 0 && r.confidence < 35).length, color: "#dc2626" },
    { label: "No match (0)", count: results.filter((r) => r.confidence === 0).length, color: "#d6d3d1" },
  ];

  const total = results.length;

  return (
    <div>
      {/* Run summary band */}
      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>
          RUN SUMMARY
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { label: "Run ID",          val: run.runId.slice(0, 18) + "…" },
            { label: "Hashtags",        val: run.hashtags.length },
            { label: "Posts scanned",   val: run.totalPosts },
            { label: "Creators seeded", val: run.totalCreators },
            { label: "Resolved",        val: run.totalResolved },
            { label: "Prospects saved", val: run.totalProspectsCreated },
            { label: "Run errors",      val: run.errors.length },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
        {run.hashtags.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {run.hashtags.map((h) => (
              <span key={h} style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d",
                borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                #{h}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Left column */}
        <div>
          <BreakdownSection
            title="EDUCATION TYPE"
            entries={eduTypeEntries}
            total={total}
            color="#6d28d9"
          />
          <BreakdownSection
            title="AUDIENCE TYPE"
            entries={audienceEntries}
            total={total}
            color="#1d4ed8"
          />
          <BreakdownSection
            title="RESOLUTION STATUS"
            entries={resolutionEntries}
            total={total}
            color="#15803d"
          />
          {/* Confidence histogram */}
          <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>
              CONFIDENCE DISTRIBUTION
            </div>
            {confBuckets.map(({ label, count, color }) => (
              <BreakdownBar key={label} label={label} count={count} total={total} color={color} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div>
          <BreakdownSection
            title="SOURCE HASHTAG"
            entries={hashtagEntries}
            total={total}
            color="#9d174d"
          />
          <BreakdownSection
            title="MATCHED PLATFORM"
            entries={platformEntries}
            total={total}
            color="#0284c7"
          />
          {locationEntries.length > 0 && (
            <BreakdownSection
              title="DETECTED LOCATION (TOP 15)"
              entries={locationEntries}
              total={total}
              color="#78716c"
            />
          )}
        </div>
      </div>

      <div style={{ marginTop: 4, fontSize: 11, color: "#a8a29e" }}>
        All prospects (including unresolved) are saved to the Discovered Entities repository.{" "}
        <Link href="/admin/studios/prospects" style={{ color: "#9d174d", fontWeight: 700, textDecoration: "none" }}>
          View repository →
        </Link>
      </div>
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
        <td style={{ ...tdStyle, fontSize: 10 }}>
          {seed.educationType
            ? <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
                {EDUCATION_TYPE_LABELS[seed.educationType] ?? seed.educationType}
              </span>
            : <span style={{ color: "#d6d3d1" }}>—</span>}
        </td>
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
                {seed.educationType && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>EDU TYPE: </span>
                    <span style={{ fontSize: 11, color: "#6d28d9", fontWeight: 600 }}>
                      {EDUCATION_TYPE_LABELS[seed.educationType] ?? seed.educationType}
                    </span>
                  </div>
                )}
                {seed.audienceType && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>AUDIENCE: </span>
                    <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>
                      {AUDIENCE_TYPE_LABELS[seed.audienceType] ?? seed.audienceType}
                    </span>
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
                      View in Discovered Entities →
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

type SortKey = "handle" | "hashtag" | "edutype" | "platform" | "confidence";

function ResultsTable({ creators, results }: { creators: HarvestedCreatorSeed[]; results: ResolverPipelineResult[] }) {
  const [expandedHandle, setExpandedHandle] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterHashtag, setFilterHashtag] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterEduType, setFilterEduType] = useState("all");
  const [filterMinConf, setFilterMinConf] = useState(0);

  const hashtags = Array.from(new Set(creators.map((c) => c.sourceHashtag))).sort();
  const platforms = Array.from(new Set(results.map((r) => r.bestMatchPlatform).filter(Boolean) as string[])).sort();
  const eduTypes = Array.from(new Set(results.map((r) => r.seed.educationType).filter(Boolean) as EducationType[])).sort();

  let filtered = [...results];
  if (filterHashtag !== "all") filtered = filtered.filter((r) => r.seed.sourceHashtag === filterHashtag);
  if (filterPlatform !== "all") filtered = filtered.filter((r) => r.bestMatchPlatform === filterPlatform);
  if (filterEduType !== "all") filtered = filtered.filter((r) => r.seed.educationType === filterEduType);
  if (filterMinConf > 0) filtered = filtered.filter((r) => r.confidence >= filterMinConf);

  filtered.sort((a, b) => {
    let av: string | number = "", bv: string | number = "";
    switch (sortKey) {
      case "handle":     av = a.seed.handle;                                      bv = b.seed.handle; break;
      case "hashtag":    av = a.seed.sourceHashtag;                               bv = b.seed.sourceHashtag; break;
      case "edutype":    av = a.seed.educationType ?? "";                          bv = b.seed.educationType ?? ""; break;
      case "platform":   av = a.bestMatchPlatform ?? "";                          bv = b.bestMatchPlatform ?? ""; break;
      case "confidence": av = a.confidence;                                       bv = b.confidence; break;
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
        <select value={filterEduType} onChange={(e) => setFilterEduType(e.target.value)} style={selectStyle}>
          <option value="all">All edu types</option>
          {eduTypes.map((et) => (
            <option key={et} value={et}>{EDUCATION_TYPE_LABELS[et] ?? et}</option>
          ))}
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
                ["edutype",    "Edu Type"],
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

// ─── Education preset panel ───────────────────────────────────────────────────

function EducationPresetPanel({ onLoad }: { onLoad: (text: string) => void }) {
  const [open, setOpen] = useState(false);

  const presetText = EDUCATION_HASHTAG_PRESET.map((h) => `#${h}`).join("\n");

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: 11, fontWeight: 700, color: "#6d28d9", background: "#ede9fe",
          border: "1px solid #c4b5fd", borderRadius: 6, padding: "4px 12px",
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
        }}
      >
        🎓 Education Preset {open ? "▲" : "▼"}
      </button>

      {open && (
        <div style={{ marginTop: 8, background: "#faf5ff", border: "1px solid #e9d5ff",
          borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginBottom: 10 }}>
            {EDUCATION_HASHTAG_PRESET.length} education hashtags across {Object.keys(EDUCATION_HASHTAG_CLUSTERS).length} clusters
          </div>
          {Object.entries(EDUCATION_HASHTAG_CLUSTERS).map(([cluster, tags]) => (
            <div key={cluster} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#a855f7", letterSpacing: "0.08em", marginBottom: 4 }}>
                {cluster}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 10, background: "#ede9fe", color: "#7c3aed",
                    borderRadius: 20, padding: "1px 8px", fontWeight: 600,
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => { onLoad(presetText); setOpen(false); }}
              style={{
                padding: "6px 16px", borderRadius: 8, border: "none",
                background: "#7c3aed", color: "#fff", fontWeight: 700,
                fontSize: 12, cursor: "pointer",
              }}
            >
              Load All {EDUCATION_HASHTAG_PRESET.length} Tags
            </button>
            <span style={{ fontSize: 11, color: "#a8a29e", alignSelf: "center" }}>
              Replaces current textarea content
            </span>
          </div>
        </div>
      )}
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
  const [runData, setRunData] = useState<{
    run: HashtagHarvestRun;
    creators: HarvestedCreatorSeed[];
    results: ResolverPipelineResult[];
  } | null>(null);
  const [resultsTab, setResultsTab] = useState<"creators" | "reports">("creators");

  const parsedHashtags = parseHashtags(hashtagText);

  async function handleRun() {
    if (parsedHashtags.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setRunData(null);
    setProgressIdx(0);
    setResultsTab("creators");

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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px", borderRadius: 20, border: "none",
    background: active ? "#1c1917" : "transparent",
    color: active ? "#fff" : "#78716c",
    fontWeight: 700, fontSize: 12, cursor: "pointer",
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>

      <CreatorIntelligenceNav current="hashtag-harvest" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Hashtag Harvest
        </h1>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
          Harvest education creator signals from Instagram hashtags → resolver → prospect repository.
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
                placeholder={"#homeschool\n#homeschoolmom\n#microschool\n#mathtutor\n#dyslexia"}
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
              <EducationPresetPanel onLoad={(text) => setHashtagText(text)} />
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
                placeholder="Homeschool, Tutor, STEM…" style={inputStyle} disabled={loading} />
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
              View Discovered Entities →
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
              View Discovered Entities →
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

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#f5f5f4", borderRadius: 24, padding: 4, width: "fit-content" }}>
            <button style={tabStyle(resultsTab === "creators")} onClick={() => setResultsTab("creators")}>
              Creators ({runData.results.length})
            </button>
            <button style={tabStyle(resultsTab === "reports")} onClick={() => setResultsTab("reports")}>
              📊 Reports
            </button>
          </div>

          {resultsTab === "creators" && (
            <>
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

          {resultsTab === "reports" && (
            <ReportsView
              run={runData.run}
              creators={runData.creators}
              results={runData.results}
            />
          )}
        </>
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: "#d6d3d1", textAlign: "right" }}>
        Admin only · Not visible to members or creators
      </div>
    </div>
  );
}
