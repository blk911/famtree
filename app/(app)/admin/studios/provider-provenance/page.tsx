"use client";

import { useCallback, useEffect, useState } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import { SalonProspectDrawer } from "@/components/admin/intelligence/salon/SalonProspectDrawer";
import {
  ASSIGNMENT_SOURCE_LABELS,
  type ProviderProvenanceBadAssignment,
  type ProviderProvenanceQuestions,
  type ProviderProvenanceRecord,
  type ProviderProvenanceReport,
} from "@/lib/intelligence/salon/provider-provenance/types";

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 10,
  fontWeight: 700,
  color: "#78716c",
  borderBottom: "1px solid #e7e5e4",
  whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 11,
  color: "#57534e",
  borderBottom: "1px solid #f5f5f4",
  verticalAlign: "top",
};

export default function ProviderProvenancePage() {
  const [report, setReport] = useState<ProviderProvenanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/provider-provenance", {
        cache: "no-store",
      });
      const json = (await res.json()) as ProviderProvenanceReport & { ok: boolean; detail?: string };
      if (!json.ok) setError(json.detail ?? "Load failed");
      else setReport(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runBackfill() {
    setBackfillLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/provider-provenance/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 500, persist: true }),
      });
      const json = (await res.json()) as { ok: boolean; detail?: string; error?: string };
      if (!json.ok) setError(json.detail ?? json.error ?? "Backfill failed");
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfillLoading(false);
    }
  }

  const s = report?.summary;

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <CreatorIntelligenceNav current="provider-provenance" />
      <IntelligenceFeatureHeader
        title="Provider Provenance Audit"
        description="Explain why every provider assignment exists before scoring or outreach."
        config={salonConfig}
      />
      <SalonStorageBadge />

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={runBackfill}
          disabled={backfillLoading}
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: backfillLoading ? "#d6d3d1" : "#9d174d",
            color: "#fff",
            cursor: backfillLoading ? "not-allowed" : "pointer",
          }}
        >
          {backfillLoading ? "Running backfill…" : "Run Provenance Backfill"}
        </button>
        <button type="button" onClick={load} style={btnStyle}>
          Refresh
        </button>
        {report?.fromCache ? (
          <span style={{ fontSize: 11, color: "#78716c", alignSelf: "center" }}>
            Cached snapshot · {report.computedAt}
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            padding: "12px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            fontSize: 12,
            color: "#b91c1c",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ fontSize: 13, color: "#78716c" }}>Loading…</div>
      ) : s ? (
        <>
          <Section title="SUMMARY">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              <Card label="Provider assignments" value={s.storedAssignments} color="#1c1917" />
              <Card label="Provenance coverage" value={`${s.provenanceCoveragePercent}%`} color={s.provenanceCoveragePercent >= 70 ? "#15803d" : "#b45309"} />
              <Card label="With provenance" value={s.assignmentsWithProvenance} color="#15803d" />
              <Card label="Without provenance" value={s.assignmentsWithoutProvenance} color="#dc2626" />
              <Card label="Display eligible" value={s.displayEligibleAssignments} color="#15803d" />
              <Card label="Hidden (gate)" value={s.hiddenUnconfirmedAssignments} color="#dc2626" />
              <Card label="Confirmed" value={s.confirmedAssignments} color="#15803d" />
              <Card label="Generated" value={s.generatedAssignments} color="#7c3aed" />
              <Card label="Bad assignments" value={s.badAssignments} color="#b45309" />
            </div>
          </Section>

          <Section title="PROVIDER TRUST TABLE">
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Provider", "Total", "Confirmed", "Generated", "Rejected", "Unknown", "Trust"].map(
                      (h) => (
                        <th key={h} style={thStyle}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {s.byProvider.map((row) => (
                    <tr key={row.provider}>
                      <td style={tdStyle}>
                        <strong>{row.providerLabel}</strong>
                        <div style={{ fontSize: 10, color: "#a8a29e" }}>{row.provider}</div>
                      </td>
                      <td style={tdStyle}>{row.total}</td>
                      <td style={{ ...tdStyle, color: "#15803d", fontWeight: 700 }}>{row.confirmed}</td>
                      <td style={tdStyle}>{row.generated}</td>
                      <td style={tdStyle}>{row.rejected}</td>
                      <td style={tdStyle}>{row.unknown}</td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{row.trustScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Section>

          <Section title="BAD ASSIGNMENTS">
            <BadTable rows={report.badAssignments} onRowClick={setDrawerId} />
          </Section>

          <Section title="DETAIL — ALL ASSIGNMENTS">
            <DetailTable records={report.records} onRowClick={setDrawerId} />
          </Section>

          <Section title="QUESTIONS ANSWERED">
            <QuestionsBlock questions={report.questions} />
          </Section>
        </>
      ) : null}

      <SalonProspectDrawer
        prospectId={drawerId}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
      />
    </div>
  );
}

function BadTable({
  rows,
  onRowClick,
}: {
  rows: ProviderProvenanceBadAssignment[];
  onRowClick: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#15803d", padding: 16, background: "#f0fdf4", borderRadius: 10 }}>
        No bad assignments — every stored provider has confirmed provenance.
      </div>
    );
  }
  return (
    <TableWrap>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Prospect", "Provider", "Source", "Validation", "Candidate URL", "Reason"].map((h) => (
              <th key={h} style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.prospectId}
              style={{ cursor: "pointer" }}
              onClick={() => onRowClick(r.prospectId)}
            >
              <td style={tdStyle}>
                <strong>@{r.instagramHandle}</strong>
                <div style={{ fontSize: 10, color: "#a8a29e" }}>{r.displayName}</div>
              </td>
              <td style={tdStyle}>{r.providerLabel}</td>
              <td style={tdStyle}>{ASSIGNMENT_SOURCE_LABELS[r.assignmentSource]}</td>
              <td style={tdStyle}>{r.validationStatus ?? "—"}</td>
              <td style={{ ...tdStyle, maxWidth: 180, wordBreak: "break-all" }}>
                {r.candidateUrl ? (
                  <a href={r.candidateUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    {shortUrl(r.candidateUrl)}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td style={{ ...tdStyle, maxWidth: 240 }}>
                {r.reason}
                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {r.flags.map((f) => (
                    <span
                      key={f}
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#fef3c7",
                        color: "#b45309",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function DetailTable({
  records,
  onRowClick,
}: {
  records: ProviderProvenanceRecord[];
  onRowClick: (id: string) => void;
}) {
  return (
    <TableWrap>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {[
              "Prospect",
              "Provider",
              "Source",
              "Confirmed",
              "Validation",
              "Conf.",
              "Candidate URL",
              "Validated URL",
              "Reason",
            ].map((h) => (
              <th key={h} style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr
              key={r.id}
              style={{ cursor: "pointer", opacity: r.confirmed ? 1 : 0.92 }}
              onClick={() => onRowClick(r.prospectId)}
            >
              <td style={tdStyle}>@{r.instagramHandle}</td>
              <td style={tdStyle}>{r.providerLabel}</td>
              <td style={tdStyle}>{ASSIGNMENT_SOURCE_LABELS[r.assignmentSource]}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: r.confirmed ? "#15803d" : "#dc2626" }}>
                {r.confirmed ? "Yes" : "No"}
              </td>
              <td style={tdStyle}>{r.validationStatus ?? "—"}</td>
              <td style={tdStyle}>{r.confidence ?? "—"}</td>
              <td style={{ ...tdStyle, maxWidth: 140, wordBreak: "break-all" }}>
                {r.candidateUrl ? shortUrl(r.candidateUrl) : "—"}
              </td>
              <td style={{ ...tdStyle, maxWidth: 140, wordBreak: "break-all" }}>
                {r.validatedUrl ? shortUrl(r.validatedUrl) : "—"}
              </td>
              <td style={{ ...tdStyle, maxWidth: 200 }}>{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function QuestionsBlock({ questions }: { questions: ProviderProvenanceQuestions }) {
  const items: Array<[string, string, string]> = [
    ["Q1", "How many provider assignments exist?", questions.q1_total_assignments],
    ["Q2", "How many are confirmed?", questions.q2_confirmed_count],
    ["Q3", "How many came from direct evidence?", questions.q3_direct_evidence],
    ["Q4", "How many came from generated candidates?", questions.q4_generated_candidates],
    ["Q5", "How many survived validation?", questions.q5_survived_validation],
    ["Q6", "Are any providers assigned without proof?", questions.q6_without_proof],
    ["Q7", "What provider has weakest provenance?", questions.q7_weakest_provider],
    ["Q8", "What provider has strongest provenance?", questions.q8_strongest_provider],
    [
      "Q9",
      "What percentage of provider assignments have explainable provenance?",
      questions.q9_provenance_coverage_pct,
    ],
    [
      "Q10",
      "How many stored provider assignments are hidden by the display gate?",
      questions.q10_hidden_stored_assignments,
    ],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(([q, label, text]) => (
        <div
          key={q}
          style={{
            background: "#fff",
            border: "1px solid #e7e5e4",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: "#9d174d", marginBottom: 4 }}>{q}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 12, color: "#57534e", lineHeight: 1.55 }}>{text}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#a8a29e",
          letterSpacing: "0.07em",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div
      style={{
        background: "#fafaf9",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
      {children}
    </div>
  );
}

function shortUrl(u: string): string {
  return u.replace(/^https?:\/\//, "").slice(0, 48);
}

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#44403c",
  background: "#fff",
  border: "1px solid #e7e5e4",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
};
