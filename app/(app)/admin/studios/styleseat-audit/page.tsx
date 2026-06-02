"use client";
// app/(app)/admin/studios/styleseat-audit/page.tsx
// StyleSeat Provenance Audit — answers how StyleSeat prospects are identified,
// whether matching logic is working, and whether the concatenation engine is needed.

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types (mirrored from the API route) ─────────────────────────────────────

type DeterminationMethod =
  | "styleseat_directory"
  | "styleseat_profile_url"
  | "styleseat_provider_signal"
  | "direct_url_match"
  | "link_in_bio_match"
  | "website_match"
  | "handle_match"
  | "display_name_match"
  | "generated_candidate"
  | "imported"
  | "unknown";

interface AuditRecord {
  prospectId: string;
  instagramHandle: string | null;
  displayName: string;
  bookingProvider: string | null;
  bookingProviderLabel: string | null;
  styleseatUrl: string | null;
  sourceRunId: string | null;
  sourceType: string | null;
  sourceName: string | null;
  determinationMethod: DeterminationMethod;
  validationStatus: string | null;
  auditValidationStatus: string;
  confidence: number;
  bookingProviderConfidence: number | null;
  bookingProviderSource: string | null;
  generatedCandidates: string[];
  winningCandidate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ByMethod {
  styleseat_directory: number;
  styleseat_profile_url: number;
  styleseat_provider_signal: number;
  direct_url_match: number;
  link_in_bio_match: number;
  website_match: number;
  handle_match: number;
  display_name_match: number;
  generated_candidate: number;
  imported: number;
  unknown: number;
}

interface ByValidation {
  confirmed: number;
  candidate_only: number;
  rejected: number;
  timeout: number;
  not_found: number;
  unknown: number;
}

interface AuditResponse {
  ok: boolean;
  error?: string;
  totalStyleSeatProspects: number;
  byMethod: ByMethod;
  byValidation: ByValidation;
  totals: {
    total: number;
    fromDirectory: number;
    withStyleSeatUrl: number;
    withNoUrl: number;
    igHandleFound: number;
    generatedCandidatesTested: number;
    generatedConfirmed: number;
    generatedFailed: number;
    confirmedStyleSeatOperators: number;
  };
  records: AuditRecord[];
  generatedAudit: Array<{
    handle: string | null;
    displayName: string;
    generatedCandidates: string[];
    winningCandidate: string | null;
    validationStatus: string;
    confidence: number;
  }>;
  urlProof: Array<{
    handle: string | null;
    styleseatUrl: string | null;
    validationStatus: string;
    confidence: number;
    bookingProviderConfidence: number | null;
    determinationMethod: string;
    isFromDirectory: boolean;
    isGenerated: boolean;
  }>;
  answers: {
    q1_how_determined: string;
    q2_pct_from_source: string;
    q3_pct_generated: string;
    q4_concatenation_value: string;
    q5_pills_without_validation: string;
    q6_need_concatenation: string;
    q7_without_generated: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<DeterminationMethod, string> = {
  styleseat_directory:      "StyleSeat Directory",
  styleseat_profile_url:    "StyleSeat Profile URL",
  styleseat_provider_signal:"Provider Signal",
  direct_url_match:         "Direct URL Match",
  link_in_bio_match:        "Link-in-Bio Match",
  website_match:            "Website Match",
  handle_match:             "Handle Match",
  display_name_match:       "Display Name Match",
  generated_candidate:      "Generated Candidate",
  imported:                 "Imported",
  unknown:                  "Unknown",
};

const METHOD_COLORS: Record<DeterminationMethod, string> = {
  styleseat_directory:      "#15803d",
  styleseat_profile_url:    "#1d4ed8",
  styleseat_provider_signal:"#7c3aed",
  direct_url_match:         "#0284c7",
  link_in_bio_match:        "#0891b2",
  website_match:            "#78716c",
  handle_match:             "#d97706",
  display_name_match:       "#b45309",
  generated_candidate:      "#dc2626",
  imported:                 "#6d28d9",
  unknown:                  "#a8a29e",
};

const VALIDATION_COLORS: Record<string, string> = {
  confirmed:      "#15803d",
  candidate_only: "#d97706",
  rejected:       "#dc2626",
  not_found:      "#b91c1c",
  timeout:        "#78716c",
  unknown:        "#a8a29e",
};

function SummaryCard({ label, value, color = "#1c1917", sub }: { label: string; value: number | string; color?: string; sub?: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10,
      padding: "12px 18px", minWidth: 100, textAlign: "center",
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600, marginTop: 2, whiteSpace: "nowrap" }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: "#c4b5fd", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MethodBar({ method, count, total }: { method: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = METHOD_COLORS[method as DeterminationMethod] ?? "#a8a29e";
  const label = METHOD_LABELS[method as DeterminationMethod] ?? method;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
      <div style={{ width: 180, fontSize: 11, color: "#57534e", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, background: "#f5f5f4", borderRadius: 4, height: 8, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
      <div style={{ width: 28, textAlign: "right", fontSize: 11, fontWeight: 700, color: "#1c1917" }}>{count}</div>
      <div style={{ width: 32, fontSize: 10, color: "#a8a29e" }}>{pct}%</div>
    </div>
  );
}

function AnswerCard({ q, label, text, warn }: { q: string; label: string; text: string; warn?: boolean }) {
  return (
    <div style={{
      background: warn ? "#fffbeb" : "#fff",
      border: `1px solid ${warn ? "#fde68a" : "#e7e5e4"}`,
      borderRadius: 10, padding: "14px 18px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#9d174d", minWidth: 24 }}>{q}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{label}</span>
      </div>
      <div style={{ fontSize: 12, color: "#57534e", lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StyleSeatAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"summary" | "method" | "validation" | "generated" | "proof" | "answers">("summary");

  useEffect(() => {
    fetch("/api/admin/intelligence/salon/styleseat-audit")
      .then((r) => r.json())
      .then((d: AuditResponse) => {
        if (!d.ok) setError(d.error ?? "Unknown error");
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 14px", borderRadius: 20, border: "none",
    background: active ? "#1c1917" : "transparent",
    color: active ? "#fff" : "#78716c",
    fontWeight: 700, fontSize: 11, cursor: "pointer",
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Link href="/admin/studios/styleseat" style={{ fontSize: 12, color: "#9d174d", textDecoration: "none", fontWeight: 700 }}>
            ← StyleSeat
          </Link>
          <span style={{ color: "#d6d3d1" }}>/</span>
          <span style={{ fontSize: 12, color: "#78716c" }}>Provenance Audit</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          StyleSeat Provenance Audit
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0 }}>
          How are StyleSeat prospects identified? Are generated candidates helping or hurting?
          Is the concatenation engine needed?
        </p>
      </div>

      {loading && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#a8a29e", fontSize: 13 }}>
          ⏳ Loading audit data…
        </div>
      )}

      {error && (
        <div style={{ padding: "14px 18px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            <SummaryCard label="Total StyleSeat" value={data.totalStyleSeatProspects} color="#1c1917" />
            <SummaryCard label="From Directory" value={data.byMethod.styleseat_directory} color="#15803d" />
            <SummaryCard label="Profile URL" value={data.byMethod.styleseat_profile_url} color="#1d4ed8" />
            <SummaryCard label="Generated" value={data.byMethod.generated_candidate} color="#dc2626" />
            <SummaryCard label="Direct URL" value={data.byMethod.direct_url_match} color="#0284c7" />
            <SummaryCard label="Handle Match" value={data.byMethod.handle_match} color="#d97706" />
            <SummaryCard label="Display Match" value={data.byMethod.display_name_match} color="#b45309" />
            <SummaryCard label="Unknown" value={data.byMethod.unknown} color="#a8a29e" />
            <SummaryCard label="With SS URL" value={data.totals.withStyleSeatUrl} color="#15803d" sub="has proof" />
            <SummaryCard label="No URL" value={data.totals.withNoUrl} color="#dc2626" sub="pill only" />
            <SummaryCard label="IG Handle Found" value={data.totals.igHandleFound} color="#7c3aed" />
            <SummaryCard label="Confirmed Ops" value={data.totals.confirmedStyleSeatOperators} color="#9d174d" sub="if gen removed" />
          </div>

          {/* Validation summary */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {Object.entries(data.byValidation).map(([vs, count]) => (
              count > 0 && (
                <div key={vs} style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                  background: "#f5f5f4", color: VALIDATION_COLORS[vs] ?? "#78716c",
                  border: `1px solid ${VALIDATION_COLORS[vs] ?? "#e7e5e4"}`,
                }}>
                  {vs.replace(/_/g, " ")} · {count}
                </div>
              )
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f5f5f4", borderRadius: 24, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
            {(["summary","method","validation","generated","proof","answers"] as const).map((t) => (
              <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
                {t === "summary" ? "Overview" : t === "method" ? "Method Breakdown" : t === "validation" ? "Validation" : t === "generated" ? "Generated Audit" : t === "proof" ? "URL Proof" : "Q&A Report"}
              </button>
            ))}
          </div>

          {/* ── Summary tab ──────────────────────────────────────────────────── */}
          {tab === "summary" && (
            <Section title="PROSPECT INVENTORY">
              {data.records.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
                  <div style={{ fontSize: 14, color: "#a8a29e" }}>No StyleSeat prospects found in the current store.</div>
                  <div style={{ fontSize: 12, color: "#c4b5fd", marginTop: 8 }}>
                    Run a StyleSeat harvest at{" "}
                    <Link href="/admin/studios/styleseat" style={{ color: "#9d174d", textDecoration: "none", fontWeight: 700 }}>
                      /admin/studios/styleseat
                    </Link>{" "}
                    to populate data.
                  </div>
                </div>
              ) : (
                <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#f9f9f8" }}>
                        {["Handle","Display Name","Method","SS URL","Confidence","Validation","Source"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#78716c", letterSpacing: "0.06em", borderBottom: "1px solid #e7e5e4", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((r, i) => (
                        <tr key={r.prospectId} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700, fontFamily: "monospace" }}>
                            {r.instagramHandle ? `@${r.instagramHandle}` : <span style={{ color: "#d6d3d1" }}>—</span>}
                          </td>
                          <td style={{ padding: "8px 12px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1c1917" }}>
                            {r.displayName}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                              background: "#f5f5f4", color: METHOD_COLORS[r.determinationMethod] ?? "#a8a29e",
                              border: `1px solid ${METHOD_COLORS[r.determinationMethod] ?? "#e7e5e4"}`,
                              whiteSpace: "nowrap",
                            }}>
                              {METHOD_LABELS[r.determinationMethod]}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", maxWidth: 200 }}>
                            {r.styleseatUrl ? (
                              <a href={r.styleseatUrl} target="_blank" rel="noopener noreferrer"
                                style={{ color: "#0284c7", textDecoration: "none", fontSize: 10,
                                  display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.styleseatUrl.replace("https://","").replace("http://","").slice(0,40)}
                              </a>
                            ) : <span style={{ color: "#dc2626", fontSize: 10 }}>⚠ missing</span>}
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 700, color: r.confidence >= 65 ? "#15803d" : r.confidence >= 35 ? "#d97706" : "#dc2626" }}>
                            {r.confidence}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ fontSize: 9, color: VALIDATION_COLORS[r.auditValidationStatus] ?? "#78716c", fontWeight: 700 }}>
                              {r.auditValidationStatus}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", fontSize: 10, color: "#78716c", whiteSpace: "nowrap" }}>
                            {r.sourceType ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* ── Method breakdown tab ──────────────────────────────────────── */}
          {tab === "method" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 14 }}>
                  DETERMINATION METHOD — {data.totalStyleSeatProspects} total
                </div>
                {Object.entries(data.byMethod).map(([method, count]) => (
                  <MethodBar key={method} method={method} count={count} total={data.totalStyleSeatProspects} />
                ))}
              </div>

              <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.07em", marginBottom: 14 }}>
                  MATCHING AUDIT TOTALS
                </div>
                {[
                  ["Generated candidates tested", data.totals.generatedCandidatesTested, "#7c3aed"],
                  ["Generated confirmed matches", data.totals.generatedConfirmed, "#15803d"],
                  ["Generated failed/unmatched", data.totals.generatedFailed, "#dc2626"],
                  ["IG handles found total", data.totals.igHandleFound, "#7c3aed"],
                  ["With StyleSeat URL proof", data.totals.withStyleSeatUrl, "#15803d"],
                  ["Missing StyleSeat URL", data.totals.withNoUrl, "#dc2626"],
                  ["Confirmed ops (no gen)", data.totals.confirmedStyleSeatOperators, "#9d174d"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#57534e" }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 700, color: String(color) }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Validation tab ────────────────────────────────────────────── */}
          {tab === "validation" && (
            <Section title="VALIDATION STATUS BREAKDOWN">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
                {Object.entries(data.byValidation).map(([vs, count]) => (
                  <div key={vs} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: VALIDATION_COLORS[vs] ?? "#1c1917" }}>{count}</div>
                    <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600, marginTop: 2 }}>{vs.replace(/_/g, " ").toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#f9f9f8" }}>
                      {["Handle","Display Name","Validation Status","Method","Confidence"].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#78716c", letterSpacing: "0.06em", borderBottom: "1px solid #e7e5e4" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((r) => (
                      <tr key={r.prospectId} style={{ borderBottom: "1px solid #f5f5f4" }}>
                        <td style={{ padding: "7px 12px", fontFamily: "monospace" }}>
                          {r.instagramHandle ? `@${r.instagramHandle}` : "—"}
                        </td>
                        <td style={{ padding: "7px 12px", color: "#57534e" }}>{r.displayName}</td>
                        <td style={{ padding: "7px 12px" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: VALIDATION_COLORS[r.auditValidationStatus] ?? "#78716c" }}>
                            {r.auditValidationStatus}
                          </span>
                        </td>
                        <td style={{ padding: "7px 12px", fontSize: 10, color: METHOD_COLORS[r.determinationMethod] ?? "#78716c", fontWeight: 700 }}>
                          {METHOD_LABELS[r.determinationMethod]}
                        </td>
                        <td style={{ padding: "7px 12px", fontWeight: 700, color: r.confidence >= 65 ? "#15803d" : r.confidence >= 35 ? "#d97706" : "#dc2626" }}>
                          {r.confidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── Generated candidate audit tab ─────────────────────────────── */}
          {tab === "generated" && (
            <Section title="GENERATED CANDIDATE AUDIT">
              {data.generatedAudit.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: "#a8a29e" }}>No generated StyleSeat candidates found in current data.</div>
                  <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 6 }}>
                    All StyleSeat prospects came from directory source data, not generated handle probing.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.generatedAudit.map((r, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1c1917" }}>
                          {r.handle ? `@${r.handle}` : "—"}
                        </span>
                        <span style={{ fontSize: 12, color: "#78716c" }}>{r.displayName}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700,
                          color: r.winningCandidate ? "#15803d" : "#dc2626" }}>
                          {r.winningCandidate ? "✓ Confirmed" : "✗ Failed"}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        {r.generatedCandidates.map((u) => (
                          <span key={u} style={{
                            fontSize: 9, padding: "2px 8px", borderRadius: 4,
                            background: u === r.winningCandidate ? "#dcfce7" : "#fef2f2",
                            color: u === r.winningCandidate ? "#15803d" : "#dc2626",
                            fontFamily: "monospace",
                            border: `1px solid ${u === r.winningCandidate ? "#bbf7d0" : "#fecaca"}`,
                          }}>
                            {u.replace("https://","").slice(0, 50)}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "#78716c" }}>
                        Confidence: <strong>{r.confidence}</strong> · Status: <strong>{r.validationStatus}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* ── URL proof tab ──────────────────────────────────────────────── */}
          {tab === "proof" && (
            <Section title="STYLESEAT URL PROOF — CONFIRMED PROVIDERS">
              {data.urlProof.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: "#a8a29e" }}>No StyleSeat URLs on record.</div>
                </div>
              ) : (
                <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#f9f9f8" }}>
                        {["Handle","StyleSeat URL","Source","Conf.","Valid.","Proof Type"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#78716c", letterSpacing: "0.06em", borderBottom: "1px solid #e7e5e4", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.urlProof.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f5f5f4", background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                          <td style={{ padding: "7px 12px", fontFamily: "monospace" }}>{r.handle ? `@${r.handle}` : "—"}</td>
                          <td style={{ padding: "7px 12px", maxWidth: 220 }}>
                            {r.styleseatUrl ? (
                              <a href={r.styleseatUrl} target="_blank" rel="noopener noreferrer"
                                style={{ color: "#0284c7", textDecoration: "none", display: "block",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.styleseatUrl.replace("https://","").slice(0, 50)}
                              </a>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "7px 12px", fontSize: 10, color: METHOD_COLORS[r.determinationMethod as DeterminationMethod] ?? "#78716c", fontWeight: 700 }}>
                            {METHOD_LABELS[r.determinationMethod as DeterminationMethod] ?? r.determinationMethod}
                          </td>
                          <td style={{ padding: "7px 12px", fontWeight: 700, color: r.confidence >= 65 ? "#15803d" : r.confidence >= 35 ? "#d97706" : "#dc2626" }}>
                            {r.confidence}
                          </td>
                          <td style={{ padding: "7px 12px", fontSize: 10, color: VALIDATION_COLORS[r.validationStatus] ?? "#78716c", fontWeight: 700 }}>
                            {r.validationStatus}
                          </td>
                          <td style={{ padding: "7px 12px" }}>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                              background: r.isFromDirectory ? "#dcfce7" : r.isGenerated ? "#fef2f2" : "#fef3c7",
                              color: r.isFromDirectory ? "#15803d" : r.isGenerated ? "#dc2626" : "#b45309",
                              border: `1px solid ${r.isFromDirectory ? "#bbf7d0" : r.isGenerated ? "#fecaca" : "#fde68a"}`,
                            }}>
                              {r.isFromDirectory ? "✓ Real page (directory)" : r.isGenerated ? "⚠ Generated guess" : "Detected"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* ── Q&A Report tab ──────────────────────────────────────────────── */}
          {tab === "answers" && (
            <Section title="AUDIT REPORT — 7 QUESTIONS ANSWERED">
              <AnswerCard q="Q1" label="How are we determining a prospect is StyleSeat?"
                text={data.answers.q1_how_determined} />
              <AnswerCard q="Q2" label="What % come directly from StyleSeat source data?"
                text={data.answers.q2_pct_from_source} />
              <AnswerCard q="Q3" label="What % come from generated matching?"
                text={data.answers.q3_pct_generated}
                warn={data.byMethod.generated_candidate > 0} />
              <AnswerCard q="Q4" label="Are concatenation algorithms contributing confirmed matches?"
                text={data.answers.q4_concatenation_value} />
              <AnswerCard q="Q5" label="Are any StyleSeat provider pills shown without validation?"
                text={data.answers.q5_pills_without_validation}
                warn={data.totals.withNoUrl > 0} />
              <AnswerCard q="Q6" label="Do we need the concatenation engine for StyleSeat?"
                text={data.answers.q6_need_concatenation} />
              <AnswerCard q="Q7" label="If we removed generated matching, how many confirmed operators remain?"
                text={data.answers.q7_without_generated} />

              {/* Recommendation */}
              <div style={{ marginTop: 20, padding: "18px 20px", background: "#fdf4ff", border: "2px solid #e9d5ff", borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed", marginBottom: 8 }}>RECOMMENDATION</div>
                {data.totals.fromDirectory === data.totalStyleSeatProspects && data.byMethod.generated_candidate === 0 ? (
                  <div style={{ fontSize: 13, color: "#1c1917" }}>
                    <strong>REDUCE</strong> — All current StyleSeat prospects came from the directory scrape. The concatenation engine
                    is providing IG handle discovery (not StyleSeat URL discovery). If IG cross-referencing is not a current priority,
                    the concatenation engine can be disabled or deprioritized for the StyleSeat pipeline without losing any StyleSeat provider assignments.
                    The StyleSeat URL and bookingProvider are assigned from the scraped source URL, not from generated matching.
                  </div>
                ) : data.byMethod.generated_candidate > data.byMethod.styleseat_directory ? (
                  <div style={{ fontSize: 13, color: "#1c1917" }}>
                    <strong>REVIEW</strong> — More prospects are coming from generated matching than directory source. Validate that
                    generated StyleSeat URLs are real pages belonging to the correct operator before keeping this approach.
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#1c1917" }}>
                    <strong>KEEP</strong> — Mixed sources detected. Review the generated candidates tab to verify match quality before
                    making a change.
                  </div>
                )}
              </div>
            </Section>
          )}
        </>
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: "#d6d3d1", textAlign: "right" }}>
        Admin only · StyleSeat Provenance Audit · Salon vertical
      </div>
    </div>
  );
}
