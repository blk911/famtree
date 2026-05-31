"use client";
// components/admin/intelligence/transpo/CarrierOpportunityDrawer.tsx
// Reusable right-side drawer (full-screen on narrow viewports) showing the full
// Transpo intelligence record for one carrier. Fetches
// /api/admin/intelligence/transpo/carriers/[carrierId]/detail on open.
// No new dependencies — inline styles + a single fixed overlay.

import { useCallback, useEffect, useState } from "react";
import type { TranspoCarrierTarget, TranspoEvidence } from "@/lib/intelligence/transpo/types";
import type {
  TranspoCarrierVerification,
  TranspoCarrierReview,
  TranspoReviewStatus,
} from "@/lib/intelligence/transpo/verification-types";
import type { TranspoOpportunityRecord } from "@/lib/intelligence/transpo/opportunity-engine";

type SourceLink = { label: string; url: string };

type DetailResponse = {
  ok: boolean;
  carrier?: TranspoCarrierTarget;
  verification?: TranspoCarrierVerification | null;
  evidence?: TranspoEvidence[];
  opportunity?: TranspoOpportunityRecord | null;
  review?: TranspoCarrierReview | null;
  sourceLinks?: SourceLink[];
  notes?: string[];
  error?: string;
  detail?: string;
  debug?: Record<string, unknown>;
};

type Props = {
  carrierId: string | null;
  open: boolean;
  onClose: () => void;
  /** Called after a review is saved, so the parent list can refresh. */
  onReviewed?: (carrierId: string, status: TranspoReviewStatus) => void;
};

const NA = "Not available";

export const REVIEW_STATUS_META: Record<TranspoReviewStatus, { label: string; fg: string; bg: string; bd: string }> = {
  unreviewed: { label: "Unreviewed", fg: "#57534e", bg: "#f5f5f4", bd: "#e7e5e4" },
  approved: { label: "Approved", fg: "#166534", bg: "#dcfce7", bd: "#bbf7d0" },
  needs_verification: { label: "Needs Verification", fg: "#92400e", bg: "#fef3c7", bd: "#fde68a" },
  watchlist: { label: "Watchlist", fg: "#1e40af", bg: "#dbeafe", bd: "#bfdbfe" },
  rejected: { label: "Rejected", fg: "#991b1b", bg: "#fef2f2", bd: "#fecaca" },
};

