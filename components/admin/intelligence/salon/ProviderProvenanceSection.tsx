"use client";

import {
  ASSIGNMENT_SOURCE_LABELS,
  type ProviderProvenanceRecord,
} from "@/lib/intelligence/salon/provider-provenance/types";

export function ProviderProvenanceSection({
  record,
}: {
  record: ProviderProvenanceRecord | null | undefined;
}) {
  if (!record) {
    return (
      <section style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#a8a29e",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          PROVIDER PROVENANCE
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#78716c",
            background: "#fafaf9",
            border: "1px solid #e7e5e4",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          Provider provenance not available. Run Provider Provenance Audit.
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "#a8a29e",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        PROVIDER PROVENANCE
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <Pill label={record.providerLabel} tone="neutral" />
        <Pill
          label={record.confirmed ? "Confirmed" : "Unconfirmed"}
          tone={record.confirmed ? "good" : "bad"}
        />
        <Pill label={ASSIGNMENT_SOURCE_LABELS[record.assignmentSource]} tone="neutral" />
      </div>
      <Row label="Assignment source">{ASSIGNMENT_SOURCE_LABELS[record.assignmentSource]}</Row>
      <Row label="Confirmed?">{record.confirmed ? "Yes" : "No"}</Row>
      <Row label="Validation status">{record.validationStatus ?? "Not attempted"}</Row>
      <Row label="Confidence">{record.confidence ?? "—"}</Row>
      <Row label="Candidate URL">
        <LinkOrNa href={record.candidateUrl} />
      </Row>
      <Row label="Validated URL">
        <LinkOrNa href={record.validatedUrl} />
      </Row>
      <Row label="Reason">{record.reason}</Row>
      <Row label="Evidence">
        {record.evidence.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {record.evidence.slice(0, 12).map((e) => (
              <li key={e} style={{ fontSize: 11, marginBottom: 2 }}>
                {e}
              </li>
            ))}
          </ul>
        ) : (
          "—"
        )}
      </Row>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#44403c", lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

function LinkOrNa({ href }: { href?: string }) {
  if (!href) return <span>Not available</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#0284c7", wordBreak: "break-all" }}>
      {href}
    </a>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "bad" | "neutral";
}) {
  const colors =
    tone === "good"
      ? { bg: "#dcfce7", fg: "#166534" }
      : tone === "bad"
        ? { bg: "#fee2e2", fg: "#b91c1c" }
        : { bg: "#f5f5f4", fg: "#57534e" };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        background: colors.bg,
        color: colors.fg,
        borderRadius: 20,
        padding: "3px 10px",
      }}
    >
      {label}
    </span>
  );
}
