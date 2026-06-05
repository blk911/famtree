"use client";

import type { TranspoDataSourceStatus } from "@/lib/intelligence/transpo/data-confidence/data-confidence-types";

const STYLES: Record<TranspoDataSourceStatus, { fg: string; bg: string; label: string }> = {
  live: { fg: "#166534", bg: "#dcfce7", label: "Live" },
  seeded: { fg: "#1d4ed8", bg: "#dbeafe", label: "Seeded" },
  heuristic: { fg: "#92400e", bg: "#fef3c7", label: "Heuristic" },
  missing: { fg: "#991b1b", bg: "#fef2f2", label: "Missing" },
  error: { fg: "#7f1d1d", bg: "#fecaca", label: "Error" },
};

type Props = {
  status: TranspoDataSourceStatus;
  compact?: boolean;
};

export function DataSourceStatusBadge({ status, compact }: Props) {
  const s = STYLES[status] ?? STYLES.missing;
  return (
    <span
      style={{
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        padding: compact ? "1px 6px" : "2px 8px",
        borderRadius: 20,
        color: s.fg,
        background: s.bg,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
