"use client";

import type { GgResolverRunDiagnostics } from "@/lib/intelligence/salon/gg-resolver-types";

type Props = Partial<GgResolverRunDiagnostics> & {
  title?: string;
  compact?: boolean;
};

function Metric({
  label,
  value,
  compact,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "8px 10px",
        minWidth: 72,
        flex: "1 1 72px",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: compact ? 15 : 18,
          fontWeight: 800,
          color: "#1c1917",
          marginTop: 3,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function GgResolverDiagnosticsCard({
  title = "GlossGenius resolver",
  compact = false,
  dedupedProspects = 0,
  ggEligibleProspects = 0,
  ggSkippedProviderAlreadyDetected = 0,
  ggSkippedNoHandle = 0,
  ggSkippedCap = 0,
  ggAttemptedHandle = 0,
  ggAttemptedDisplay = 0,
  ggFoundHandle = 0,
  ggFoundDisplay = 0,
  ggNotFound = 0,
  ggTimeout = 0,
  ggError = 0,
  ggCheckedUrlsCount = 0,
  ggCandidatesTested = 0,
  ggConfirmedClientPages = 0,
  ggGenericHomepage = 0,
  ggTimeouts = 0,
}: Props) {
  const show = (n?: number) => (n === undefined || n === null ? "—" : n);
  const fontSize = compact ? 11 : 12;

  const metrics: [string, number | string][] = compact
    ? [
        ["Deduped", show(dedupedProspects)],
        ["Eligible", show(ggEligibleProspects)],
        ["Found H", show(ggFoundHandle)],
        ["Found D", show(ggFoundDisplay)],
        ["Cap skip", show(ggSkippedCap)],
        ["Not found", show(ggNotFound)],
      ]
    : [
        ["Deduped", show(dedupedProspects)],
        ["GG eligible", show(ggEligibleProspects)],
        ["Skip provider", show(ggSkippedProviderAlreadyDetected)],
        ["Skip no handle", show(ggSkippedNoHandle)],
        ["Skip cap", show(ggSkippedCap)],
        ["Attempt handle", show(ggAttemptedHandle)],
        ["Attempt display", show(ggAttemptedDisplay)],
        ["Found handle", show(ggFoundHandle)],
        ["Found display", show(ggFoundDisplay)],
        ["Not found", show(ggNotFound)],
        ["Timeout", show(ggTimeout)],
        ["Error", show(ggError)],
        ["URLs checked", show(ggCheckedUrlsCount)],
        ["GG candidates tested", show(ggCandidatesTested)],
        ["GG confirmed pages", show(ggConfirmedClientPages)],
        ["GG generic/home", show(ggGenericHomepage)],
        ["GG validation timeouts", show(ggTimeouts)],
      ];

  return (
    <div style={{ marginBottom: compact ? 8 : 16 }}>
      <div style={{ fontSize, fontWeight: 800, color: "#78716c", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 6 : 8 }}>
        {metrics.map(([label, value]) => (
          <Metric key={label} label={label} value={value} compact={compact} />
        ))}
      </div>
    </div>
  );
}
