"use client";

import { useEffect, useState } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import { SalonResolverStatusCard } from "@/components/admin/intelligence/salon/SalonResolverStatusCard";
import { BookingProviderDetectionStrip } from "@/components/admin/intelligence/salon/BookingProviderDetectionStrip";
import { GgResolverDiagnosticsCard } from "@/components/admin/intelligence/salon/GgResolverDiagnosticsCard";
import { ProviderDiscoveryBackfillButton } from "@/components/admin/intelligence/salon/ProviderDiscoveryBackfillButton";
import type { HarvestAnalyticsPayload } from "@/lib/intelligence/salon/harvest-analytics";
import type { ProviderDetectionSummary } from "@/lib/intelligence/salon/provider-detection-diagnostics";

export default function HarvestAnalyticsPage() {
  const [data, setData] = useState<HarvestAnalyticsPayload | null>(null);
  const [providerSummary, setProviderSummary] = useState<ProviderDetectionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/intelligence/salon/harvest-analytics", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/studios/prospects/provider-diagnostics", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([harvest, diag]) => {
        if (harvest.ok) setData(harvest as HarvestAnalyticsPayload & { ok: boolean });
        if (diag.ok && diag.summary) setProviderSummary(diag.summary);
      })
      .finally(() => setLoading(false));
  }, []);

  const t = data?.totals;

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <CreatorIntelligenceNav current="harvest-analytics" />
      <IntelligenceFeatureHeader
        title="Harvest Analytics"
        description="Analyze hashtag harvest quality, resolver coverage, and booking provider discovery."
        config={salonConfig}
      />
      <SalonStorageBadge />

      {loading ? (
        <div style={{ fontSize: 13, color: "#78716c" }}>Loading…</div>
      ) : !t ? (
        <div style={{ fontSize: 13, color: "#78716c" }}>No harvest data yet.</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {[
              ["Harvest runs", t.totalHarvestRuns],
              ["Hashtags", t.totalHashtags],
              ["Posts pulled", t.totalPostsPulled],
              ["Creators found", t.totalCreatorsFound],
              ["Deduped", t.totalDedupedProspects],
              ["Providers", t.providersDetected],
              ["GlossGenius", t.glossGeniusTotal],
              ["Vagaro", t.vagaroTotal],
              ["Coverage %", t.providerCoveragePct],
            ].map(([label, val]) => (
              <div
                key={String(label)}
                style={{
                  background: "#fff",
                  border: "1px solid #e7e5e4",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{val}</div>
              </div>
            ))}
          </div>

          {providerSummary ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 12 }}>
                Provider Discovery Diagnostics
              </div>
              <SalonResolverStatusCard
                title="Resolver coverage (salon prospects)"
                harvested={t.totalCreatorsFound}
                deduped={t.totalDedupedProspects}
                resolved={t.providersDetected}
                providerFound={t.providersDetected}
                ggDirect={t.ggDirect}
                ggLinkInBio={t.ggLinkInBio}
                ggHandleMatch={t.ggHandleMatches}
                ggDisplayMatch={t.ggDisplayMatches}
                importCandidates={t.importCandidates}
                unknown={providerSummary.unknownNoProvider}
              />
              <BookingProviderDetectionStrip summary={providerSummary} />
            </>
          ) : null}

          {data?.recentRuns?.[0]?.resolverDiagnostics ? (
            <GgResolverDiagnosticsCard
              title="Latest harvest — GlossGenius resolver"
              {...data.recentRuns[0].resolverDiagnostics}
            />
          ) : null}

          <ProviderDiscoveryBackfillButton limit={100} />

          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Per hashtag</h3>
          <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#fafaf9" }}>
                  {[
                    "Hashtag",
                    "Posts",
                    "Creators",
                    "Deduped",
                    "Providers",
                    "GG Direct",
                    "GG Lib",
                    "GG Handle",
                    "GG Display",
                    "Vagaro",
                    "Final",
                    "Last run",
                  ].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#a8a29e" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.perHashtag ?? []).map((row) => (
                  <tr key={row.hashtag} style={{ borderTop: "1px solid #f5f5f4" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 700 }}>#{row.hashtag}</td>
                    <td style={{ padding: "8px 10px" }}>{row.postsPulled}</td>
                    <td style={{ padding: "8px 10px" }}>{row.creatorsFound}</td>
                    <td style={{ padding: "8px 10px" }}>{row.creatorsDeduped}</td>
                    <td style={{ padding: "8px 10px" }}>{row.bookingProvidersFound}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtTrack(row.ggDirect)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtTrack(row.ggLinkInBio)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtTrack(row.ggHandleMatch)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtTrack(row.ggDisplayMatch)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtTrack(row.vagaro)}</td>
                    <td style={{ padding: "8px 10px" }}>{row.finalProspects}</td>
                    <td style={{ padding: "8px 10px" }}>
                      {row.lastRun ? new Date(row.lastRun).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.perHashtag ?? []).length === 0 ? (
              <div style={{ padding: 20, color: "#78716c" }}>No per-hashtag stats yet — run Hashtag Harvest.</div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function fmtTrack(v: number | "not_tracked_yet" | undefined): string | number {
  if (v === "not_tracked_yet" || v === undefined) return "Not tracked yet";
  return v;
}
