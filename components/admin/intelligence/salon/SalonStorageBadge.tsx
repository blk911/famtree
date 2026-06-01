"use client";

import { useEffect, useState } from "react";
import type { SalonStorageStatus } from "@/lib/intelligence/salon/storage-status";

export function SalonStorageBadge() {
  const [status, setStatus] = useState<SalonStorageStatus | null>(null);

  useEffect(() => {
    fetch("/api/admin/intelligence/salon/storage/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: SalonStorageStatus) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  const durable = status.durable && status.backend === "postgres";
  const label = durable
    ? "Storage: Postgres durable"
    : "Storage: JSON fallback / ephemeral warning";

  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "6px 10px",
        borderRadius: 8,
        background: durable ? "#ecfdf5" : "#fef3c7",
        color: durable ? "#166534" : "#b45309",
        border: `1px solid ${durable ? "#bbf7d0" : "#fde68a"}`,
        marginBottom: 12,
      }}
      title={status.warnings.join("\n") || undefined}
    >
      {label}
      {status.warnings.length > 0 && !durable ? (
        <span style={{ display: "block", fontWeight: 500, fontSize: 10, marginTop: 2 }}>
          {status.warnings[0]}
        </span>
      ) : null}
    </div>
  );
}
