"use client";

import type { GoogleIdentityRecord } from "@/lib/intelligence/salon/google-identity/types";
import {
  ADMIN_INTEL_DRAWER_LABEL,
  ADMIN_INTEL_DRAWER_VALUE,
  ADMIN_INTEL_META,
  ADMIN_INTEL_SECTION_TITLE,
} from "./admin-intelligence-typography";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  confirmed: { bg: "#dcfce7", fg: "#15803d" },
  probable: { bg: "#dbeafe", fg: "#1d4ed8" },
  possible: { bg: "#fef3c7", fg: "#b45309" },
  conflict: { bg: "#fee2e2", fg: "#b91c1c" },
  not_found: { bg: "#f5f5f4", fg: "#78716c" },
};

export function GoogleIdentitySection({
  record,
}: {
  record: GoogleIdentityRecord | null | undefined;
}) {
  if (!record) {
    return (
      <section style={{ marginBottom: 20 }}>
        <div style={ADMIN_INTEL_SECTION_TITLE}>GOOGLE IDENTITY</div>
        <div
          style={{
            ...ADMIN_INTEL_DRAWER_VALUE,
            color: "#78716c",
            background: "#fafaf9",
            border: "1px solid #e7e5e4",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          Google Identity Audit has not been run.
        </div>
      </section>
    );
  }

  const tone = STATUS_COLORS[record.status] ?? STATUS_COLORS.not_found;

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={ADMIN_INTEL_SECTION_TITLE}>GOOGLE IDENTITY</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 6,
            background: tone.bg,
            color: tone.fg,
            textTransform: "capitalize",
          }}
        >
          {record.status.replace(/_/g, " ")}
        </span>
        <span style={{ ...ADMIN_INTEL_META, color: "#78716c" }}>
          {record.matchConfidence}% confidence
        </span>
      </div>
      <Row label="Google Business">{record.googleBusinessName ?? "—"}</Row>
      <Row label="Place ID">{record.googlePlaceId ?? "—"}</Row>
      <Row label="Website">
        <LinkOrNa href={record.googleWebsite} />
      </Row>
      <Row label="Phone">{record.googlePhone ?? "—"}</Row>
      <Row label="Rating">
        {record.rating != null
          ? `${record.rating}${record.reviewCount != null ? ` (${record.reviewCount} reviews)` : ""}`
          : "—"}
      </Row>
      <Row label="Match reason">{record.matchReason}</Row>
      {record.status === "conflict" && record.evidence.length > 0 ? (
        <Row label="Conflict reasons">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {record.evidence.map((e) => (
              <li key={e} style={{ ...ADMIN_INTEL_DRAWER_VALUE, marginBottom: 2, wordBreak: "break-word" }}>
                {e}
              </li>
            ))}
          </ul>
        </Row>
      ) : null}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={ADMIN_INTEL_DRAWER_LABEL}>{label}</div>
      <div style={ADMIN_INTEL_DRAWER_VALUE}>{children}</div>
    </div>
  );
}

function LinkOrNa({ href }: { href?: string }) {
  if (!href) return <span>—</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: "#9d174d", wordBreak: "break-all" }}>
      {href}
    </a>
  );
}
