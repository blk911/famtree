"use client";
// components/admin/intelligence/salon/BookingProviderPill.tsx

import { getBookingProviderLabel, type SalonBookingProvider } from "@/lib/intelligence/salon/provider-detector";

const PILL_COLORS: Partial<Record<SalonBookingProvider, { bg: string; fg: string }>> = {
  glossgenius: { bg: "#fdf2f8", fg: "#9d174d" },
  vagaro: { bg: "#eff6ff", fg: "#1d4ed8" },
  square: { bg: "#f5f5f4", fg: "#1c1917" },
  booksy: { bg: "#fef3c7", fg: "#b45309" },
  fresha: { bg: "#ecfdf5", fg: "#166534" },
  styleseat: { bg: "#ede9fe", fg: "#6d28d9" },
  schedulicity: { bg: "#f0f9ff", fg: "#0369a1" },
  acuity: { bg: "#fff7ed", fg: "#c2410c" },
  mangomint: { bg: "#f0fdf4", fg: "#15803d" },
  calendly: { bg: "#eff6ff", fg: "#1d4ed8" },
  timely: { bg: "#f0f9ff", fg: "#0369a1" },
  setmore: { bg: "#fef3c7", fg: "#b45309" },
  unknown: { bg: "#f5f5f4", fg: "#78716c" },
};

type Props = {
  provider?: string | null;
  label?: string | null;
  bookingUrl?: string | null;
  /** e.g. "(Handle Match)" when provider was derived from IG handle slug */
  sourceHint?: string | null;
  showImportChip?: boolean;
  size?: "sm" | "md";
};

export function BookingProviderPill({
  provider,
  label,
  bookingUrl,
  sourceHint,
  showImportChip = true,
  size = "sm",
}: Props) {
  const key = (provider ?? "unknown") as SalonBookingProvider;
  const colors = PILL_COLORS[key] ?? PILL_COLORS.unknown ?? { bg: "#f5f5f4", fg: "#78716c" };
  const baseLabel = label ?? getBookingProviderLabel(key);
  const text = sourceHint ? `${baseLabel} ${sourceHint}` : baseLabel;
  const fontSize = size === "md" ? 11 : 10;
  const padding = size === "md" ? "3px 9px" : "2px 7px";

  if (!provider || provider === "unknown") {
    return (
      <span style={{ fontSize, color: "#d6d3d1" }}>—</span>
    );
  }

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {bookingUrl ? (
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize,
            fontWeight: 700,
            background: colors.bg,
            color: colors.fg,
            borderRadius: 20,
            padding,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </a>
      ) : (
        <span
          style={{
            fontSize,
            fontWeight: 700,
            background: colors.bg,
            color: colors.fg,
            borderRadius: 20,
            padding,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </span>
      )}
      {showImportChip && (provider === "glossgenius" || provider === "vagaro") && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.04em",
            background: "#ecfdf5",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: 20,
            padding: "2px 6px",
          }}
        >
          Import Candidate
        </span>
      )}
    </span>
  );
}
