"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MarketCandidate,
  MarketCategoryBucket,
  MarketRecommendedAction,
  MarketReviewStatus,
  MarketVerificationStatus,
} from "@/lib/markets/types";
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
  maxWidth: 120,
};

const VERIFICATION_LABELS: Record<MarketVerificationStatus, string> = {
  live_verified: "Live verified",
  matched: "Matched",
  discovered: "Discovered",
};

const ACTION_LABELS: Record<MarketRecommendedAction, string> = {
  call_or_text: "Call / text",
  booking_profile_review: "Booking review",
  needs_manual_validation: "Manual validation",
};

const REVIEW_LABELS: Record<MarketReviewStatus, string> = {
  unreviewed: "Unreviewed",
  valid: "Valid",
  bad_data: "Bad data",
  duplicate: "Duplicate",
  do_not_contact: "Do not contact",
  priority: "Priority",
};

const CATEGORY_BUCKETS: MarketCategoryBucket[] = [
  "hair",
  "nails",
  "skin",
  "lashes",
  "barber",
  "massage",
  "wax",
  "other",
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
  if (!trimmed || trimmed.length < 12) return false;
  const host = hostOf(trimmed);
  if (host === "book.solasalonstudios.com") return trimmed.includes("/pro");
  if (host === "connect.vagaro.com" || host === "api.vagaro.com") return false;
  if (host.endsWith("vagaro.com")) return !trimmed.includes("/api");
  if (host === "book.vagaro.com") return true;
  if (host.endsWith("glossgenius.com")) return true;
  return false;
}

function pickBookingLink(candidate: MarketCandidate): string | undefined {
  return candidate.bookingLinks.find(isBookingLink) ?? candidate.profileUrl;
}

function pickWebsite(candidate: MarketCandidate): string | undefined {
  const urls = [candidate.website, ...(candidate.externalLinks ?? [])].filter(Boolean) as string[];
  return urls.find((url) => {
    const host = hostOf(url);
    return host && !host.includes("rackcdn") && !host.includes("vagaro") && !host.includes("sola");
  });
}

function pickSocialLink(candidate: MarketCandidate): string | undefined {
  return candidate.socialLinks.find((link) => {
    const host = hostOf(link);
    return host.includes("instagram") || host.includes("facebook") || host.includes("tiktok");
  });
}

function scoreColor(score: number): string {
  if (score >= 85) return "#15803d";
  if (score >= 70) return "#1d4ed8";
  if (score >= 50) return "#b45309";
  return "#78716c";
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
      }}
    >
      {label}
    </a>
  );
}

type Props = {
  candidates: MarketCandidate[];
};

