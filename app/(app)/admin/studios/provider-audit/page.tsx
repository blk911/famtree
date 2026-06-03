"use client";

import { useEffect, useState, useMemo } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import type {
  ProviderAuditCategorySection,
  ProviderAuditRow,
} from "@/lib/intelligence/salon/business-stack/provider-audit";
import type {
  BadAssignmentRecord,
  ProviderProvenanceAuditReport,
  ProviderTrustRow,
} from "@/lib/intelligence/salon/provider-provenance-audit";
import {
  ADMIN_INTEL_BODY,
  ADMIN_INTEL_CARD_LABEL,
  ADMIN_INTEL_META,
  ADMIN_INTEL_SECTION_TITLE,
  ADMIN_INTEL_TABLE_CELL as tdStyle,
  ADMIN_INTEL_TABLE_HEADER as thStyle,
  ADMIN_INTEL_URL,
} from "@/components/admin/intelligence/salon/admin-intelligence-typography";

type AuditResponse = {
  ok: boolean;
  totalStacks?: number;
  totalSignals?: number;
  prospectsWithSignals?: number;
  providers?: ProviderAuditRow[];
  categorySections?: ProviderAuditCategorySection[];
  validationSummary?: {
    confirmed: number;
    candidates: number;
    rejectedGeneric: number;
    rejectedNotFound: number;
    timeoutError: number;
  };
  provenance?: ProviderProvenanceAuditReport;
  detail?: string;
};

const BAD_REASON_LABELS: Record<BadAssignmentRecord["reasons"][number], string> = {
  hidden_unconfirmed: "Hidden (display gate)",
  no_provenance: "No provenance",
  generated_unvalidated: "Generated / unvalidated",
  missing_booking_url: "Missing URL",
  high_confidence_unconfirmed: "High conf. unconfirmed",
};

type AuditTab = "stack" | "provenance" | "trust" | "bad" | "questions";

