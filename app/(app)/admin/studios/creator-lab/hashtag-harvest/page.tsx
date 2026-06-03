"use client";
// app/(app)/admin/studios/creator-lab/hashtag-harvest/page.tsx
// Hashtag Harvest — admin-only. Not public. Not member-facing.

import { useState, useEffect } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { HarvestForm } from "@/components/studios/creator-lab/HarvestForm";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import { SalonResolverStatusCard } from "@/components/admin/intelligence/salon/SalonResolverStatusCard";
import { GgResolverDiagnosticsCard } from "@/components/admin/intelligence/salon/GgResolverDiagnosticsCard";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_COLORS,
  type ValidationStatus,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type {
  HashtagHarvestRun,
  HashtagHarvestHashtagStats,
  HarvestedCreatorSeed,
  ResolverPipelineResult,
  HarvestRunRequest,
  HarvestRunResponse,
  HarvestErrorResponse,
  HashtagHarvestDiagnosticsPayload,
  SaveError,
} from "@/lib/studios/creator-lab/hashtag-harvest/types";
import type { ProspectRecord, ProspectListResponse } from "@/lib/studios/prospects/types";
import { VALIDATION_STATUS_LABELS as VS_LABELS } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import { BUSINESS_CATEGORY_LABELS } from "@/lib/studios/prospects/opportunity-taxonomy";

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

function tagLabel(value: string): string {
  return value.replace(/_/g, " ");
}

// ─── Per-hashtag diagnostics ──────────────────────────────────────────────────

function statLine(label: string, value: number) {
  return (
    <div style={{ fontSize: 12, color: "#57534e" }}>
      <span style={{ fontWeight: 700, color: "#1c1917" }}>{label}:</span> {value}
    </div>
  );
}

function HashtagStatCard({ row }: { row: HashtagHarvestHashtagStats }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12,
      padding: "14px 16px", minWidth: 200, flex: "1 1 220px",
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#9d174d", marginBottom: 8 }}>
        #{row.hashtag}
      </div>
      {statLine("Posts", row.postsPulled)}
      {statLine("Creators", row.creatorsFound)}
      {statLine("Deduped", row.creatorsDeduped)}
      {statLine("Providers", row.bookingProvidersFound)}
      {statLine("Final Prospects", row.finalProspects)}
    </div>
  );
}