export function MarketsCandidateTable({ candidates }: Props) {
  const [rows, setRows] = useState(candidates);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [minAcquisition, setMinAcquisition] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    setRows(candidates);
  }, [candidates]);

  const sources = useMemo(() => {
    return Array.from(new Set(candidates.map((c) => c.sourceProvider))).sort();
  }, [candidates]);

  const locations = useMemo(() => {
    return Array.from(new Set(candidates.map((c) => c.locationSlug))).sort();
  }, [candidates]);

  const filtered = useMemo(() => {
    const minScore = minAcquisition.trim() ? Number.parseInt(minAcquisition, 10) : 0;
    return rows
      .filter((c) => sourceFilter === "all" || c.sourceProvider === sourceFilter)
      .filter((c) => categoryFilter === "all" || c.categoryBuckets.includes(categoryFilter as MarketCategoryBucket))
      .filter((c) => locationFilter === "all" || c.locationSlug === locationFilter)
      .filter((c) => verificationFilter === "all" || c.verificationStatus === verificationFilter)
      .filter((c) => actionFilter === "all" || c.recommendedAction === actionFilter)
      .filter((c) => reviewFilter === "all" || c.reviewStatus === reviewFilter)
      .filter((c) => !Number.isFinite(minScore) || minScore <= 0 || c.acquisitionScore >= minScore)
      .sort((a, b) => {
        if (b.acquisitionScore !== a.acquisitionScore) return b.acquisitionScore - a.acquisitionScore;
        return b.contactabilityScore - a.contactabilityScore;
      });
  }, [
    rows,
    sourceFilter,
    categoryFilter,
    locationFilter,
    verificationFilter,
    actionFilter,
    reviewFilter,
    minAcquisition,
  ]);

  const saveReview = useCallback(async (candidate: MarketCandidate, reviewStatus: MarketReviewStatus, notes?: string) => {
    if (candidate.sourceProvider !== "sola") return;
    setSavingKey(candidate.candidateKey);
    setReviewError("");
    try {
      const res = await fetch("/api/admin/markets/sola/review-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateKey: candidate.candidateKey,
          reviewStatus,
          notes: notes ?? candidate.notes,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setReviewError(data.error ?? "Failed to save review");
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.candidateKey === candidate.candidateKey
            ? {
                ...row,
                reviewStatus,
                notes: notes ?? row.notes,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      );
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Failed to save review");
    } finally {
      setSavingKey(null);
    }
  }, []);

  return (
    <div className="mt-5">
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>Unified candidates</h2>
      <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 16px" }}>
        Normalized registry across market sources. Rebuild with{" "}
        <code style={{ fontSize: 11, background: "#f5f5f4", padding: "2px 6px", borderRadius: 4 }}>
          npm run build:markets
        </code>
        .
      </p>

      {reviewError ? (
        <div style={{ marginBottom: 12, fontSize: 12, color: "#b91c1c" }}>{reviewError}</div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={selectStyle}>
          <option value="all">Source: All</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="all">Category: All</option>
          {CATEGORY_BUCKETS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={selectStyle}>
          <option value="all">Location: All</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} style={selectStyle}>
          <option value="all">Verification: All</option>
          {(Object.keys(VERIFICATION_LABELS) as MarketVerificationStatus[]).map((v) => (
            <option key={v} value={v}>
              {VERIFICATION_LABELS[v]}
            </option>
          ))}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={selectStyle}>
          <option value="all">Action: All</option>
          {(Object.keys(ACTION_LABELS) as MarketRecommendedAction[]).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>
        <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} style={selectStyle}>
          <option value="all">Review: All</option>
          {(Object.keys(REVIEW_LABELS) as MarketReviewStatus[]).map((r) => (
            <option key={r} value={r}>
              {REVIEW_LABELS[r]}
            </option>
          ))}
        </select>
        <input
          value={minAcquisition}
          onChange={(e) => setMinAcquisition(e.target.value)}
          placeholder="Min acquire"
          style={{ ...selectStyle, width: 90 }}
        />
        <span style={{ fontSize: 12, color: "#78716c", alignSelf: "center" }}>
          Showing {filtered.length} of {candidates.length}
        </span>
      </div>

      <AdminIntelTableScroll minWidth={1320} borderRadius={12}>
        <table style={adminIntelTableStyle(1320)}>
          <thead>
            <tr>
              <th style={thStyle}>Operator</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Category</th>
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
                <td colSpan={12} style={{ ...tdStyle, textAlign: "center", color: "#a8a29e" }}>
                  No candidates match filters.
                </td>
              </tr>
            ) : (
              filtered.map((candidate) => {
                const booking = pickBookingLink(candidate);
                const website = pickWebsite(candidate);
                const social = pickSocialLink(candidate);
                const primaryBucket = candidate.categoryBuckets[0] ?? "other";

                return (
                  <tr key={`${candidate.sourceProvider}:${candidate.candidateKey}`}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: "#1c1917" }}>{candidate.displayName}</div>
                      {candidate.businessName ? <div style={ADMIN_INTEL_META}>{candidate.businessName}</div> : null}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{candidate.sourceProvider}</div>
                      <div style={ADMIN_INTEL_META}>{candidate.sourceType}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{candidate.locationSlug}</div>
                      {candidate.suiteNumber ? <div style={ADMIN_INTEL_META}>Suite {candidate.suiteNumber}</div> : null}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: "#ede9fe",
                          color: "#5b21b6",
                        }}
                      >
                        {primaryBucket}
                      </span>
                    </td>
                    <td style={tdStyle}>{candidate.phones[0] ?? "—"}</td>
                    <td style={tdStyle}>
                      {booking ? (
                        <a href={booking} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4338ca" }}>
                          Book
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={tdStyle}>
                      {website ? (
                        <a href={website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4338ca", display: "block" }}>
                          Web
                        </a>
                      ) : null}
                      {social ? (
                        <a href={social} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4338ca", display: "block" }}>
                          Social
                        </a>
                      ) : null}
                      {!website && !social ? "—" : null}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: scoreColor(candidate.contactabilityScore) }}>
                      {candidate.contactabilityScore}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: scoreColor(candidate.acquisitionScore) }}>
                      {candidate.acquisitionScore}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{VERIFICATION_LABELS[candidate.verificationStatus]}</div>
                      <div style={ADMIN_INTEL_META}>{ACTION_LABELS[candidate.recommendedAction]}</div>
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={candidate.reviewStatus}
                        disabled={savingKey === candidate.candidateKey || candidate.sourceProvider !== "sola"}
                        onChange={(e) => {
                          void saveReview(candidate, e.target.value as MarketReviewStatus);
                        }}
                        style={rowSelectStyle}
                      >
                        {(Object.keys(REVIEW_LABELS) as MarketReviewStatus[]).map((r) => (
                          <option key={r} value={r}>
                            {REVIEW_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      {candidate.profileUrl ? linkBtn(candidate.profileUrl, "Profile") : null}
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
    </div>
  );
}
