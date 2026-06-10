"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import {
  ADMIN_INTEL_BODY,
  ADMIN_INTEL_CARD_LABEL,
  ADMIN_INTEL_META,
} from "@/components/admin/intelligence/salon/admin-intelligence-typography";
import type { SalonSourceRunRecord } from "@/lib/studios/source-runs/types";

type RunsResponse = {
  ok: boolean;
  runs: SalonSourceRunRecord[];
  artifactPath?: string;
};

export default function SalonSourceRunsPage() {
  const searchParams = useSearchParams();
  const highlightRun = searchParams.get("run");
  const [runs, setRuns] = useState<SalonSourceRunRecord[]>([]);
  const [artifactPath, setArtifactPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/intelligence/salon/source-runs", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: RunsResponse) => {
        if (data.ok) {
          setRuns(data.runs);
          setArtifactPath(data.artifactPath ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const highlighted = useMemo(
    () => runs.find((run) => run.runId === highlightRun) ?? null,
    [runs, highlightRun],
  );

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <CreatorIntelligenceNav current="source-ingest" />
      <IntelligenceFeatureHeader
        title="Salon Source Runs"
        description="Recent Source URL ingest runs and promotion handoff status."
        config={salonConfig}
      />

      {artifactPath ? (
        <p style={{ ...ADMIN_INTEL_META, marginBottom: 16 }}>
          Artifact: <code>{artifactPath}</code>
        </p>
      ) : null}

      {loading ? <p style={ADMIN_INTEL_META}>Loading runs…</p> : null}

      {highlighted ? (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 14,
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <h2 style={{ ...ADMIN_INTEL_CARD_LABEL, margin: "0 0 8px" }}>
            Run {highlighted.runId}
          </h2>
          <p style={{ ...ADMIN_INTEL_BODY, margin: "0 0 8px" }}>
            {highlighted.sourceProvider} · {highlighted.slug} · {highlighted.status}
          </p>
          <p style={{ ...ADMIN_INTEL_META, margin: 0 }}>
            Listings {highlighted.listingsFound} · Profiles {highlighted.profilesEnriched} ·
            Resolver {highlighted.resolverCandidatesCreated} · Markets{" "}
            {highlighted.marketCandidatesCreated}
          </p>
        </div>
      ) : null}

      {!loading && runs.length === 0 ? (
        <p style={ADMIN_INTEL_META}>No source runs recorded yet.</p>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        {runs.map((run) => (
          <div
            key={run.runId}
            style={{
              background: run.runId === highlightRun ? "#fafaf9" : "#fff",
              border: `1px solid ${run.runId === highlightRun ? "#9d174d" : "#e7e5e4"}`,
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <strong style={ADMIN_INTEL_BODY}>{run.runId}</strong>
              <span style={ADMIN_INTEL_META}>{new Date(run.createdAt).toLocaleString()}</span>
              <span style={ADMIN_INTEL_META}>{run.status}</span>
            </div>
            <p style={{ ...ADMIN_INTEL_META, margin: "8px 0" }}>
              {run.sourceProvider} / {run.slug} — listings {run.listingsFound}, resolver{" "}
              {run.resolverCandidatesCreated}, markets {run.marketCandidatesCreated}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link href={run.nextLinks.markets} style={{ fontSize: 12, fontWeight: 700, color: "#9d174d" }}>
                Markets
              </Link>
              <Link href={run.nextLinks.solaDetail} style={{ fontSize: 12, fontWeight: 700, color: "#9d174d" }}>
                Sola detail
              </Link>
              <Link
                href={`/admin/studios/source-runs?run=${encodeURIComponent(run.runId)}`}
                style={{ fontSize: 12, fontWeight: 700, color: "#9d174d" }}
              >
                View run
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