export default function ProviderAuditPage() {
  const [report, setReport] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<AuditTab>("provenance");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (filter !== "all") params.set("provider", filter);
      const res = await fetch(
        `/api/admin/intelligence/salon/business-stack/provider-audit?${params}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as AuditResponse;
      setReport(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  const rows = useMemo(() => {
    const list = report?.providers ?? [];
    if (filter === "all") return list;
    return list.filter((r) => r.count > 0);
  }, [report, filter]);

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <CreatorIntelligenceNav current="provider-audit" />
      <IntelligenceFeatureHeader
        title="Provider Audit"
        description="Business-stack fingerprints plus provider provenance coverage, display-gate trust, and bad assignments."
        config={salonConfig}
      />
      <SalonStorageBadge />

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          background: "#f5f5f4",
          borderRadius: 24,
          padding: 4,
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {(
          [
            ["provenance", "Provenance summary"],
            ["trust", "Provider trust"],
            ["bad", "Bad assignments"],
            ["questions", "Q9–Q10"],
            ["stack", "Stack signals"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: "none",
              background: tab === id ? "#1c1917" : "transparent",
              color: tab === id ? "#fff" : "#78716c",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={selectStyle}>
          <option value="all">All providers</option>
          <option value="glossgenius">GlossGenius</option>
          <option value="vagaro">Vagaro</option>
          <option value="square">Square</option>
          <option value="booksy">Booksy</option>
          <option value="gocheckin">GoCheckIn</option>
          <option value="stripe">Stripe</option>
          <option value="meta_pixel">Meta Pixel</option>
        </select>
        <button type="button" onClick={load} style={btnStyle}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#78716c" }}>Loading…</div>
      ) : !report?.ok ? (
        <div style={{ fontSize: 12, color: "#b91c1c" }}>
          {report?.detail ?? "Audit failed"}
        </div>
      ) : (
        <>
          {tab === "provenance" && report.provenance ? (
            <ProvenanceSummaryTab prov={report.provenance} />
          ) : null}

          {tab === "trust" && report.provenance ? (
            <ProviderTrustTable rows={report.provenance.providerTrustTable} thStyle={thStyle} tdStyle={tdStyle} />
          ) : null}

          {tab === "bad" && report.provenance ? (
            <BadAssignmentsTable rows={report.provenance.badAssignments} thStyle={thStyle} tdStyle={tdStyle} />
          ) : null}

          {tab === "questions" && report.provenance ? (
            <QuestionsTab answers={report.provenance.answers} prov={report.provenance} />
          ) : null}

          {tab === "stack" ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {[
                  ["Stacks stored", report.totalStacks ?? 0],
                  ["Total signals", report.totalSignals ?? 0],
                  ["Prospects w/ signals", report.prospectsWithSignals ?? 0],
                  ["Providers w/ hits", rows.filter((r) => r.count > 0).length],
                  ["Confirmed validations", report.validationSummary?.confirmed ?? 0],
                  ["Candidate only", report.validationSummary?.candidates ?? 0],
                  ["Rejected generic", report.validationSummary?.rejectedGeneric ?? 0],
                  ["Rejected not found", report.validationSummary?.rejectedNotFound ?? 0],
                  ["Timeout / error", report.validationSummary?.timeoutError ?? 0],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    style={{
                      background: "#fafaf9",
                      border: "1px solid #e7e5e4",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={ADMIN_INTEL_CARD_LABEL}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#1c1917" }}>{val}</div>
                  </div>
                ))}
              </div>
              {(report.categorySections ?? []).map((section) => (
                <CategorySectionTable
                  key={section.category}
                  section={section}
                  thStyle={thStyle}
                  tdStyle={tdStyle}
                />
              ))}
              <div style={{ marginTop: 20, marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#44403c" }}>
                All providers (stack signals)
              </div>
              <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
                <AuditProviderTable rows={rows} thStyle={thStyle} tdStyle={tdStyle} />
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e7e5e4",
  background: "#fff",
};

function AuditProviderTable({
  rows,
  thStyle,
  tdStyle,
}: {
  rows: ProviderAuditRow[];
  thStyle: React.CSSProperties;
  tdStyle: React.CSSProperties;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {[
            "Provider",
            "Category",
            "Count",
            "Direct URL",
            "Link-in-bio",
            "Website crawl",
            "Avg conf.",
            "Sample URL",
            "Sample prospects",
          ].map((h) => (
            <th key={h} style={thStyle}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.providerId}
            style={{
              background: r.count === 0 ? "#fafaf9" : "transparent",
              opacity: r.count === 0 ? 0.65 : 1,
            }}
          >
            <td style={tdStyle}>
              <strong>{r.label}</strong>
              <div style={ADMIN_INTEL_META}>{r.providerId}</div>
            </td>
            <td style={tdStyle}>{r.category}</td>
            <td style={tdStyle}>{r.count}</td>
            <td style={tdStyle}>{r.directUrlCount}</td>
            <td style={tdStyle}>{r.linkInBioCount}</td>
            <td style={tdStyle}>{r.websiteCrawlCount}</td>
            <td style={tdStyle}>{r.averageConfidence ? `${r.averageConfidence}%` : "—"}</td>
            <td style={tdStyle}>
              {r.sampleUrl ? (
                <a
                  href={r.sampleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0284c7", ...ADMIN_INTEL_URL }}
                >
                  {r.sampleUrl.slice(0, 48)}
                </a>
              ) : (
                "—"
              )}
            </td>
            <td style={tdStyle}>
              {r.sampleProspects.length > 0
                ? r.sampleProspects.map((h) => `@${h}`).join(", ")
                : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CategorySectionTable({
  section,
  thStyle,
  tdStyle,
}: {
  section: ProviderAuditCategorySection;
  thStyle: React.CSSProperties;
  tdStyle: React.CSSProperties;
}) {
  if (section.rows.length === 0) {
    return (
      <div style={{ marginBottom: 16, ...ADMIN_INTEL_META }}>
        <strong>{section.title}:</strong> none detected yet
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#44403c", marginBottom: 8 }}>
        {section.title}
      </div>
      <div
        style={{
          overflowX: "auto",
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 12,
        }}
      >
        <AuditProviderTable rows={section.rows} thStyle={thStyle} tdStyle={tdStyle} />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#44403c",
  background: "#fff",
  border: "1px solid #e7e5e4",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};

function ProvenanceSummaryTab({ prov }: { prov: ProviderProvenanceAuditReport }) {
  const c = prov.provenanceCoverage;
  const h = prov.hiddenVsDisplayed;
  return (
    <div>
      <div style={{ ...ADMIN_INTEL_SECTION_TITLE, marginBottom: 10 }}>
        PROVENANCE COVERAGE
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {[
          ["Salon prospects", prov.salonProspectCount, "#57534e"],
          ["Total assignments", c.totalAssignments, "#1c1917"],
          ["With provenance", c.withExplainableProvenance, "#15803d"],
          ["Without provenance", c.withoutProvenance, "#dc2626"],
          ["Coverage %", `${c.coveragePercent}%`, c.coveragePercent >= 70 ? "#15803d" : "#b45309"],
        ].map(([label, val, color]) => (
          <div
            key={String(label)}
            style={{
              background: "#fafaf9",
              border: "1px solid #e7e5e4",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: String(color) }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ ...ADMIN_INTEL_SECTION_TITLE, marginBottom: 10 }}>
        HIDDEN VS DISPLAYED ASSIGNMENTS
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          ["Stored assignments", h.storedAssignments, "#1c1917"],
          ["Display eligible", h.displayEligibleAssignments, "#15803d"],
          ["Hidden (unconfirmed)", h.hiddenUnconfirmedAssignments, "#dc2626"],
          ["Hidden %", `${h.hiddenPercent}%`, h.hiddenPercent > 30 ? "#dc2626" : "#57534e"],
          ["Bad assignments", prov.badAssignments.length, "#b45309"],
        ].map(([label, val, color]) => (
          <div
            key={String(label)}
            style={{
              background: "#fff",
              border: "1px solid #e7e5e4",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: String(color) }}>{val}</div>
          </div>
        ))}
      </div>
      <p style={{ ...ADMIN_INTEL_BODY, color: "#78716c", maxWidth: 720 }}>
        <strong>Stored</strong> = prospect has <code>bookingProvider</code>.{" "}
        <strong>Display eligible</strong> = <code>isConfirmedSalonBookingProvider</code> /{" "}
        <code>bookingProviderForDisplay</code> would show the pill.{" "}
        <strong>Hidden</strong> = stored but suppressed until validation confirms.
      </p>
    </div>
  );
}

function ProviderTrustTable({
  rows,
  thStyle,
  tdStyle,
}: {
  rows: ProviderTrustRow[];
  thStyle: React.CSSProperties;
  tdStyle: React.CSSProperties;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#44403c", marginBottom: 10 }}>
        Provider trust table
      </div>
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                "Provider",
                "Stored",
                "Displayed",
                "Hidden",
                "w/ Provenance",
                "No provenance",
                "Bad",
                "Coverage %",
                "Trust",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#a8a29e" }}>
                  No stored assignments.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.providerId}>
                  <td style={tdStyle}>
                    <strong>{r.label}</strong>
                    <div style={ADMIN_INTEL_META}>{r.providerId}</div>
                  </td>
                  <td style={tdStyle}>{r.storedCount}</td>
                  <td style={{ ...tdStyle, color: "#15803d", fontWeight: 700 }}>{r.displayEligibleCount}</td>
                  <td style={{ ...tdStyle, color: r.hiddenCount > 0 ? "#dc2626" : "#78716c" }}>{r.hiddenCount}</td>
                  <td style={tdStyle}>{r.withProvenanceCount}</td>
                  <td style={tdStyle}>{r.withoutProvenanceCount}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: r.badAssignmentCount > 0 ? "#b45309" : "#78716c" }}>
                    {r.badAssignmentCount}
                  </td>
                  <td style={tdStyle}>{r.coveragePercent}%</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{r.trustScore}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BadAssignmentsTable({
  rows,
  thStyle,
  tdStyle,
}: {
  rows: BadAssignmentRecord[];
  thStyle: React.CSSProperties;
  tdStyle: React.CSSProperties;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#44403c", marginBottom: 10 }}>
        Bad assignments ({rows.length})
      </div>
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Handle", "Provider", "Source", "Conf.", "Displayed", "Provenance", "Issues"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#15803d" }}>
                  No bad assignments detected.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.prospectId}>
                  <td style={tdStyle}>
                    <strong>@{r.instagramHandle}</strong>
                    <div style={ADMIN_INTEL_META}>{r.displayName}</div>
                  </td>
                  <td style={tdStyle}>{r.bookingProviderLabel ?? r.bookingProvider}</td>
                  <td style={tdStyle}>{r.bookingProviderSource ?? "—"}</td>
                  <td style={tdStyle}>{r.bookingProviderConfidence ?? "—"}</td>
                  <td style={{ ...tdStyle, color: r.displayEligible ? "#15803d" : "#dc2626", fontWeight: 700 }}>
                    {r.displayEligible ? "Yes" : "Hidden"}
                  </td>
                  <td style={{ ...tdStyle, color: r.hasExplainableProvenance ? "#15803d" : "#dc2626" }}>
                    {r.hasExplainableProvenance ? "Yes" : "No"}
                  </td>
                  <td style={tdStyle}>
                    {r.reasons.map((reason) => (
                      <span
                        key={reason}
                        style={{
                          display: "inline-block",
                          marginRight: 4,
                          marginBottom: 2,
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "#fef3c7",
                          color: "#b45309",
                        }}
                      >
                        {BAD_REASON_LABELS[reason]}
                      </span>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuestionsTab({
  answers,
  prov,
}: {
  answers: ProviderProvenanceAuditReport["answers"];
  prov: ProviderProvenanceAuditReport;
}) {
  return (
    <div>
      <AnswerCard
        q="Q9"
        label="What percentage of provider assignments have explainable provenance?"
        text={answers.q9_provenance_coverage_pct}
        highlight={`${prov.provenanceCoverage.coveragePercent}%`}
      />
      <AnswerCard
        q="Q10"
        label="How many stored provider assignments are currently hidden by the display gate?"
        text={answers.q10_hidden_stored_assignments}
        warn={prov.hiddenVsDisplayed.hiddenUnconfirmedAssignments > 0}
        highlight={String(prov.hiddenVsDisplayed.hiddenUnconfirmedAssignments)}
      />
    </div>
  );
}

function AnswerCard({
  q,
  label,
  text,
  warn,
  highlight,
}: {
  q: string;
  label: string;
  text: string;
  warn?: boolean;
  highlight?: string;
}) {
  return (
    <div
      style={{
        background: warn ? "#fffbeb" : "#fff",
        border: `1px solid ${warn ? "#fde68a" : "#e7e5e4"}`,
        borderRadius: 10,
        padding: "14px 18px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#9d174d", minWidth: 28 }}>{q}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{label}</span>
        {highlight ? (
          <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 800, color: warn ? "#b45309" : "#15803d" }}>
            {highlight}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 12, color: "#57534e", lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}