export function ReviewStatusBadge({ status }: { status?: TranspoReviewStatus }) {
  const meta = REVIEW_STATUS_META[status ?? "unreviewed"];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      color: meta.fg, background: meta.bg, border: `1px solid ${meta.bd}`, whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

function scoreColor(score: number): { fg: string; bg: string; bd: string } {
  if (score >= 60) return { fg: "#166534", bg: "#dcfce7", bd: "#bbf7d0" };
  if (score >= 35) return { fg: "#92400e", bg: "#fef3c7", bd: "#fde68a" };
  return { fg: "#57534e", bg: "#f5f5f4", bd: "#e7e5e4" };
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return NA;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function ExtLink({ href, label }: { href?: string; label?: string }) {
  if (!href) return <span style={{ color: "#a8a29e" }}>{NA}</span>;
  const safe = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer"
      style={{ color: "#4338ca", fontWeight: 600, textDecoration: "none", wordBreak: "break-all" }}>
      {label || safe.replace(/^https?:\/\//i, "")}
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid #f0efed", padding: "14px 18px" }}>
      <h3 style={{ fontSize: 12, fontWeight: 800, color: "#1c1917", textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 8px" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "3px 0", fontSize: 12, lineHeight: 1.5 }}>
      <span style={{ minWidth: 132, color: "#a8a29e", fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#1c1917", wordBreak: "break-word", flex: 1 }}>{children}</span>
    </div>
  );
}

function Chips({ items, tone = "indigo" }: { items: string[]; tone?: "indigo" | "blue" }) {
  if (!items || items.length === 0) return <span style={{ color: "#a8a29e", fontSize: 12 }}>{NA}</span>;
  const palette =
    tone === "blue"
      ? { color: "#1e40af", background: "#dbeafe", border: "#bfdbfe" }
      : { color: "#3730a3", background: "#eef2ff", border: "#c7d2fe" };
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {items.map((s) => (
        <span key={s} style={{
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
          color: palette.color, background: palette.background, border: `1px solid ${palette.border}`,
        }}>
          {s}
        </span>
      ))}
    </span>
  );
}

export function CarrierOpportunityDrawer({ carrierId, open, onClose, onReviewed }: Props) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviewStatus, setReviewStatus] = useState<TranspoReviewStatus>("unreviewed");
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");
  const [reviewErr, setReviewErr] = useState("");

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(
        `/api/admin/intelligence/transpo/carriers/${encodeURIComponent(id)}/detail`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as DetailResponse;
      if (json.ok) {
        setData(json);
        setReviewStatus(json.review?.reviewStatus ?? "unreviewed");
        setReviewNotes(json.review?.reviewNotes ?? "");
      } else {
        setError(json.error ?? json.detail ?? "Failed to load carrier detail");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && carrierId) void load(carrierId);
  }, [open, carrierId, load]);

  const submitReview = useCallback(
    async (status: TranspoReviewStatus) => {
      const id = data?.carrier?.id;
      if (!id) return;
      setSavingReview(true);
      setReviewMsg("");
      setReviewErr("");
      try {
        const res = await fetch("/api/admin/intelligence/transpo/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ carrierId: id, reviewStatus: status, reviewNotes }),
        });
        const json = (await res.json()) as { ok: boolean; review?: TranspoCarrierReview; error?: string };
        if (json.ok && json.review) {
          setReviewStatus(json.review.reviewStatus);
          setData((prev) => (prev ? { ...prev, review: json.review } : prev));
          setReviewMsg(`Marked ${REVIEW_STATUS_META[json.review.reviewStatus].label}.`);
          onReviewed?.(id, json.review.reviewStatus);
        } else {
          setReviewErr(json.error ?? "Failed to save review");
        }
      } catch (e) {
        setReviewErr(e instanceof Error ? e.message : String(e));
      } finally {
        setSavingReview(false);
      }
    },
    [data?.carrier?.id, reviewNotes, onReviewed],
  );

  if (!open) return null;

  const carrier = data?.carrier;
  const v = data?.verification ?? undefined;
  const opp = data?.opportunity ?? undefined;
  const sc = scoreColor(opp?.score ?? 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(28,25,23,0.45)",
        display: "flex", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: "min(560px, 100%)",
          height: "100%",
          background: "#fff",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #e7e5e4", padding: "16px 18px", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#1c1917", wordBreak: "break-word" }}>
                {carrier?.companyName ?? (loading ? "Loading…" : "Carrier")}
              </div>
              {carrier && (
                <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>
                  {[carrier.dotNumber ? `DOT ${carrier.dotNumber}` : null, carrier.mcNumber ? `MC ${carrier.mcNumber}` : null,
                    [carrier.city, carrier.state].filter(Boolean).join(", ") || null]
                    .filter(Boolean)
                    .join("  ·  ") || NA}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ fontSize: 18, lineHeight: 1, fontWeight: 700, border: "1px solid #e7e5e4", background: "#fafaf9", color: "#57534e", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          {opp && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 13, fontWeight: 800, padding: "3px 11px", borderRadius: 20,
                color: sc.fg, background: sc.bg, border: `1px solid ${sc.bd}`,
              }}>
                Score {opp.score}
              </span>
              <span style={{ fontSize: 12, color: "#44403c", fontWeight: 600 }}>{opp.recommendedPlay}</span>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <p style={{ fontSize: 13, color: "#78716c", padding: "18px" }}>Loading carrier detail…</p>
        ) : error ? (
          <div style={{ margin: 18, fontSize: 12, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px" }}>
            ✗ {error}
          </div>
        ) : !carrier ? (
          <p style={{ fontSize: 13, color: "#78716c", padding: "18px" }}>No carrier data.</p>
        ) : (
          <div>
            {/* Review action bar */}
            <Section title="Review">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#a8a29e", fontWeight: 600 }}>Current:</span>
                <ReviewStatusBadge status={reviewStatus} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {([
                  { status: "approved" as const, label: "Approve Target", fg: "#166534", bd: "#bbf7d0", bg: "#dcfce7" },
                  { status: "needs_verification" as const, label: "Needs More Verification", fg: "#92400e", bd: "#fde68a", bg: "#fffbeb" },
                  { status: "watchlist" as const, label: "Watchlist", fg: "#1e40af", bd: "#bfdbfe", bg: "#eff6ff" },
                  { status: "rejected" as const, label: "Reject", fg: "#991b1b", bd: "#fecaca", bg: "#fef2f2" },
                ]).map((b) => (
                  <button
                    key={b.status}
                    type="button"
                    disabled={savingReview}
                    onClick={() => submitReview(b.status)}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
                      border: `1px solid ${b.bd}`, background: reviewStatus === b.status ? b.bg : "#fff",
                      color: b.fg, cursor: savingReview ? "not-allowed" : "pointer",
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Review notes"
                rows={2}
                style={{
                  width: "100%", fontSize: 12, padding: "8px 10px", borderRadius: 8,
                  border: "1px solid #e7e5e4", color: "#1c1917", resize: "vertical", boxSizing: "border-box",
                }}
              />
              {savingReview && <div style={{ fontSize: 11, color: "#78716c", marginTop: 4 }}>Saving…</div>}
              {reviewMsg && <div style={{ fontSize: 11, color: "#166534", fontWeight: 700, marginTop: 4 }}>✓ {reviewMsg}</div>}
              {reviewErr && <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginTop: 4 }}>✗ {reviewErr}</div>}
            </Section>

            {/* B. Identity / FMCSA */}
            <Section title="Identity / FMCSA">
              <Field label="Authority">{fmt(carrier.authorityStatus)}</Field>
              <Field label="Fleet size">{fmt(carrier.fleetSize)}</Field>
              <Field label="Drivers">{fmt(carrier.driverCount)}</Field>
              <Field label="Phone">{fmt(carrier.phone)}</Field>
              <Field label="Website"><ExtLink href={carrier.website} /></Field>
              <Field label="Sources"><Chips items={carrier.sources ?? []} tone="blue" /></Field>
            </Section>

            {/* C. Verification summary */}
            <Section title="Verification Summary">
              {v ? (
                <>
                  <Field label="Score">{fmt(v.verificationScore)}</Field>
                  <Field label="Status">{fmt(v.verificationStatus)}</Field>
                  <Field label="Providers"><Chips items={v.providersChecked ?? []} /></Field>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>No verification run yet for this carrier.</p>
              )}
            </Section>

            {/* D. State entity */}
            <Section title="State Entity">
              {v?.stateEntityFound ? (
                <>
                  <Field label="Entity name">{fmt(v.stateEntityName)}</Field>
                  <Field label="Status">{fmt(v.entityStatus)}</Field>
                  <Field label="Good standing">{fmt(v.entityGoodStanding)}</Field>
                  <Field label="Formation date">{fmt(v.entityFormationDate)}</Field>
                  <Field label="Age (months)">{fmt(v.entityAgeMonths)}</Field>
                  <Field label="Name match">
                    {typeof v.stateNameMatchConfidence === "number" ? `${Math.round(v.stateNameMatchConfidence * 100)}%` : NA}
                  </Field>
                  <Field label="Registry link"><ExtLink href={v.stateEntityUrl} label="View entity" /></Field>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
                  {v?.stateRegistryProvider === "placeholder"
                    ? "State registry not connected for this state."
                    : "No state entity match."}
                </p>
              )}
            </Section>

            {/* E. Google / public presence */}
            <Section title="Google / Public Presence">
              {v?.googleFound ? (
                <>
                  <Field label="Business name">{fmt(v.googleBusinessName)}</Field>
                  <Field label="Rating">
                    {typeof v.googleRating === "number"
                      ? `${v.googleRating.toFixed(1)}${typeof v.googleReviewCount === "number" ? ` (${v.googleReviewCount} reviews)` : ""}`
                      : NA}
                  </Field>
                  <Field label="Phone">{fmt(v.googlePhone)}</Field>
                  <Field label="Website"><ExtLink href={v.googleWebsite} /></Field>
                  <Field label="Match">
                    {typeof v.googleMatchConfidence === "number" ? `${Math.round(v.googleMatchConfidence * 100)}%` : NA}
                  </Field>
                  <Field label="Maps"><ExtLink href={v.googleMapsUrl} label="Open in Maps" /></Field>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>No Google Business match (or provider not connected).</p>
              )}
            </Section>

            {/* F. Website crawl */}
            <Section title="Website Crawl">
              {v?.websiteFetchStatus && v.websiteFetchStatus !== "not_attempted" ? (
                <>
                  <Field label="Fetch status">{fmt(v.websiteFetchStatus)}</Field>
                  <Field label="Title">{fmt(v.websiteTitle)}</Field>
                  <Field label="Description">{fmt(v.websiteDescription)}</Field>
                  <Field label="Final URL"><ExtLink href={v.websiteFinalUrl} /></Field>
                  <Field label="Signals"><Chips items={(v.websiteSignals ?? []).map((s) => s.replace(/_/g, " "))} /></Field>
                  <Field label="Pages checked">{(v.websitePagesChecked ?? []).length || NA}</Field>
                  <Field label="Contacts">
                    {`${(v.websiteExtractedPhones ?? []).length} phone(s), ${(v.websiteExtractedEmails ?? []).length} email(s)`}
                  </Field>
                  <Field label="Hiring">{fmt(v.websiteHiringFound)}</Field>
                  <Field label="Owner-operator">{fmt(v.websiteOwnerOperatorFound)}</Field>
                  <Field label="Quote request">{fmt(v.websiteQuoteRequestFound)}</Field>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>No website crawl recorded.</p>
              )}
            </Section>

            {/* G. Opportunity signals */}
            <Section title="Opportunity Signals">
              {opp ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <Chips items={(opp.signals ?? []).map((s) => s.label)} />
                  </div>
                  <Field label="Recommended play">{fmt(opp.recommendedPlay)}</Field>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>No opportunity scored.</p>
              )}
            </Section>

            {/* H. Evidence */}
            <Section title={`Evidence (${data?.evidence?.length ?? 0})`}>
              {(data?.evidence ?? []).length === 0 ? (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>No evidence collected.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {(data?.evidence ?? []).map((e) => (
                    <div key={e.id} style={{ fontSize: 11, color: "#44403c", borderBottom: "1px solid #f5f5f4", paddingBottom: 5 }}>
                      <span style={{ fontWeight: 700, color: "#3730a3" }}>{e.evidenceType}</span>
                      {" — "}
                      <span style={{ wordBreak: "break-word" }}>{e.value}</span>
                      <span style={{ color: "#a8a29e" }}>
                        {"  ·  "}conf {Math.round((e.confidence ?? 0) * 100)}%
                        {e.observedAt ? `  ·  ${new Date(e.observedAt).toLocaleDateString()}` : ""}
                      </span>
                      {e.sourceUrl ? <> {"  ·  "}<ExtLink href={e.sourceUrl} label="source" /></> : null}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* I. Source links */}
            <Section title="Source Links">
              {(data?.sourceLinks ?? []).length === 0 ? (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>{NA}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(data?.sourceLinks ?? []).map((l) => (
                    <ExtLink key={l.label} href={l.url} label={l.label} />
                  ))}
                </div>
              )}
            </Section>

            {/* Notes */}
            <Section title="Notes">
              {(data?.notes ?? []).length === 0 ? (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>{NA}</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#44403c", lineHeight: 1.6 }}>
                  {(data?.notes ?? []).map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
            </Section>

            <div style={{ height: 24 }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default CarrierOpportunityDrawer;
