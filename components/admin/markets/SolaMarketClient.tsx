"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SolaCategoryBucket,
  SolaResolverImportArtifact,
  SolaResolverImportRecord,
  SolaResolverRecommendedAction,
  SolaResolverVerificationStatus,
  SolaReviewStateMap,
  SolaReviewStatus,
} from "@/lib/operators/sources/sola/types";
import {
  ADMIN_INTEL_META,
  ADMIN_INTEL_TABLE_CELL as tdStyle,
  ADMIN_INTEL_TABLE_HEADER as thStyle,
} from "@/components/admin/intelligence/salon/admin-intelligence-typography";
import { AdminIntelTableScroll, adminIntelTableStyle } from "@/components/admin/intelligence/salon/AdminIntelTableScroll";

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e7e5e4",
  background: "#fff",
  color: "#44403c",
};

const rowSelectStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 6px",
  borderRadius: 6,
  border: "1px solid #e7e5e4",
  background: "#fff",
  color: "#44403c",
  maxWidth: 130,
};

const STATUS_STYLE: Record<SolaResolverVerificationStatus, { label: string; fg: string; bg: string }> = {
  live_verified: { label: "Live verified", fg: "#166534", bg: "#dcfce7" },
  matched: { label: "Matched", fg: "#1d4ed8", bg: "#dbeafe" },
  discovered: { label: "Discovered", fg: "#57534e", bg: "#f5f5f4" },
};

const ACTION_LABELS: Record<SolaResolverRecommendedAction, string> = {
  call_or_text: "Call / text",
  booking_profile_review: "Booking review",
  needs_manual_validation: "Manual validation",
};

const REVIEW_LABELS: Record<SolaReviewStatus, string> = {
  unreviewed: "Unreviewed",
  valid: "Valid",
  bad_data: "Bad data",
  duplicate: "Duplicate",
  do_not_contact: "Do not contact",
  priority: "Priority",
};

const ALL_CATEGORIES: SolaCategoryBucket[] = [
  "hair",
  "nails",
  "skin",
  "lashes",
  "barber",
  "massage",
  "wax",
  "other",
];

const REVIEW_FILTER_OPTIONS: SolaReviewStatus[] = [
  "unreviewed",
  "valid",
  "priority",
  "bad_data",
  "duplicate",
  "do_not_contact",
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isBookingLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 12 || trimmed === "https://www.") return false;
  if (trimmed.startsWith("tel:") || trimmed.startsWith("mailto:")) return false;

  const lower = trimmed.toLowerCase();
  const host = hostOf(trimmed);

  if (host === "book.solasalonstudios.com") {
    return lower.includes("/pro") && !lower.includes("/location");
  }
  if (host === "connect.vagaro.com" || host === "api.vagaro.com") return false;
  if (host.endsWith("vagaro.com")) {
    if (lower.includes("/api") || lower.includes("/new")) return false;
    return true;
  }
  if (host === "book.vagaro.com") return true;
  return false;
}

function isCdnAssetUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return true;
  return (
    host.includes("rackcdn.com") ||
    host.includes("cloudfront.net") ||
    host.includes("ssl.cf2")
  );
}

function pickBookingLink(record: SolaResolverImportRecord): string | undefined {
  return record.bookingLinks.find(isBookingLink) ?? record.profileUrl;
}

function pickWebsite(record: SolaResolverImportRecord): string | undefined {
  const urls = [record.website, ...(record.externalLinks ?? [])].filter(Boolean) as string[];
  return urls.find((url) => {
    const host = hostOf(url);
    if (!host || isCdnAssetUrl(url)) return false;
    if (host.includes("vagaro") || host.includes("sola")) return false;
    return true;
  });
}

function pickSocialLink(record: SolaResolverImportRecord): string | undefined {
  return record.socialLinks.find((link) => {
    const host = hostOf(link);
    return (
      host.includes("instagram") ||
      host.includes("facebook") ||
      host.includes("tiktok") ||
      host.includes("twitter") ||
      host.includes("x.com") ||
      host.includes("youtube")
    );
  });
}

function scoreColor(score: number): string {
  if (score >= 85) return "#15803d";
  if (score >= 70) return "#1d4ed8";
  if (score >= 50) return "#b45309";
  return "#78716c";
}

function resolveReviewStatus(
  candidateKey: string,
  reviewStates: SolaReviewStateMap,
): SolaReviewStatus {
  return reviewStates[candidateKey]?.reviewStatus ?? "unreviewed";
}

