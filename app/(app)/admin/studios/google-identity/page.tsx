"use client";

import { useCallback, useEffect, useState } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import { SalonProspectDrawer } from "@/components/admin/intelligence/salon/SalonProspectDrawer";
import type {
  GoogleIdentityConflictRow,
  GoogleIdentityQuestions,
  GoogleIdentityRecord,
  GoogleIdentityReport,
} from "@/lib/intelligence/salon/google-identity/types";

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

const STATUS_COLOR: Record<string, string> = {
  confirmed: "#15803d",
  probable: "#1d4ed8",
  possible: "#b45309",
  conflict: "#b91c1c",
  not_found: "#78716c",
};

export default function GoogleIdentityPage() {
  const [report, setReport] = useState<GoogleIdentityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/google-identity", {
        cache: "no-store",
      });
      const json = (await res.json()) as GoogleIdentityReport & { ok: boolean; detail?: string };
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
    if (
      !window.confirm(
        "Run Google Identity backfill for salon prospects? Uses Google Places API when GOOGLE_MAPS_API_KEY is set.",
      )
    ) {
      return;
    }
    setBackfillLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/google-identity/backfill", {
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
      <CreatorIntelligenceNav current="google-identity" />
      <IntelligenceFeatureHeader
        title="Google Identity Audit"
        description="Independently verify salon/operator existence through Google Business data."
        config={salonConfig}
      />
      <SalonStorageBadge />

      {!report?.providerConnected ? (
        <div
          style={{
            fontSize: 12,
            color: "#b45309",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 16,
          }}
        >
          Google Places API not connected. Set <code>GOOGLE_MAPS_API_KEY</code> for live lookups.
          Backfill will record not_found until connected.
        </div>
      ) : null}

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
          {backfillLoading ? "Running backfill…" : "Run Google Identity Backfill"}
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
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 10,
              }}
            >
              <Card label="Prospects" value={s.totalProspects} />
              <Card label="Confirmed" value={s.confirmed} color="#15803d" />
              <Card label="Probable" value={s.probable} color="#1d4ed8" />
              <Card label="Possible" value={s.possible} color="#b45309" />
              <Card label="Conflicts" value={s.conflict} color="#b91c1c" />
              <Card label="Not Found" value={s.notFound} color="#78716c" />
              <Card label="Coverage %" value={`${s.coveragePercent}%`} color="#9d174d" />
            </div>
          </Section>

          <Section title="MATCH TABLE">
            <MatchTable records={report.records} onRowClick={setDrawerId} />
          </Section>

          <Section title="CONFLICTS">
            <ConflictTable rows={report.conflicts} onRowClick={setDrawerId} />
          </Section>

          <Section title="QUESTIONS ANSWERED">
            <QuestionsBlock questions={report.questions} />
          </Section>
        </>
      ) : (
        <div style={{ fontSize: 12, color: "#78716c" }}>
          No audit data yet. Run Google Identity Backfill to populate the reference layer.
        </div>
      )}

      <SalonProspectDrawer
        prospectId={drawerId}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
      />
    </div>
  );
}

function MatchTable({
  records,
  onRowClick,
}: {
  records: GoogleIdentityRecord[];
  onRowClick: (id: string) => void;
}) {
  if (records.length === 0) {
    return <div style={{ fontSize: 12, color: "#78716c" }}>No records — run backfill.</div>;
  }
  return (
    <TableWrap>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Prospect", "Google Business", "Status", "Confidence", "Rating", "Reviews"].map((h) => (
              <th key={h} style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr
              key={r.prospectId}
              style={{ cursor: "pointer" }}
              onClick={() => onRowClick(r.prospectId)}
            >
              <td style={tdStyle}>
                <code style={{ fontSize: 10 }}>{r.prospectId.slice(0, 8)}…</code>
              </td>
              <td style={tdStyle}>{r.googleBusinessName ?? "—"}</td>
              <td style={{ ...tdStyle, color: STATUS_COLOR[r.status] ?? "#57534e", fontWeight: 700 }}>
                {r.status}
              </td>
              <td style={tdStyle}>{r.matchConfidence}%</td>
              <td style={tdStyle}>{r.rating ?? "—"}</td>
              <td style={tdStyle}>{r.reviewCount ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function ConflictTable({
  rows,
  onRowClick,
}: {
  rows: GoogleIdentityConflictRow[];
  onRowClick: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#15803d", padding: 16, background: "#f0fdf4", borderRadius: 10 }}>
        No conflicts detected.
      </div>
    );
  }
  return (
    <TableWrap>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Prospect", "Status", "Issue", "Google Website", "Prospect Website"].map((h) => (
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
                <strong>{r.displayName ?? r.prospectId.slice(0, 8)}</strong>
                {r.instagramHandle ? (
                  <div style={{ fontSize: 10, color: "#a8a29e" }}>@{r.instagramHandle}</div>
                ) : null}
              </td>
              <td style={{ ...tdStyle, color: "#b91c1c", fontWeight: 700 }}>{r.status}</td>
              <td style={{ ...tdStyle, maxWidth: 280 }}>{r.issues.join("; ")}</td>
              <td style={{ ...tdStyle, maxWidth: 160, wordBreak: "break-all" }}>
                {r.googleWebsite ?? "—"}
              </td>
              <td style={{ ...tdStyle, maxWidth: 160, wordBreak: "break-all" }}>
                {r.prospectWebsite ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

function QuestionsBlock({ questions }: { questions: GoogleIdentityQuestions }) {
  const entries: Array<[string, string]> = [
    ["Q1", questions.q1_matched_google],
    ["Q2", questions.q2_confirmed],
    ["Q3", questions.q3_probable],
    ["Q4", questions.q4_possible],
    ["Q5", questions.q5_conflicts],
    ["Q6", questions.q6_not_found],
    ["Q7", questions.q7_strongest_provider_coverage],
    ["Q8", questions.q8_weakest_provider_coverage],
    ["Q9", questions.q9_coverage_percent],
    ["Q10", questions.q10_manual_review],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(([q, text]) => (
        <div
          key={q}
          style={{
            fontSize: 12,
            color: "#44403c",
            background: "#fafaf9",
            border: "1px solid #e7e5e4",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <strong style={{ color: "#9d174d" }}>{q}</strong> {text}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "#a8a29e",
          letterSpacing: "0.06em",
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({
  label,
  value,
  color = "#1c1917",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        background: "#fff",
      }}
    >
      {children}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #e7e5e4",
  background: "#fff",
  color: "#44403c",
  cursor: "pointer",
};
