"use client";

import Link from "next/link";
import { VmbCard } from "@/components/vmb/VmbCard";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { ActiveBookResolution } from "@/lib/vmb/active-book-resolver";

type Props = {
  activeBook: ActiveBookResolution;
  onReplace: () => void;
};

function formatAnalyzedAt(updatedAt?: string): string {
  if (!updatedAt) return "Recently";
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function VmbActiveBookResume({ activeBook, onReplace }: Props) {
  const todayHref = activeBook.analysisId
    ? `/vmb/today?analysis=${encodeURIComponent(activeBook.analysisId)}`
    : "/vmb/today";

  return (
    <VmbCard padding="md">
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: VMB_THEME.muted,
        }}
      >
        Current book loaded
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: VMB_THEME.ink }}>
        {activeBook.clientCount ?? activeBook.recordCount ?? 0} clients
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 14, color: VMB_THEME.muted }}>
        {activeBook.recordCount ?? 0} records
      </p>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: VMB_THEME.muted }}>
        Last analyzed: {formatAnalyzedAt(activeBook.updatedAt)}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link
          href={todayHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "12px 18px",
            borderRadius: 12,
            border: "none",
            background: VMB_THEME.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Continue with Current Book
        </Link>
        <button
          type="button"
          onClick={onReplace}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: `1px solid ${VMB_THEME.line}`,
            background: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            color: VMB_THEME.ink,
          }}
        >
          Replace Book
        </button>
      </div>
    </VmbCard>
  );
}