function HarvestDiagnosticsSummary({
  diagnostics,
}: {
  diagnostics: HashtagHarvestDiagnosticsPayload;
}) {
  const zeroPosts = diagnostics.perHashtag.every((r) => r.postsReturned === 0);

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "14px 18px",
        background: zeroPosts ? "#fef2f2" : "#f0fdf4",
        border: `1px solid ${zeroPosts ? "#fecaca" : "#bbf7d0"}`,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, color: "#57534e", marginBottom: 8 }}>
        HARVEST DIAGNOSTICS
      </div>
      <div style={{ fontSize: 12, color: "#44403c", marginBottom: 10 }}>
        <strong>{diagnostics.hashtagsParsed}</strong> hashtag(s) parsed · Apify{" "}
        {diagnostics.apifyConnected ? "connected" : "not connected"}
        {diagnostics.apifyActorRunIds.length > 0
          ? ` · run(s): ${diagnostics.apifyActorRunIds.slice(0, 3).join(", ")}`
          : ""}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, marginBottom: 12 }}>
        <span><strong>Posts</strong> {diagnostics.totals.postsReturned}</span>
        <span><strong>Creators</strong> {diagnostics.totals.creatorsExtracted}</span>
        <span><strong>Prospects saved</strong> {diagnostics.totals.prospectsCreated}</span>
        <span><strong>Dedupe dropped</strong> {diagnostics.totals.droppedByDedupe}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {diagnostics.perHashtag.map((row) => (
          <div
            key={row.hashtag}
            style={{
              background: "#fff",
              border: "1px solid #e7e5e4",
              borderRadius: 10,
              padding: "10px 12px",
              minWidth: 200,
              flex: "1 1 220px",
            }}
          >
            <div style={{ fontWeight: 800, color: "#9d174d", marginBottom: 6 }}>#{row.hashtag}</div>
            <div style={{ fontSize: 11, color: "#57534e", lineHeight: 1.5 }}>
              Limit {row.requestedLimit} · Posts {row.postsReturned} · Creators{" "}
              {row.creatorsExtracted} · Saved {row.prospectsCreated}
            </div>
            {row.apifyError ? (
              <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 6 }}>{row.apifyError}</div>
            ) : null}
            {row.postsReturned === 0 && !row.apifyError ? (
              <div style={{ fontSize: 11, color: "#b45309", marginTop: 6 }}>
                Zero posts — check hashtag or Apify quota.
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {diagnostics.errors.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          {diagnostics.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: "#b91c1c" }}>Error: {e}</div>
          ))}
        </div>
      ) : null}
      {diagnostics.warnings.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          {diagnostics.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: "#92400e" }}>Warning: {w}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HashtagDiagnosticsPanel({ run }: { run: HashtagHarvestRun }) {
  const stats = run.hashtagStats;
  const totals = run.hashtagStatsTotals;
  if (!stats?.length || !totals) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {run.resolverDiagnostics ? (
        <>
          <SalonResolverStatusCard
            title="Resolver status"
            harvested={run.resolverDiagnostics.harvested ?? run.totalCreators}
            deduped={run.resolverDiagnostics.deduped ?? run.totalCreators}
            resolved={run.resolverDiagnostics.resolved ?? run.totalResolved}
            {...run.resolverDiagnostics}
          />
          <GgResolverDiagnosticsCard title="GlossGenius resolver (this run)" {...run.resolverDiagnostics} />
        </>
      ) : null}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 10 }}>
        PER-HASHTAG HARVEST DIAGNOSTICS
      </div>
      <div style={{
        background: "#fafaf9", border: "1px solid #e7e5e4", borderRadius: 12,
        padding: "14px 18px", marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#57534e", marginBottom: 6 }}>Totals</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "#57534e" }}>
          <span><strong>Posts</strong> {totals.postsPulled}</span>
          <span><strong>Creators</strong> {totals.creatorsFound}</span>
          <span><strong>Deduped</strong> {totals.creatorsDeduped}</span>
          <span><strong>Providers</strong> {totals.bookingProvidersFound}</span>
          <span><strong>Final Prospects</strong> {totals.finalProspects}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {stats.map((row) => <HashtagStatCard key={row.hashtag} row={row} />)}
      </div>
    </div>
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
  run, results, saveErrors, diagnostics,
}: {
  run: HashtagHarvestRun;
  creators: HarvestedCreatorSeed[];
  results: ResolverPipelineResult[];
  saveErrors: SaveError[];
  diagnostics?: HashtagHarvestDiagnosticsPayload;
}) {
  // ── Stored prospects from the real DB — fetched once when tab opens ──────────
  const [storedProspects, setStoredProspects] = useState<ProspectRecord[]>([]);
  const [storedLoading, setStoredLoading] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);
  const [apifyDebugOpen, setApifyDebugOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/studios/prospects/list?vertical=salon")
      .then((r) => r.json())
      .then((d: ProspectListResponse) => { if (d.ok) setStoredProspects(d.prospects); })
      .catch(() => {/* non-fatal */})
      .finally(() => setStoredLoading(false));
  }, []);

  // ── Run-level breakdowns (from this run's response) ───────────────────────────
  const primaryTypeCounts = results.reduce<Record<string, number>>((acc, r) => {
    const label = r.seed.primaryLabel ?? r.seed.primaryType ?? "unknown";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const primaryTypeEntries = Object.entries(primaryTypeCounts).sort((a, b) => b[1] - a[1]);

  const secondaryTypeCounts = results.reduce<Record<string, number>>((acc, r) => {
    const label = r.seed.secondaryLabel ?? r.seed.secondaryType ?? "unknown";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const secondaryTypeEntries = Object.entries(secondaryTypeCounts).sort((a, b) => b[1] - a[1]);

  const hashtagCounts = results.reduce<Record<string, number>>((acc, r) => {
    const tag = `#${r.seed.sourceHashtag}`;
    acc[tag] = (acc[tag] ?? 0) + 1;
    return acc;
  }, {});
  const hashtagEntries = Object.entries(hashtagCounts).sort((a, b) => b[1] - a[1]);

  const platformCounts = results.reduce<Record<string, number>>((acc, r) => {
    if (r.bestMatchPlatform) acc[r.bestMatchPlatform] = (acc[r.bestMatchPlatform] ?? 0) + 1;
    return acc;
  }, {});
  const platformEntries = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]);

  const locationCounts = results.reduce<Record<string, number>>((acc, r) => {
    const loc = r.seed.detectedLocation;
    if (loc) acc[loc] = (acc[loc] ?? 0) + 1;
    return acc;
  }, {});
  const locationEntries = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const confBuckets = [
    { label: "High (≥65)",    count: results.filter((r) => r.confidence >= 65).length,                       color: "#16a34a" },
    { label: "Medium (35–64)",count: results.filter((r) => r.confidence >= 35 && r.confidence < 65).length,  color: "#d97706" },
    { label: "Low (1–34)",    count: results.filter((r) => r.confidence > 0 && r.confidence < 35).length,    color: "#dc2626" },
    { label: "No match (0)",  count: results.filter((r) => r.confidence === 0).length,                       color: "#d6d3d1" },
  ];

  // ── Validation status breakdown — from STORED prospects (real human labels) ──
  const storedVsCounts = storedProspects.reduce<Record<string, number>>((acc, p) => {
    const vs = p.validationStatus ?? "new";
    const label = VS_LABELS[vs] ?? vs;
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const vsEntries = Object.entries(storedVsCounts).sort((a, b) => b[1] - a[1]);
  const businessCategoryEntries = Object.entries(storedProspects.reduce<Record<string, number>>((acc, p) => {
    const key = p.businessCategory ? (BUSINESS_CATEGORY_LABELS[p.businessCategory as keyof typeof BUSINESS_CATEGORY_LABELS] ?? tagLabel(String(p.businessCategory))) : "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const platformSignalEntries = Object.entries(storedProspects.reduce<Record<string, number>>((acc, p) => {
    for (const signal of p.platformSignals ?? []) acc[tagLabel(signal)] = (acc[tagLabel(signal)] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const total = results.length;

  return (
    <div>
      <HashtagDiagnosticsPanel run={run} />

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

      {/* Save Results panel */}
      <div style={{
        background: saveErrors.length > 0 ? "#fffbeb" : "#f0fdf4",
        border: `1px solid ${saveErrors.length > 0 ? "#fde68a" : "#bbf7d0"}`,
        borderRadius: 12, padding: "14px 18px", marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 10 }}>
          SAVE RESULTS
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>Saved</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#15803d" }}>{run.savedCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>Failed</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: saveErrors.length > 0 ? "#b91c1c" : "#a8a29e" }}>
              {run.failedToSaveCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>Seeded (total)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1c1917" }}>{run.totalCreators}</div>
          </div>
        </div>
        {saveErrors.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>
              FAILED SAVES — these seeds were not persisted:
            </div>
            {saveErrors.map((se, i) => (
              <div key={i} style={{
                fontSize: 11, background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 6, padding: "5px 10px", marginBottom: 4,
                display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
              }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1c1917" }}>@{se.handle}</span>
                <span style={{ color: "#9d174d" }}>#{se.sourceHashtag}</span>
                {se.platform && <span style={{ color: "#78716c" }}>{se.platform}</span>}
                <span style={{ color: "#b91c1c", flex: 1 }}>{se.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Apify Debug panel — per-hashtag actor diagnostics */}
      {diagnostics?.apifyTagDiagnostics && diagnostics.apifyTagDiagnostics.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setApifyDebugOpen((v) => !v)}
            style={{
              fontSize: 10, fontWeight: 700, color: "#9d174d", background: "#fdf2f8",
              border: "1px solid #fbcfe8", borderRadius: 6, padding: "4px 10px",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            🛰 Raw Apify Debug {apifyDebugOpen ? "▲" : "▼"}
          </button>

          {apifyDebugOpen && (
            <div style={{ marginTop: 8, background: "#1c1917", color: "#e7e5e4", borderRadius: 10, padding: "14px 18px", fontSize: 11, fontFamily: "monospace", overflowX: "auto" }}>
              <div style={{ marginBottom: 10, fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em" }}>
                APIFY TAG DIAGNOSTICS — {diagnostics.apifyTagDiagnostics.length} hashtag(s)
              </div>
              {diagnostics.apifyTagDiagnostics.map((d, i) => (
                <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < diagnostics.apifyTagDiagnostics!.length - 1 ? "1px solid #3f3f46" : "none" }}>
                  <div style={{ color: "#fcd34d", fontWeight: 700, marginBottom: 6 }}>#{d.hashtag}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 14px" }}>
                    {([
                      ["actorId",          d.actorId],
                      ["runId",            d.runId ?? "—"],
                      ["runStatus",        d.runStatus ?? "—"],
                      ["datasetId",        d.datasetId ?? "—"],
                      ["datasetItemCount", String(d.datasetItemCount)],
                      ["rawKeysSample",    d.rawKeysSample ? d.rawKeysSample.join(", ") : "—"],
                      ["usedFallback",     String(d.usedFallback)],
                      ["fallbackVariant",  d.fallbackVariant ?? "—"],
                    ] as [string, string][]).map(([k, v]) => (
                      <><span key={`k-${i}-${k}`} style={{ color: "#a8a29e" }}>{k}</span>
                      <span key={`v-${i}-${k}`} style={{ color: "#fef3c7", wordBreak: "break-all" }}>{v}</span></>
                    ))}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ color: "#a8a29e" }}>actorInput</span>{" "}
                    <span style={{ color: "#bbf7d0" }}>{JSON.stringify(d.actorInput)}</span>
                  </div>
                  {d.apifyErrorMessage && (
                    <div style={{ marginTop: 6, color: "#fca5a5" }}>
                      ⚠ {d.apifyErrorMessage}
                    </div>
                  )}
                  {d.datasetItemCount === 0 && !d.apifyErrorMessage && (
                    <div style={{ marginTop: 6, color: "#fdba74" }}>
                      Actor produced 0 items — Instagram may be rate-limiting this actor.
                      Actor was last updated {new Date().toISOString().slice(0, 10)}.
                      Try: HARVEST_MOCK=true for local testing, or use a different Apify actor.
                    </div>
                  )}
                  {d.rawItemSample && d.rawItemSample.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ color: "#a8a29e", marginBottom: 2 }}>rawItemSample[0]</div>
                      <div style={{ color: "#d4d4d8", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                        {JSON.stringify(d.rawItemSample[0], null, 2).slice(0, 600)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Debug panel — collapsible */}
      <div style={{ marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setDebugOpen((v) => !v)}
          style={{
            fontSize: 10, fontWeight: 700, color: "#78716c", background: "#f5f5f4",
            border: "1px solid #e7e5e4", borderRadius: 6, padding: "4px 10px",
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
          }}
        >
          🔍 Debug Panel {debugOpen ? "▲" : "▼"}
        </button>

        {debugOpen && (
          <div style={{ marginTop: 8, background: "#1c1917", color: "#e7e5e4", borderRadius: 10, padding: "14px 18px", fontSize: 11, fontFamily: "monospace" }}>
            <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em" }}>SAVE DIAGNOSTICS</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", alignItems: "start" }}>
              {([
                ["prospectStorePath",   run.prospectStorePath],
                ["prospectsBeforeCount", String(run.prospectsBeforeCount)],
                ["prospectsAfterCount",  String(run.prospectsAfterCount)],
                ["delta",               `+${(run.prospectsAfterCount ?? 0) - (run.prospectsBeforeCount ?? 0)}`],
                ["upsertAttemptCount",  String(run.upsertAttemptCount)],
                ["savedCount",          String(run.savedCount)],
                ["failedToSaveCount",   String(run.failedToSaveCount)],
                ["totalCreators",       String(run.totalCreators)],
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
            {saveErrors.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: "#fca5a5", marginBottom: 4 }}>saveErrors ({saveErrors.length})</div>
                {saveErrors.map((se, i) => (
                  <div key={i} style={{ color: "#fca5a5", marginBottom: 2 }}>
                    @{se.handle} #{se.sourceHashtag}: {se.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Left column */}
        <div>
          <BreakdownSection
            title="PRIMARY TYPE (this run)"
            entries={primaryTypeEntries}
            total={total}
            color="#6d28d9"
          />
          <BreakdownSection
            title="SUBTYPE (this run)"
            entries={secondaryTypeEntries}
            total={total}
            color="#1d4ed8"
          />
          <BreakdownSection
            title="BUSINESS CATEGORY — STORED REPOSITORY"
            entries={businessCategoryEntries}
            total={storedProspects.length}
            color="#9d174d"
          />
          {/* Confidence histogram */}
          <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 12 }}>
              CONFIDENCE DISTRIBUTION (this run)
            </div>
            {confBuckets.map(({ label, count, color }) => (
              <BreakdownBar key={label} label={label} count={count} total={total} color={color} />
            ))}
          </div>
          {/* Validation status from STORED prospects */}
          <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 4 }}>
              VALIDATION STATUS — STORED REPOSITORY
            </div>
            <div style={{ fontSize: 10, color: "#c4b5fd", marginBottom: 10 }}>
              {storedLoading ? "Loading…" : `${storedProspects.length} total prospects (Salon vertical)`}
            </div>
            {!storedLoading && vsEntries.length === 0 && (
              <div style={{ fontSize: 12, color: "#d6d3d1" }}>No stored prospects yet</div>
            )}
            {vsEntries.map(([label, count]) => (
              <BreakdownBar key={label} label={label} count={count} total={storedProspects.length} color="#7c3aed" />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div>
          <BreakdownSection
            title="SOURCE HASHTAG (this run)"
            entries={hashtagEntries}
            total={total}
            color="#9d174d"
          />
          <BreakdownSection
            title="MATCHED PLATFORM (this run)"
            entries={platformEntries}
            total={total}
            color="#0284c7"
          />
          <BreakdownSection
            title="PLATFORM SIGNALS — STORED REPOSITORY"
            entries={platformSignalEntries}
            total={storedProspects.length}
            color="#15803d"
          />
          {locationEntries.length > 0 && (
            <BreakdownSection
              title="DETECTED LOCATION — TOP 15 (this run)"
              entries={locationEntries}
              total={total}
              color="#78716c"
            />
          )}
        </div>
      </div>

      <div style={{ marginTop: 4, fontSize: 11, color: "#a8a29e" }}>
        All seeds (resolved + unresolved) are saved to the Discovered Entities repository.{" "}
        <Link href="/admin/studios/prospects" style={{ color: "#9d174d", fontWeight: 700, textDecoration: "none" }}>
          View {storedProspects.length > 0 ? `${storedProspects.length} stored` : "repository"} →
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
    padding: "8px 10px", fontSize: 14, color: "#57534e",
    borderBottom: "1px solid #f5f5f4", verticalAlign: "middle",
  };

  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: "pointer", background: expanded ? "#fdf2f8" : "transparent" }}
      >
        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#1c1917" }}>
          @{seed.handle}
        </td>
        <td style={tdStyle}>{seed.displayName !== seed.handle ? seed.displayName : <span style={{ color: "#d6d3d1" }}>—</span>}</td>
        <td style={{ ...tdStyle, fontSize: 14, color: "#9d174d" }}>#{seed.sourceHashtag}</td>
        <td style={{ ...tdStyle, fontSize: 14 }}>
          {seed.primaryType && seed.primaryType !== "unknown"
            ? <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
                {seed.primaryLabel ?? seed.primaryType}
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
        <td style={{ ...tdStyle, fontSize: 12 }}>{seed.detectedLocation ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
        <td style={{ ...tdStyle, fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: confColor(result.confidence) }}>
            {result.confidence || <span style={{ color: "#d6d3d1" }}>—</span>}
          </span>
        </td>
        <td style={tdStyle}>
          {result.prospectId ? (
            <a href="/admin/studios/prospects" onClick={(e) => e.stopPropagation()}
              style={{ fontSize: 14, color: "#9d174d", fontWeight: 700, textDecoration: "none" }}>
              Saved →
            </a>
          ) : result.saveError ? (
            <span title={result.saveError} style={{ fontSize: 10, color: "#b91c1c", fontWeight: 700, cursor: "help" }}>⚠ Failed</span>
          ) : (
            <span style={{ fontSize: 10, color: "#d6d3d1" }}>—</span>
          )}
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
                {seed.primaryType && seed.primaryType !== "unknown" && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>TYPE: </span>
                    <span style={{ fontSize: 11, color: "#6d28d9", fontWeight: 600 }}>
                      {seed.primaryLabel ?? seed.primaryType}
                    </span>
                  </div>
                )}
                {seed.secondaryType && seed.secondaryType !== "unknown" && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>SUBTYPE: </span>
                    <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>
                      {seed.secondaryLabel ?? seed.secondaryType}
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

type SortKey = "handle" | "displayname" | "hashtag" | "primarytype" | "besturl" | "platform" | "location" | "confidence" | "prospect";

function ResultsTable({ creators, results }: { creators: HarvestedCreatorSeed[]; results: ResolverPipelineResult[] }) {
  const [expandedHandle, setExpandedHandle] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterHashtag, setFilterHashtag] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterPrimaryType, setFilterPrimaryType] = useState("all");
  const [filterMinConf, setFilterMinConf] = useState(0);

  const hashtags = Array.from(new Set(creators.map((c) => c.sourceHashtag))).sort();
  const platforms = Array.from(new Set(results.map((r) => r.bestMatchPlatform).filter(Boolean) as string[])).sort();
  const primaryTypes = Array.from(new Set(results.map((r) => r.seed.primaryType).filter((t): t is string => !!t && t !== "unknown"))).sort();

  let filtered = [...results];
  if (filterHashtag !== "all") filtered = filtered.filter((r) => r.seed.sourceHashtag === filterHashtag);
  if (filterPlatform !== "all") filtered = filtered.filter((r) => r.bestMatchPlatform === filterPlatform);
  if (filterPrimaryType !== "all") filtered = filtered.filter((r) => r.seed.primaryType === filterPrimaryType);
  if (filterMinConf > 0) filtered = filtered.filter((r) => r.confidence >= filterMinConf);

  filtered.sort((a, b) => {
    let av: string | number = "", bv: string | number = "";
    switch (sortKey) {
      case "handle":      av = a.seed.handle;                 bv = b.seed.handle; break;
      case "displayname": av = a.seed.displayName ?? "";      bv = b.seed.displayName ?? ""; break;
      case "hashtag":     av = a.seed.sourceHashtag;          bv = b.seed.sourceHashtag; break;
      case "primarytype": av = a.seed.primaryType ?? "";      bv = b.seed.primaryType ?? ""; break;
      case "besturl":     av = a.bestMatchUrl ?? "";          bv = b.bestMatchUrl ?? ""; break;
      case "platform":    av = a.bestMatchPlatform ?? "";     bv = b.bestMatchPlatform ?? ""; break;
      case "location":    av = a.seed.detectedLocation ?? ""; bv = b.seed.detectedLocation ?? ""; break;
      case "confidence":  av = a.confidence;                  bv = b.confidence; break;
      case "prospect":    av = a.prospectId ? 1 : 0;         bv = b.prospectId ? 1 : 0; break;
    }
    const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "confidence" || key === "prospect" ? "desc" : "asc"); }
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
        <select value={filterPrimaryType} onChange={(e) => setFilterPrimaryType(e.target.value)} style={selectStyle}>
          <option value="all">All types</option>
          {primaryTypes.map((pt) => {
            const label = results.find((r) => r.seed.primaryType === pt)?.seed.primaryLabel ?? pt;
            return <option key={pt} value={pt}>{label}</option>;
          })}
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

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {([
                ["handle",      "Handle"],
                ["displayname", "Display Name"],
                ["hashtag",     "Hashtag"],
                ["primarytype", "Type"],
                ["besturl",     "Best URL"],
                ["platform",    "Platform"],
                ["location",    "Location"],
                ["confidence",  "Conf."],
                ["prospect",    "Prospect"],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th key={label} style={thStyle} onClick={() => toggleSort(key)}>
                  {label}
                  {sortKey === key
                    ? <span style={{ color: "#9d174d" }}>{sortDir === "asc" ? " ↑" : " ↓"}</span>
                    : <span style={{ color: "#d6d3d1" }}> ↕</span>
                  }
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

export default function HashtagHarvestPage() {
  // Parent owns only run state. ALL form state lives inside <HarvestForm>.
  // Incrementing runKey unmounts the old HarvestForm and mounts a fresh one —
  // no manual field clearing needed, ever.
  const [runKey,  setRunKey]  = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [runData, setRunData] = useState<{
    run: HashtagHarvestRun;
    creators: HarvestedCreatorSeed[];
    results: ResolverPipelineResult[];
    saveErrors: SaveError[];
    diagnostics: HashtagHarvestDiagnosticsPayload;
  } | null>(null);
  const [failedDiagnostics, setFailedDiagnostics] =
    useState<HashtagHarvestDiagnosticsPayload | null>(null);
  const [resultsTab, setResultsTab] = useState<"creators" | "reports">("creators");

  async function handleHarvestSubmit(params: HarvestRunRequest) {
    setLoading(true);
    setError(null);
    setRunData(null);
    setFailedDiagnostics(null);
    setResultsTab("creators");
    try {
      const res = await fetch("/api/admin/studios/creator-lab/hashtag-harvest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data: HarvestRunResponse | HarvestErrorResponse = await res.json();
      if (!data.ok) {
        const fail = data as HarvestErrorResponse;
        setError(
          `${fail.error}${fail.detail ? ` — ${fail.detail}` : ""}${
            fail.hashtagsParsed != null ? ` (${fail.hashtagsParsed} hashtags parsed)` : ""
          }`,
        );
        if (fail.diagnostics) setFailedDiagnostics(fail.diagnostics);
        return;
      }
      const ok = data as HarvestRunResponse;
      setRunData({
        run: ok.run,
        creators: ok.creators,
        results: ok.results,
        saveErrors: ok.saveErrors ?? [],
        diagnostics: ok.diagnostics,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleNewHarvest() {
    setRunData(null);
    setError(null);
    setFailedDiagnostics(null);
    setLoading(false);
    setRunKey((k) => k + 1); // unmounts current HarvestForm → mounts fresh one
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px", borderRadius: 20, border: "none",
    background: active ? "#1c1917" : "transparent",
    color: active ? "#fff" : "#78716c",
    fontWeight: 700, fontSize: 12, cursor: "pointer",
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>

      <CreatorIntelligenceNav current="hashtag-harvest" />

      <IntelligenceFeatureHeader
        title="Hashtag Harvest"
        description="Instagram hashtags only. To scan provider directories or source URLs, use Source URL."
        config={salonConfig}
      />

      <SalonStorageBadge />

      {/* Input form — HarvestForm owns all form state; incrementing runKey gives a clean slate */}
      {!runData && (
        <>
          <HarvestForm
            key={runKey}
            onSubmit={handleHarvestSubmit}
            loading={loading}
            error={error}
          />
          {failedDiagnostics ? <HarvestDiagnosticsSummary diagnostics={failedDiagnostics} /> : null}
        </>
      )}

      {/* Results */}
      {runData && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={handleNewHarvest}
              style={{ fontSize: 12, color: "#9d174d", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              ← New harvest
            </button>
            <span style={{ fontSize: 12, color: "#78716c" }}>
              Run {runData.run.runId} · {new Date(runData.run.createdAt).toLocaleString()}
            </span>
            <Link href="/admin/studios/prospects?vertical=salon"
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
              View Salon Prospects →
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

          <HarvestDiagnosticsSummary diagnostics={runData.diagnostics} />
          <SummaryCards run={runData.run} results={runData.results} />
          <HashtagDiagnosticsPanel run={runData.run} />

          {/* Zero-post source failure — actionable Apify diagnostics */}
          {runData.run.totalPosts === 0 && (
            <div style={{ marginBottom: 16, padding: "14px 18px", background: "#fef2f2", border: "2px solid #dc2626", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>
                ⛔ Source harvest returned 0 posts — resolver and prospect save skipped.
              </div>
              {runData.diagnostics?.apifyTagDiagnostics?.map((d, i) => (
                <div key={i} style={{ fontSize: 12, color: "#7f1d1d", marginBottom: 4, fontFamily: "monospace" }}>
                  <strong>#{d.hashtag}</strong> — actorId: {d.actorId} · runId: {d.runId ?? "—"} · status: {d.runStatus ?? "—"} · datasetId: {d.datasetId ?? "—"} · items: {d.datasetItemCount}
                  {d.apifyErrorMessage && <div style={{ color: "#b91c1c", marginTop: 2 }}>Error: {d.apifyErrorMessage}</div>}
                  {d.datasetItemCount === 0 && !d.apifyErrorMessage && (
                    <div style={{ color: "#92400e", marginTop: 2 }}>
                      Actor produced 0 dataset items. Input sent: <code>{JSON.stringify(d.actorInput)}</code>.
                      Likely cause: Instagram is rate-limiting the {d.actorId} actor (updated {new Date().toISOString().slice(0, 10)}).
                      Try a broader hashtag (e.g. &quot;hairstylist&quot;) via the raw-test route to confirm.
                    </div>
                  )}
                </div>
              ))}
              {(!runData.diagnostics?.apifyTagDiagnostics || runData.diagnostics.apifyTagDiagnostics.length === 0) && (
                <div style={{ fontSize: 12, color: "#7f1d1d" }}>
                  Apify run IDs: {runData.diagnostics?.apifyActorRunIds?.join(", ") || "none"}.
                  Check Reports → Raw Apify Debug for per-hashtag details.
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 11, color: "#78716c" }}>
                <strong>Next steps:</strong> (1) Test via <code>POST /api/admin/intelligence/salon/hashtag-harvest/raw-test</code> with a broad tag like &quot;hairstylist&quot;.
                (2) If items=0 there too, the actor is Instagram-blocked — try enabling <code>HARVEST_MOCK=true</code> in .env.local to run the full pipeline with synthetic data.
                (3) Check Apify console for account-level rate-limit or proxy issues.
              </div>
            </div>
          )}

          {/* Hard zero-save warning */}
          {runData.run.totalCreators > 0 && runData.run.savedCount === 0 && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2", border: "2px solid #dc2626", borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626", marginBottom: 4 }}>
                ⛔ Zero prospects saved — {runData.run.totalCreators} creator(s) were seeded but none persisted.
              </div>
              <div style={{ fontSize: 11, color: "#b91c1c" }}>
                Store path: <code style={{ fontFamily: "monospace", background: "#fee2e2", padding: "1px 4px", borderRadius: 3 }}>{runData.run.prospectStorePath}</code>
              </div>
              {runData.run.saveErrors.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#b91c1c" }}>
                  {runData.run.saveErrors.length} save error(s) — check Reports → Debug Panel for details.
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 11, color: "#78716c" }}>
                Check: Is <code style={{ fontFamily: "monospace" }}>VERCEL=1</code> set in .env.production.local? If running <code style={{ fontFamily: "monospace" }}>npm start</code>, the store writes to <code style={{ fontFamily: "monospace" }}>/tmp/</code>, not <code style={{ fontFamily: "monospace" }}>runtime-data/</code>. Use <code style={{ fontFamily: "monospace" }}>npm run dev</code> for local development.
              </div>
            </div>
          )}

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
              {runData.saveErrors.length > 0 && (
                <div style={{ marginBottom: 10, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#b91c1c" }}>
                  ⚠️ {runData.saveErrors.length} seed(s) failed to save. Check Reports tab for details.
                </div>
              )}
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
              saveErrors={runData.saveErrors}
              diagnostics={runData.diagnostics}
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