function rowStyle(reviewStatus: SolaReviewStatus): React.CSSProperties {
  if (reviewStatus === "priority") {
    return {
      background: "linear-gradient(90deg, #fff7ed 0%, #fffbeb 12%, #fff 100%)",
      boxShadow: "inset 4px 0 0 #f59e0b",
    };
  }
  if (
    reviewStatus === "bad_data" ||
    reviewStatus === "duplicate" ||
    reviewStatus === "do_not_contact"
  ) {
    return { background: "#f5f5f4", opacity: 0.58 };
  }
  if (reviewStatus === "valid") {
    return { background: "#f7fee7" };
  }
  return {};
}

function linkBtn(href: string, label: string): React.ReactNode {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 6,
        border: "1px solid #e7e5e4",
        background: "#fafaf9",
        color: "#4338ca",
        textDecoration: "none",
        marginRight: 4,
        marginBottom: 4,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </a>
  );
}

type ReviewedTargetsExportMeta = {
  csvAvailable: boolean;
  jsonAvailable: boolean;
  exportedCount?: number;
};

type Props = {
  artifact: SolaResolverImportArtifact | null;
  reviewedTargetsExport?: ReviewedTargetsExportMeta;
};

export function SolaMarketClient({ artifact, reviewedTargetsExport }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [slugFilter, setSlugFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [reviewStates, setReviewStates] = useState<SolaReviewStateMap>({});
  const [reviewError, setReviewError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{
    candidateKey: string;
    displayName: string;
    reviewStatus: SolaReviewStatus;
    notes: string;
  } | null>(null);

  const records = artifact?.records ?? [];
  const summary = artifact?.summary;

  const loadReviewStates = useCallback(async () => {
    setReviewError("");
    try {
      const res = await fetch("/api/admin/markets/sola/review-state", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setReviewError(data.error ?? "Failed to load review states");
        return;
      }
      setReviewStates(data.states ?? {});
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Failed to load review states");
    }
  }, []);

  useEffect(() => {
    loadReviewStates();
  }, [loadReviewStates]);

  const saveReview = useCallback(
    async (candidateKey: string, reviewStatus: SolaReviewStatus, notes?: string) => {
      setSavingKey(candidateKey);
      setReviewError("");
      try {
        const res = await fetch("/api/admin/markets/sola/review-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateKey,
            reviewStatus,
            notes: notes ?? reviewStates[candidateKey]?.notes ?? "",
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setReviewError(data.error ?? "Failed to save review");
          return;
        }
        setReviewStates(data.states ?? {});
      } catch (e) {
        setReviewError(e instanceof Error ? e.message : "Failed to save review");
      } finally {
        setSavingKey(null);
      }
    },
    [reviewStates],
  );

  const reviewedCount = useMemo(
    () => Object.keys(reviewStates).length,
    [reviewStates],
  );

  const slugs = useMemo(() => {
    const set = new Set(records.map((r) => r.slug));
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records
      .filter((r) => categoryFilter === "all" || r.categoryBucket === categoryFilter)
      .filter((r) => slugFilter === "all" || r.slug === slugFilter)
      .filter((r) => statusFilter === "all" || r.verificationStatus === statusFilter)
      .filter((r) => actionFilter === "all" || r.recommendedAction === actionFilter)
      .filter((r) => {
        if (reviewFilter === "all") return true;
        return resolveReviewStatus(r.candidateKey, reviewStates) === reviewFilter;
      })
      .sort((a, b) => {
        const aReview = resolveReviewStatus(a.candidateKey, reviewStates);
        const bReview = resolveReviewStatus(b.candidateKey, reviewStates);
        if (aReview === "priority" && bReview !== "priority") return -1;
        if (bReview === "priority" && aReview !== "priority") return 1;
        if (b.acquisitionScore !== a.acquisitionScore) {
          return b.acquisitionScore - a.acquisitionScore;
        }
        return b.contactabilityScore - a.contactabilityScore;
      });
  }, [
    records,
    categoryFilter,
    slugFilter,
    statusFilter,
    actionFilter,
    reviewFilter,
    reviewStates,
  ]);

  if (!artifact) {
    return (
      <div style={{ padding: "28px 20px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Sola Market</h1>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
          No resolver import artifact found. Run{" "}
          <code style={{ fontSize: 12, background: "#f5f5f4", padding: "2px 6px", borderRadius: 4 }}>
            npm run build:sola:resolver
          </code>{" "}
          to generate{" "}
          <code style={{ fontSize: 12, background: "#f5f5f4", padding: "2px 6px", borderRadius: 4 }}>
            runtime-data/sola/sola-resolver-import.generated.json
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 20px 60px", maxWidth: 1280, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Sola Market</h1>
          <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 720, lineHeight: 1.55 }}>
            Sola suite-directory resolver import with manual review overlay — {artifact.recordCount}{" "}
            candidates from <code style={{ fontSize: 11 }}>{artifact.sourceArtifact}</code>
            {artifact.generatedAt ? ` · generated ${new Date(artifact.generatedAt).toLocaleString()}` : null}.
            Review states are stored separately and do not mutate the generated import.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {reviewedTargetsExport?.csvAvailable ? (
            <>
              <a
                href="/api/admin/markets/sola/reviewed-targets?format=csv"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#4338ca",
                  color: "#fff",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Export reviewed targets (CSV)
              </a>
              {reviewedTargetsExport.jsonAvailable ? (
                <a
                  href="/api/admin/markets/sola/reviewed-targets?format=json"
                  style={{ fontSize: 11, fontWeight: 600, color: "#4338ca", textDecoration: "none" }}
                >
                  Download JSON
                  {typeof reviewedTargetsExport.exportedCount === "number"
                    ? ` (${reviewedTargetsExport.exportedCount})`
                    : null}
                </a>
              ) : null}
            </>
          ) : (
            <div
              style={{
                fontSize: 11,
                color: "#78716c",
                background: "#fafaf9",
                border: "1px solid #e7e5e4",
                borderRadius: 8,
                padding: "8px 12px",
                maxWidth: 280,
                lineHeight: 1.5,
              }}
            >
              No export yet. Run{" "}
              <code style={{ fontSize: 10, background: "#f5f5f4", padding: "1px 4px", borderRadius: 4 }}>
                npm run export:sola:reviewed
              </code>{" "}
              after marking candidates valid or priority.
            </div>
          )}
        </div>
      </div>

      {reviewError ? (
        <div
          style={{
            marginBottom: 16,
            fontSize: 12,
            color: "#b91c1c",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          {reviewError}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          ["Total records", summary?.total ?? artifact.recordCount],
          ["Live verified", summary?.liveVerified ?? 0],
          ["Reviewed", reviewedCount],
          ["Avg contactability", summary?.avgContactability ?? 0],
          ["Avg acquisition", summary?.avgAcquisition ?? 0],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: "#fff",
              border: "1px solid #e7e5e4",
              borderRadius: 12,
              padding: "14px 16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#1c1917" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="all">Category: All</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={slugFilter} onChange={(e) => setSlugFilter(e.target.value)} style={selectStyle}>
          <option value="all">Location: All</option>
          {slugs.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">Verification: All</option>
          {(Object.keys(STATUS_STYLE) as SolaResolverVerificationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_STYLE[s].label}
            </option>
          ))}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={selectStyle}>
          <option value="all">Action: All</option>
          {(Object.keys(ACTION_LABELS) as SolaResolverRecommendedAction[]).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>
        <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} style={selectStyle}>
          <option value="all">Review: All</option>
          {REVIEW_FILTER_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {REVIEW_LABELS[s]}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#78716c", alignSelf: "center" }}>
          Showing {filtered.length} of {records.length}
        </span>
      </div>

      <AdminIntelTableScroll minWidth={1320} borderRadius={12}>
        <table style={adminIntelTableStyle(1320)}>
          <thead>
            <tr>
              <th style={thStyle}>Operator</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Categories</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Booking</th>
              <th style={thStyle}>Web / Social</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Acquire</th>
              <th style={thStyle}>Verification</th>
              <th style={thStyle}>Review</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ ...tdStyle, textAlign: "center", color: "#a8a29e" }}>
                  No candidates match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((record) => {
                const booking = pickBookingLink(record);
                const website = pickWebsite(record);
                const social = pickSocialLink(record);
                const phone = record.phones[0];
                const verification = STATUS_STYLE[record.verificationStatus];
                const reviewStatus = resolveReviewStatus(record.candidateKey, reviewStates);
                const reviewNotes = reviewStates[record.candidateKey]?.notes ?? "";
                const isSaving = savingKey === record.candidateKey;

                return (
                  <tr key={record.candidateKey} style={rowStyle(reviewStatus)}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: "#1c1917" }}>{record.displayName}</span>
                        {reviewStatus === "priority" ? (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: 999,
                              background: "#fef3c7",
                              color: "#b45309",
                              letterSpacing: "0.04em",
                            }}
                          >
                            PRIORITY
                          </span>
                        ) : null}
                        {reviewStatus === "valid" ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: 999,
                              background: "#dcfce7",
                              color: "#166534",
                            }}
                            title="Reviewed valid"
                          >
                            ✓ Valid
                          </span>
                        ) : null}
                      </div>
                      {record.professionalName && record.professionalName !== record.displayName ? (
                        <div style={ADMIN_INTEL_META}>{record.professionalName}</div>
                      ) : null}
                      {record.businessName ? (
                        <div style={ADMIN_INTEL_META}>{record.businessName}</div>
                      ) : null}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{record.slug}</div>
                      {record.suiteNumber ? (
                        <div style={ADMIN_INTEL_META}>Suite {record.suiteNumber}</div>
                      ) : null}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {record.categoryBuckets.map((bucket) => (
                          <span
                            key={bucket}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 999,
                              background: bucket === record.categoryBucket ? "#ede9fe" : "#f5f5f4",
                              color: bucket === record.categoryBucket ? "#5b21b6" : "#78716c",
                            }}
                          >
                            {bucket}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={tdStyle}>{phone ?? "—"}</td>
                    <td style={tdStyle}>
                      {booking ? (
                        <a
                          href={booking}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "#4338ca", wordBreak: "break-all" }}
                        >
                          Book
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={tdStyle}>
                      {website ? (
                        <a
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "#4338ca", display: "block", marginBottom: 2 }}
                        >
                          Web
                        </a>
                      ) : null}
                      {social ? (
                        <a
                          href={social}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "#4338ca", display: "block" }}
                        >
                          Social
                        </a>
                      ) : null}
                      {!website && !social ? "—" : null}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: scoreColor(record.contactabilityScore) }}>
                      {record.contactabilityScore}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: scoreColor(record.acquisitionScore) }}>
                      {record.acquisitionScore}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: 999,
                          color: verification.fg,
                          background: verification.bg,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {verification.label}
                      </span>
                      <div style={{ ...ADMIN_INTEL_META, marginTop: 4 }}>
                        {ACTION_LABELS[record.recommendedAction]}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={reviewStatus}
                        disabled={isSaving}
                        onChange={(e) => {
                          void saveReview(
                            record.candidateKey,
                            e.target.value as SolaReviewStatus,
                            reviewNotes,
                          );
                        }}
                        style={rowSelectStyle}
                      >
                        {(Object.keys(REVIEW_LABELS) as SolaReviewStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {REVIEW_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setNotesModal({
                            candidateKey: record.candidateKey,
                            displayName: record.displayName,
                            reviewStatus,
                            notes: reviewNotes,
                          })
                        }
                        style={{
                          display: "block",
                          marginTop: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "1px solid #e7e5e4",
                          background: reviewNotes ? "#ede9fe" : "#fff",
                          color: "#5b21b6",
                          cursor: "pointer",
                        }}
                      >
                        {reviewNotes ? "Edit notes" : "Add notes"}
                      </button>
                      {reviewNotes ? (
                        <div
                          style={{
                            ...ADMIN_INTEL_META,
                            marginTop: 4,
                            maxWidth: 140,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={reviewNotes}
                        >
                          {reviewNotes}
                        </div>
                      ) : null}
                    </td>
                    <td style={tdStyle}>
                      {record.profileUrl ? linkBtn(record.profileUrl, "Profile") : null}
                      {booking ? linkBtn(booking, "Booking") : null}
                      {website ? linkBtn(website, "Website") : null}
                      {social ? linkBtn(social, "Social") : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </AdminIntelTableScroll>

      {notesModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 41, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
          onClick={() => setNotesModal(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e7e5e4",
              boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
              padding: "20px 22px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Review notes</h2>
            <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 14px" }}>{notesModal.displayName}</p>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", marginBottom: 6 }}>
              Review status
            </label>
            <select
              value={notesModal.reviewStatus}
              onChange={(e) =>
                setNotesModal({
                  ...notesModal,
                  reviewStatus: e.target.value as SolaReviewStatus,
                })
              }
              style={{ ...selectStyle, width: "100%", marginBottom: 12 }}
            >
              {(Object.keys(REVIEW_LABELS) as SolaReviewStatus[]).map((s) => (
                <option key={s} value={s}>
                  {REVIEW_LABELS[s]}
                </option>
              ))}
            </select>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", marginBottom: 6 }}>
              Notes
            </label>
            <textarea
              value={notesModal.notes}
              onChange={(e) => setNotesModal({ ...notesModal, notes: e.target.value })}
              rows={4}
              placeholder="Acquisition notes, data issues, outreach context…"
              style={{
                width: "100%",
                fontSize: 13,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e7e5e4",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setNotesModal(null)}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #e7e5e4",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingKey === notesModal.candidateKey}
                onClick={() => {
                  void saveReview(
                    notesModal.candidateKey,
                    notesModal.reviewStatus,
                    notesModal.notes,
                  ).then(() => setNotesModal(null));
                }}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#4338ca",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
