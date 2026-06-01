"use client";

import type { ProviderDetectionSummary } from "@/lib/intelligence/salon/provider-detection-diagnostics";

type Props = {
  title?: string;
  summary: ProviderDetectionSummary;
};

export function BookingProviderDetectionStrip({
  title = "Booking provider detection",
  summary,
}: Props) {
  const items: Array<[string, number]> = [
    ["Total prospects", summary.total],
    ["With any URL", summary.withAnyUrl],
    ["Link-in-bio URL", summary.withLinkInBioUrl],
    ["Link-in-bio fetched", summary.linkInBioPagesFetched],
    ["Provider detected", summary.providerDetected],
    ["GlossGenius", summary.glossgenius],
    ["Vagaro", summary.vagaro],
    ["Square", summary.square],
    ["Unknown / none", summary.unknownNoProvider],
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#1c1917", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: "#57534e" }}>
        {items.map(([label, val]) => (
          <span
            key={label}
            style={{ background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: 8, padding: "6px 10px" }}
          >
            <strong>{label}:</strong> {val}
          </span>
        ))}
      </div>
    </div>
  );
}
