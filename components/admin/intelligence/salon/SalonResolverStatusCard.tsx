"use client";

import type { SalonResolverRunDiagnostics } from "@/lib/intelligence/salon/salon-resolver-diagnostics";

type Props = SalonResolverRunDiagnostics & {
  title?: string;
};

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "10px 12px",
        minWidth: 88,
        flex: "1 1 88px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

export function SalonResolverStatusCard({
  title = "Resolver status",
  harvested = 0,
  deduped = 0,
  resolved = 0,
  providerFound = 0,
  ggDirect = 0,
  ggLinkInBio = 0,
  ggHandleMatch = 0,
  ggDisplayMatch = 0,
  importCandidates = 0,
  unknown = 0,
}: Props) {
  const show = (n?: number) => (n === undefined || n === null ? "—" : n);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#78716c", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <MetricCard label="Harvested" value={show(harvested)} />
        <MetricCard label="Deduped" value={show(deduped)} />
        <MetricCard label="Resolved" value={show(resolved)} />
        <MetricCard label="Provider Found" value={show(providerFound)} />
        <MetricCard label="GG Direct" value={show(ggDirect)} />
        <MetricCard label="GG Link-in-Bio" value={show(ggLinkInBio)} />
        <MetricCard label="GG Handle Match" value={show(ggHandleMatch)} />
        <MetricCard label="GG Display Match" value={show(ggDisplayMatch)} />
        <MetricCard label="Import Candidates" value={show(importCandidates)} />
        <MetricCard label="Unknown" value={show(unknown)} />
      </div>
    </div>
  );
}
