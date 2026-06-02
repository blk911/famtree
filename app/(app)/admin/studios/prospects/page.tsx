"use client";
// app/(app)/admin/studios/prospects/page.tsx
// Discovered Entities Under Review — education-first prospect repository.
// Admin-only. NOT member-facing.

import { Fragment, useState, useEffect, useMemo } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import type { ProspectRecord, ProspectStatus, ProspectListResponse } from "@/lib/studios/prospects/types";
import { PROSPECT_STATUS_LABELS, PROSPECT_STATUS_COLORS } from "@/lib/studios/prospects/types";
import { BUSINESS_CATEGORY_LABELS, RELATIONSHIP_OPPORTUNITY_LABELS } from "@/lib/studios/prospects/opportunity-taxonomy";
import type { RelationshipOpportunityType } from "@/lib/studios/prospects/opportunity-taxonomy";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_COLORS,
  EDUCATION_TYPE_LABELS,
  AUDIENCE_TYPE_LABELS,
  ARCHIVE_REASONS,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { ValidationStatus, EducationType, AudienceType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import { BookingProviderPill } from "@/components/admin/intelligence/salon/BookingProviderPill";
import { BookingProviderSourceChip } from "@/components/admin/intelligence/salon/BookingProviderSourceChip";
import { ProviderDetectionDetail } from "@/components/admin/intelligence/salon/ProviderDetectionDetail";
import { SalonProspectDrawer } from "@/components/admin/intelligence/salon/SalonProspectDrawer";
import { ProviderDiscoveryBackfillButton } from "@/components/admin/intelligence/salon/ProviderDiscoveryBackfillButton";
import { PublicPresenceBackfillButton } from "@/components/admin/intelligence/salon/PublicPresenceBackfillButton";
import { SalonOperatorSummary } from "@/components/admin/intelligence/salon/SalonOperatorSummary";
import { isSalonImportCandidate } from "@/lib/intelligence/salon/import-candidate";
import { getBookingProviderLabel } from "@/lib/intelligence/salon/provider-detector";
import { bookingProviderForDisplay } from "@/lib/intelligence/salon/gg-booking-display";
import {
  BusinessStackChips,
  ImportCandidateChip,
  StackPaymentChip,
} from "@/components/admin/intelligence/salon/BusinessStackChips";
import type { SalonBusinessStack } from "@/lib/intelligence/salon/business-stack/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confColor(n: number) {
  if (n >= 65) return "#16a34a";
  if (n >= 35) return "#d97706";
  return "#dc2626";
}

function ValidationBadge({ vs }: { vs: ValidationStatus | undefined }) {
  const status = vs ?? "new";
  const c = VALIDATION_STATUS_COLORS[status] ?? { bg: "#f5f5f4", fg: "#78716c" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      background: c.bg, color: c.fg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {VALIDATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatusBadge({ status }: { status: ProspectStatus }) {
  const c = PROSPECT_STATUS_COLORS[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      background: c.bg, color: c.fg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {PROSPECT_STATUS_LABELS[status]}
    </span>
  );
}

function evidenceLabel(e: ProspectRecord["evidence"][number]): string {
  if (typeof e === "string") return e;
  return [
    `${e.type}: ${e.label}`,
    e.city,
    e.serviceCategory,
    e.url,
  ].filter(Boolean).join(" | ");
}

function tagLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type SalonCategoryKey =
  | "hair"
  | "nails"
  | "esthetics"
  | "brows"
  | "lashes"
  | "massage"
  | "barber"
  | "salon_suite"
  | "spa";

const SALON_CATEGORIES: Array<{
  key: SalonCategoryKey;
  label: string;
  subtypes: string[];
  categoryGuesses: string[];
}> = [
  { key: "hair", label: "Hair", subtypes: ["hair", "braids", "extensions", "colorist"], categoryGuesses: ["hair"] },
  { key: "nails", label: "Nails", subtypes: ["nails"], categoryGuesses: ["nail"] },
  { key: "esthetics", label: "Esthetics", subtypes: ["esthetics", "medical_aesthetics", "waxing"], categoryGuesses: ["esthetic", "skin", "medical aesthetic"] },
  { key: "brows", label: "Brows", subtypes: ["brows", "brow"], categoryGuesses: ["brow"] },
  { key: "lashes", label: "Lashes", subtypes: ["lashes", "lash"], categoryGuesses: ["lash"] },
  { key: "massage", label: "Massage", subtypes: ["massage"], categoryGuesses: ["massage"] },
  { key: "barber", label: "Barber", subtypes: ["barber"], categoryGuesses: ["barber"] },
  { key: "salon_suite", label: "Salon Suite", subtypes: ["salon_suite", "suite"], categoryGuesses: ["salon suite", "suite"] },
  { key: "spa", label: "Spa", subtypes: ["spa"], categoryGuesses: ["spa"] },
];

function prospectMatchesSalonCategory(p: ProspectRecord, key: SalonCategoryKey): boolean {
  const def = SALON_CATEGORIES.find((c) => c.key === key);
  if (!def) return false;
  const sub = (p.businessSubcategory ?? "").toLowerCase();
  const guess = (p.identity.categoryGuess ?? "").toLowerCase();
  if (def.subtypes.some((s) => sub.includes(s))) return true;
  if (def.categoryGuesses.some((g) => guess.includes(g))) return true;
  return false;
}

function salonCategoryLabel(p: ProspectRecord): string {
  const hit = SALON_CATEGORIES.find((c) => prospectMatchesSalonCategory(p, c.key));
  return hit?.label ?? (p.businessSubcategory ? friendlySubtypeLabel(p.businessSubcategory) : "");
}

const EXTRA_SUBTYPE_LABELS: Record<string, string> = {
  artist: "Artist",
  event_vendor: "Event Vendor",
  esthetics: "Esthetics",
  medical_aesthetics: "Medical Aesthetics",
  musician: "Musician",
  other_unknown: "Other / Unknown",
  pet_services: "Pet Services",
  retail_maker: "Retail / Maker",
  videographer: "Videographer",
  wellness_coach: "Wellness Coach",
  wedding_planner: "Wedding Planner",
  waxing: "Waxing",
  homeschool: "Homeschool",
  microschool: "Microschool",
  photographer: "Photographer",
  tutor: "Tutor",
};

function friendlySubtypeLabel(value?: string | null): string {
  if (!value) return "Unknown";
  return EXTRA_SUBTYPE_LABELS[value] ?? tagLabel(value);
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

// ─── Expanded detail ──────────────────────────────────────────────────────────

function ProspectDetail({ prospect, onSaved }: {
  prospect: ProspectRecord;
  onSaved: (updated: ProspectRecord) => void;
}) {
  const [status, setStatus]           = useState<ProspectStatus>(prospect.status);
  const [vs, setVs]                   = useState<ValidationStatus>(prospect.validationStatus ?? "new");
  const [archiveReason, setArchiveReason] = useState(prospect.archiveReason ?? "");
  const [notes, setNotes]             = useState(prospect.notes);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/studios/prospects/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId: prospect.prospectId,
          status,
          validationStatus: vs,
          notes,
          archiveReason: vs === "archive" ? archiveReason : null,
        }),
      });
      const data = await res.json();
      if (data.ok) { onSaved(data.prospect); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setSaving(false); }
  }

  const sel: React.CSSProperties = {
    width: "100%", padding: "6px 10px", border: "1px solid #e7e5e4",
    borderRadius: 8, fontSize: 12, background: "#fff", color: "#1c1917",
  };

  return (
    <div style={{ padding: "16px 20px 20px", background: "#fafaf9", borderTop: "1px solid #f0ede8" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Left */}
        <div>
          {/* Source path */}
          {prospect.sourcePath && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 4 }}>SOURCE PATH</div>
              <div style={{ fontSize: 11, color: "#78716c", fontFamily: "monospace", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 6, padding: "5px 9px" }}>
                {prospect.sourcePath}
              </div>
            </div>
          )}

          {/* Education tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {prospect.educationType && (
              <span style={{ fontSize: 10, background: "#ede9fe", color: "#6d28d9", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                {EDUCATION_TYPE_LABELS[prospect.educationType] ?? prospect.educationType}
              </span>
            )}
            {prospect.audienceType && (
              <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                {AUDIENCE_TYPE_LABELS[prospect.audienceType] ?? prospect.audienceType}
              </span>
            )}
            {prospect.sourceHashtag && (
              <span style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                #{prospect.sourceHashtag}
              </span>
            )}
          </div>

          {/* Matched URLs */}
          {prospect.allMatchedUrls.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>MATCHED URLS</div>
              {prospect.allMatchedUrls.map((u, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, background: "#f5f5f4", color: "#78716c", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>{u.platform}</span>
                  <a href={u.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "#0284c7", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                    {u.url}
                  </a>
                  <span style={{ fontSize: 10, color: confColor(u.confidence), fontWeight: 700, flexShrink: 0 }}>{u.confidence}</span>
                </div>
              ))}
            </div>
          )}

          {/* Opportunity classification */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>RELATIONSHIP OPPORTUNITY</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
              {prospect.businessCategory && (
                <span style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                  {BUSINESS_CATEGORY_LABELS[prospect.businessCategory as keyof typeof BUSINESS_CATEGORY_LABELS] ?? tagLabel(String(prospect.businessCategory))}
                </span>
              )}
              {prospect.relationshipOpportunityType && (
                <span style={{ fontSize: 10, background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                  {RELATIONSHIP_OPPORTUNITY_LABELS[prospect.relationshipOpportunityType as keyof typeof RELATIONSHIP_OPPORTUNITY_LABELS] ?? tagLabel(String(prospect.relationshipOpportunityType))}
                </span>
              )}
              {(prospect.offerFitTags ?? []).slice(0, 5).map((tag) => (
                <span key={tag} style={{ fontSize: 10, background: "#f0fdf4", color: "#15803d", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                  {tagLabel(tag)}
                </span>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
              {[
                ["Overall", prospect.overallOpportunityScore],
                ["Rel", prospect.relationshipScore],
                ["Audience", prospect.audienceScore],
                ["Ops", prospect.operationalDataScore],
                ["Community", prospect.communityScore],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 6, padding: "5px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: confColor(Number(val ?? 0)) }}>{val ?? "—"}</div>
                  <div style={{ fontSize: 8, color: "#a8a29e", fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
            {(prospect.platformSignals ?? []).length > 0 && (
              <div style={{ marginTop: 7, fontSize: 10, color: "#78716c" }}>
                Signals: {(prospect.platformSignals ?? []).map(tagLabel).join(", ")}
              </div>
            )}
            <ProviderDetectionDetail prospect={prospect} variant="panel" />
          </div>

          {/* Evidence */}
          {prospect.evidence.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>EVIDENCE</div>
              {prospect.evidence.slice(0, 6).map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: "#57534e", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 5, padding: "3px 8px", marginBottom: 2, fontFamily: "monospace" }}>
                  {evidenceLabel(e)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right */}
        <div>
          {/* Validation status */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>VALIDATION STATUS</div>
            <select value={vs} onChange={(e) => setVs(e.target.value as ValidationStatus)} style={sel}>
              {(Object.keys(VALIDATION_STATUS_LABELS) as ValidationStatus[]).map((s) => (
                <option key={s} value={s}>{VALIDATION_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Archive reason */}
          {vs === "archive" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>ARCHIVE REASON</div>
              <select value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} style={sel}>
                <option value="">Select reason…</option>
                {ARCHIVE_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          )}

          {/* CRM status */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>CRM STATUS</div>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProspectStatus)} style={sel}>
              {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map((s) => (
                <option key={s} value={s}>{PROSPECT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>NOTES</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Add admin notes…"
              style={{ ...sel, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: saved ? "#15803d" : "#1c1917", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saved ? "✓ Saved" : saving ? "Saving…" : "Save"}
          </button>

          {prospect.bestMatch && (
            <div style={{ marginTop: 10 }}>
              <a href={`/admin/studios/creator-lab?url=${encodeURIComponent(prospect.bestMatch.url)}`}
                style={{ fontSize: 11, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
                Assemble in Studio Assembler →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SortKey = "name" | "handle" | "educationType" | "businessCategory" | "location" | "platform" | "confidence" | "validationStatus" | "createdAt" | "businessSubcategory" | "bookingProvider" | "bestUrl";

const BOOKING_PROVIDER_FILTERS = [
  { value: "all", label: "All booking providers" },
  { value: "glossgenius", label: "GlossGenius" },
  { value: "vagaro", label: "Vagaro" },
  { value: "square", label: "Square" },
  { value: "booksy", label: "Booksy" },
  { value: "fresha", label: "Fresha" },
  { value: "styleseat", label: "StyleSeat" },
  { value: "unknown", label: "Unknown" },
] as const;

export default function ProspectsPage() {
  const [prospects, setProspects]   = useState<ProspectRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [backendWarnings, setBackendWarnings] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey]       = useState<SortKey>("createdAt");
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("desc");

  // Filters
  const [fValidation, setFValidation]     = useState<ValidationStatus | "all">("all");
  const [fEducationType, setFEducationType] = useState<EducationType | "all">("all");
  const [fAudienceType, setFAudienceType] = useState<AudienceType | "all">("all");
  const [fHashtag, setFHashtag]           = useState("all");
  const [fPlatform, setFPlatform]         = useState("all");
  const [fMinConf, setFMinConf]           = useState(0);
  const [fBusinessCategory, setFBusinessCategory] = useState("all");
  const [fPlatformSignal, setFPlatformSignal] = useState("all");
  const [fOfferFitTag, setFOfferFitTag] = useState("all");
  const [fBookingProvider, setFBookingProvider] = useState("all");
  const [fBookingSource, setFBookingSource] = useState("all");
  const [fImportCandidate, setFImportCandidate] = useState(false);
  const [fConfidenceBucket, setFConfidenceBucket] = useState("all");
  const [drawerProspectId, setDrawerProspectId] = useState<string | null>(null);
  const [statsProspects, setStatsProspects] = useState<ProspectRecord[]>([]);
  const [statsTotal, setStatsTotal] = useState(0);
  const [selectedSalonCategories, setSelectedSalonCategories] = useState<SalonCategoryKey[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [stackByProspect, setStackByProspect] = useState<Record<string, SalonBusinessStack>>({});
  const pageSize = 100;

  // Fresh Slate (in CreatorIntelligenceNav) broadcasts this event after wiping
  // the store. Re-fetch so the table, metric cards, and matching/shown counts
  // reflect the now-empty store instead of stale in-memory rows.
  useEffect(() => {
    function onRefresh() {
      setExpandedId(null);
      setOffset(0);
      setRefreshNonce((n) => n + 1);
    }
    window.addEventListener("salon-prospects:refresh", onRefresh);
    return () => window.removeEventListener("salon-prospects:refresh", onRefresh);
  }, []);

  useEffect(() => {
    fetch("/api/admin/studios/prospects/list?vertical=salon&limit=500", { cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json()) as ProspectListResponse;
        if (data.ok) {
          setStatsProspects(data.prospects ?? []);
          setStatsTotal(data.total ?? data.prospects?.length ?? 0);
        }
      })
      .catch(() => {
        setStatsProspects([]);
        setStatsTotal(0);
      });
  }, [refreshNonce]);

  useEffect(() => {
    fetch("/api/admin/intelligence/salon/business-stack?limit=500", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok: boolean; stacks?: SalonBusinessStack[] }) => {
        if (!d.ok || !d.stacks) return;
        const map: Record<string, SalonBusinessStack> = {};
        for (const s of d.stacks) {
          if (s.prospectId) map[s.prospectId] = s;
        }
        setStackByProspect(map);
      })
      .catch(() => setStackByProspect({}));
  }, [refreshNonce]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("vertical", "salon");
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));
    if (fValidation !== "all") params.set("validationStatus", fValidation);
    if (fEducationType !== "all") params.set("educationType", fEducationType);
    if (fAudienceType !== "all") params.set("audienceType", fAudienceType);
    if (fHashtag !== "all") params.set("sourceHashtag", fHashtag);
    if (fPlatform !== "all") params.set("platform", fPlatform);
    if (fMinConf > 0) params.set("minConfidence", String(fMinConf));
    if (fBusinessCategory !== "all") params.set("businessCategory", fBusinessCategory);
    if (fPlatformSignal !== "all") params.set("platformSignal", fPlatformSignal);
    if (fOfferFitTag !== "all") params.set("offerFitTag", fOfferFitTag);
    if (fBookingProvider !== "all") params.set("bookingProvider", fBookingProvider);
    if (fBookingSource !== "all") params.set("bookingProviderSource", fBookingSource);
    if (fImportCandidate) params.set("importCandidate", "true");
    if (fConfidenceBucket !== "all") params.set("confidenceBucket", fConfidenceBucket);

    setLoading(true);
    setFetchError(null);
    fetch(`/api/admin/studios/prospects/list?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json() as ProspectListResponse | { ok: false; error: string; detail?: string };
        if (data.ok) {
          setProspects((data as ProspectListResponse).prospects);
          setTotalCount((data as ProspectListResponse).total);
          setBackendWarnings((data as ProspectListResponse).warnings ?? []);
        } else {
          const err = data as { ok: false; error: string; detail?: string };
          setFetchError(`${err.error}${err.detail ? ` — ${err.detail}` : ""}`);
          console.error("[prospects/page] list error:", err);
        }
      })
      .catch((e) => setFetchError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [offset, fValidation, fEducationType, fAudienceType, fHashtag, fPlatform, fMinConf, fBusinessCategory, fPlatformSignal, fOfferFitTag, fBookingProvider, fBookingSource, fImportCandidate, fConfidenceBucket, refreshNonce]);

  useEffect(() => {
    setOffset(0);
  }, [fValidation, fEducationType, fAudienceType, fHashtag, fPlatform, fMinConf, fBusinessCategory, fPlatformSignal, fOfferFitTag, fBookingProvider, fBookingSource, fImportCandidate, fConfidenceBucket]);

  // Derive filter options
  const hashtags  = useMemo(() => Array.from(new Set(prospects.map((p) => p.sourceHashtag).filter(Boolean) as string[])).sort(), [prospects]);
  const platforms = useMemo(() => Array.from(new Set(prospects.map((p) => p.bestMatch?.platform).filter(Boolean) as string[])).sort(), [prospects]);
  const platformSignals = useMemo(() => Array.from(new Set(prospects.flatMap((p) => p.platformSignals ?? []))).sort(), [prospects]);
  const offerFitTags = useMemo(() => Array.from(new Set(prospects.flatMap((p) => p.offerFitTags ?? []))).sort(), [prospects]);

  const salonCategoryCounts = useMemo(() => {
    const counts = Object.fromEntries(SALON_CATEGORIES.map((c) => [c.key, 0])) as Record<SalonCategoryKey, number>;
    for (const prospect of prospects) {
      for (const cat of SALON_CATEGORIES) {
        if (prospectMatchesSalonCategory(prospect, cat.key)) counts[cat.key]++;
      }
    }
    return counts;
  }, [prospects]);

  const visible = useMemo(() => {
    let rows = prospects.filter((p) => {
      if (
        selectedSalonCategories.length > 0 &&
        !selectedSalonCategories.some((key) => prospectMatchesSalonCategory(p, key))
      ) {
        return false;
      }

      return true;
    });

    rows.sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      switch (sortKey) {
        case "name":             av = a.identity.name;              bv = b.identity.name; break;
        case "handle":           av = a.identity.handle;            bv = b.identity.handle; break;
        case "educationType":    av = a.educationType ?? "";        bv = b.educationType ?? ""; break;
        case "businessCategory": av = a.businessCategory ?? "";     bv = b.businessCategory ?? ""; break;
        case "location":         av = a.identity.locationGuess ?? ""; bv = b.identity.locationGuess ?? ""; break;
        case "platform":         av = a.bestMatch?.platform ?? "";  bv = b.bestMatch?.platform ?? ""; break;
        case "confidence":       av = a.confidence.overall;         bv = b.confidence.overall; break;
        case "validationStatus":          av = a.validationStatus ?? "new";          bv = b.validationStatus ?? "new"; break;
        case "createdAt":                 av = a.createdAt;                           bv = b.createdAt; break;
        case "businessSubcategory":       av = a.businessSubcategory ?? "";           bv = b.businessSubcategory ?? ""; break;
        case "bookingProvider":           av = a.bookingProvider ?? "";               bv = b.bookingProvider ?? ""; break;
        case "bestUrl":                   av = a.bestMatch?.url ?? "";                bv = b.bestMatch?.url ?? ""; break;
      }
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [prospects, selectedSalonCategories, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "confidence" ? "desc" : "asc"); }
  }
  function si(key: SortKey) {
    if (sortKey !== key) return <span style={{ color: "#d6d3d1" }}> ↕</span>;
    return <span style={{ color: "#9d174d" }}>{sortDir === "asc" ? " ↑" : " ↓"}</span>;
  }

  function clearFilters() {
    setFValidation("all"); setFEducationType("all"); setFAudienceType("all");
    setFHashtag("all"); setFPlatform("all"); setFMinConf(0);
    setFBusinessCategory("all"); setFPlatformSignal("all"); setFOfferFitTag("all");
    setFBookingProvider("all"); setFBookingSource("all"); setFImportCandidate(false); setFConfidenceBucket("all");
  }
  function clearWorkflowSelection() {
    setSelectedSalonCategories([]);
  }
  function toggleValue<T extends string>(value: T, values: T[], setter: (next: T[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }
  function toggleSalonCategory(key: SalonCategoryKey) {
    toggleValue(key, selectedSalonCategories, setSelectedSalonCategories);
  }
  const salonCategorySummary = useMemo(() => {
    if (selectedSalonCategories.length === 0) return "All categories";
    return selectedSalonCategories
      .map((key) => SALON_CATEGORIES.find((c) => c.key === key)?.label ?? key)
      .join(", ");
  }, [selectedSalonCategories]);
  const hasFilters =
    fValidation !== "all" || fEducationType !== "all" || fAudienceType !== "all" || fHashtag !== "all" ||
    fPlatform !== "all" || fMinConf > 0 || fBusinessCategory !== "all" ||
    fPlatformSignal !== "all" || fOfferFitTag !== "all" || fBookingProvider !== "all" ||
    fBookingSource !== "all" || fImportCandidate || fConfidenceBucket !== "all";
  const hasWorkflowSelection = selectedSalonCategories.length > 0;

  const operatorMetrics = useMemo(() => {
    const pool = statsProspects.length > 0 ? statsProspects : prospects;
    const total = statsTotal || totalCount;
    return {
      total,
      relationshipOperators: pool.filter((p) => (p.relationshipOpportunityType ?? "low_fit_unknown") !== "low_fit_unknown").length,
      importCandidates: pool.filter((p) => isSalonImportCandidate(p)).length,
      campaignReady: pool.filter((p) => (p.overallOpportunityScore ?? 0) >= 60 && p.validationStatus !== "archive").length,
      needsReview: pool.filter((p) => (p.validationStatus ?? "new") === "needs_review").length,
      enriched: pool.filter((p) => bookingProviderForDisplay(p).bookingProvider).length,
    };
  }, [statsProspects, statsTotal, totalCount, prospects]);

  const thS: React.CSSProperties = {
    textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700,
    color: "#78716c", letterSpacing: "0.07em", borderBottom: "1px solid #e7e5e4",
    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", background: "#f9f9f8",
  };
  const tdS: React.CSSProperties = {
    padding: "8px 10px", fontSize: 12, color: "#57534e",
    borderBottom: "1px solid #f5f5f4", verticalAlign: "middle",
  };
  const selS: React.CSSProperties = {
    fontSize: 11, padding: "4px 7px", border: "1px solid #e7e5e4",
    borderRadius: 6, color: "#57534e", background: "#fff",
  };

  const total = totalCount;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px 40px" }}>
      <CreatorIntelligenceNav current="prospects" />

      <IntelligenceFeatureHeader
        title="Prospects"
        description="Salon operator screen — filter, review, and act on harvested creators."
        config={salonConfig}
        showContext={true}
      />

      <ProviderDiscoveryBackfillButton limit={250} />
      <PublicPresenceBackfillButton />

      <SalonOperatorSummary
        compact
        pipeline={[
          { label: "Source", value: operatorMetrics.total },
          { label: "Qualified", value: operatorMetrics.relationshipOperators },
          { label: "Campaign", value: operatorMetrics.campaignReady },
        ]}
        pills={[
          { label: "Prospects", value: operatorMetrics.total, color: "#1c1917" },
          { label: "Relationship Operators", value: operatorMetrics.relationshipOperators, color: "#0369a1" },
          { label: "Import Candidates", value: operatorMetrics.importCandidates, color: "#15803d" },
          { label: "Campaign Ready", value: operatorMetrics.campaignReady, color: "#9d174d" },
          { label: "Needs Review", value: operatorMetrics.needsReview, color: "#b45309" },
        ]}
      />

      <div style={{ marginBottom: 10, background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "10px 12px" }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 6 }}>
            SALON CATEGORY
          </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SALON_CATEGORIES.map((cat) => {
                const selected = selectedSalonCategories.includes(cat.key);
                const count = salonCategoryCounts[cat.key] ?? 0;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => toggleSalonCategory(cat.key)}
                    style={{
                      border: selected ? "1px solid #9d174d" : "1px solid #e7e5e4",
                      background: selected ? "#fdf2f8" : "#fff",
                      color: selected ? "#9d174d" : "#57534e",
                      borderRadius: 999,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {cat.label} <span style={{ color: selected ? "#be185d" : "#a8a29e" }}>{count}</span>
                  </button>
                );
              })}
            </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select value={fBookingProvider} onChange={(e) => setFBookingProvider(e.target.value)} style={selS}>
            {BOOKING_PROVIDER_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select value={fBookingSource} onChange={(e) => setFBookingSource(e.target.value)} style={selS}>
            <option value="all">All sources</option>
            <option value="direct_url">Direct</option>
            <option value="link_in_bio">Link-in-Bio</option>
            <option value="handle_derived">Handle Match</option>
            <option value="display_name_derived">Display Match</option>
          </select>
          <select value={fConfidenceBucket} onChange={(e) => setFConfidenceBucket(e.target.value)} style={selS}>
            <option value="all">Any provider conf.</option>
            <option value="high">High (≥75)</option>
            <option value="medium">Medium (50–74)</option>
            <option value="low">Low (&lt;50)</option>
          </select>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#57534e" }}>
            <input
              type="checkbox"
              checked={fImportCandidate}
              onChange={(e) => setFImportCandidate(e.target.checked)}
            />
            Import candidate
          </label>
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            style={{ ...selS, cursor: "pointer", fontWeight: 700 }}
          >
            {advancedOpen ? "Fewer filters" : "More filters"}
          </button>
          {(hasFilters || hasWorkflowSelection) && (
            <button
              type="button"
              onClick={() => { clearFilters(); clearWorkflowSelection(); }}
              style={{ fontSize: 11, color: "#9d174d", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
            >
              Clear all
            </button>
          )}
        </div>

        {advancedOpen && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            <select value={fValidation} onChange={(e) => setFValidation(e.target.value as ValidationStatus | "all")} style={selS}>
              <option value="all">All validation</option>
              {(Object.keys(VALIDATION_STATUS_LABELS) as ValidationStatus[]).map((s) => (
                <option key={s} value={s}>{VALIDATION_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select value={fHashtag} onChange={(e) => setFHashtag(e.target.value)} style={selS}>
              <option value="all">All hashtags</option>
              {hashtags.map((h) => <option key={h} value={h}>#{h}</option>)}
            </select>
            <select value={fPlatform} onChange={(e) => setFPlatform(e.target.value)} style={selS}>
              <option value="all">All platforms</option>
              {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={fMinConf} onChange={(e) => setFMinConf(Number(e.target.value))} style={selS}>
              <option value={0}>Any confidence</option>
              <option value={30}>≥ 30</option>
              <option value={50}>≥ 50</option>
              <option value={65}>≥ 65</option>
            </select>
          </div>
        )}

        <div style={{ marginTop: 6, fontSize: 11, color: "#a8a29e" }}>
          {visible.length} shown · {totalCount} matching
          {hasWorkflowSelection ? ` · ${salonCategorySummary}` : ""}
        </div>
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ Failed to load prospects: {fetchError}
        </div>
      )}

      {backendWarnings.length > 0 && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
          {backendWarnings.join(" · ")}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#a8a29e" }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#a8a29e", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, fontSize: 13 }}>
          {total === 0 ? "No prospects yet — run Hashtag Harvest to start building your salon pipeline." : "No prospects match the current filters."}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {([
                  ["handle",                      "@Handle"],
                  ["name",                        "Name"],
                  ["businessCategory",            "Category"],
                  ["businessSubcategory",         "Subtype"],
                  ["location",                    "Location"],
                  ["bookingProvider",             "Booking Provider"],
                  ["payment",                     "Payment"],
                  ["stack",                       "Stack"],
                  ["import",                      "Import Candidate"],
                  ["bestUrl",                     "Best URL"],
                  ["validationStatus",            "Status"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th key={label} style={thS} onClick={() => toggleSort(key)}>
                    {label}{si(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const isExpanded = expandedId === p.prospectId;
                const bookingDisplay = bookingProviderForDisplay(p);
                return (
                  <Fragment key={p.prospectId}>
                    <tr key={p.prospectId}
                      onClick={() => setExpandedId(isExpanded ? null : p.prospectId)}
                      style={{ cursor: "pointer", background: isExpanded ? "#fdf2f8" : "transparent" }}>
                      <td style={{ ...tdS, fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1c1917" }}>
                        <a href={`https://instagram.com/${p.identity.handle}`} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} style={{ color: "#1c1917", textDecoration: "none" }}>
                          @{p.identity.handle}
                        </a>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDrawerProspectId(p.prospectId); }}
                          style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#9d174d", background: "none", border: "none", cursor: "pointer" }}
                        >
                          View
                        </button>
                      </td>
                      <td style={tdS}>{p.identity.name !== p.identity.handle ? p.identity.name : <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={tdS}>
                        {salonCategoryLabel(p) ? (
                          <span style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d", borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>
                            {salonCategoryLabel(p)}
                          </span>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={tdS}>{p.businessSubcategory ? friendlySubtypeLabel(p.businessSubcategory) : <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={tdS}>{p.identity.locationGuess ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={{ ...tdS, maxWidth: 220 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                          <BookingProviderPill
                            provider={bookingDisplay.bookingProvider}
                            label={
                              bookingDisplay.bookingProviderLabel ??
                              (bookingDisplay.bookingProvider
                                ? getBookingProviderLabel(bookingDisplay.bookingProvider as "unknown")
                                : undefined)
                            }
                            bookingUrl={bookingDisplay.bookingUrl ?? p.bestMatch?.url}
                            showImportChip={
                              isSalonImportCandidate(p) &&
                              Boolean(bookingDisplay.bookingProvider)
                            }
                          />
                          <BookingProviderSourceChip prospect={p} />
                        </div>
                      </td>
                      <td style={tdS}>
                        <StackPaymentChip stack={stackByProspect[p.prospectId]} />
                      </td>
                      <td style={tdS}>
                        <BusinessStackChips stack={stackByProspect[p.prospectId]} compact />
                      </td>
                      <td style={tdS}>
                        <ImportCandidateChip stack={stackByProspect[p.prospectId]} />
                      </td>
                      <td style={{ ...tdS, maxWidth: 160 }}>
                        {p.bestMatch ? (
                          <a href={p.bestMatch.url} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "#0284c7", textDecoration: "none", fontSize: 11, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.bestMatch.url}
                          </a>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={tdS}>
                        <ValidationBadge vs={p.validationStatus} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${p.prospectId}-detail`}>
                        <td colSpan={11} style={{ padding: 0 }}>
                          <ProspectDetail prospect={p} onSaved={(updated) => setProspects((prev) => prev.map((x) => x.prospectId === updated.prospectId ? updated : x))} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalCount > pageSize && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setOffset((n) => Math.max(0, n - pageSize))}
            disabled={offset === 0}
            style={{ ...selS, cursor: offset === 0 ? "not-allowed" : "pointer", opacity: offset === 0 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ fontSize: 11, color: "#78716c" }}>
            {offset + 1}-{Math.min(offset + pageSize, totalCount)} of {totalCount}
          </span>
          <button
            onClick={() => setOffset((n) => n + pageSize)}
            disabled={offset + pageSize >= totalCount}
            style={{ ...selS, cursor: offset + pageSize >= totalCount ? "not-allowed" : "pointer", opacity: offset + pageSize >= totalCount ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}

      <SalonProspectDrawer
        prospectId={drawerProspectId}
        open={Boolean(drawerProspectId)}
        onClose={() => setDrawerProspectId(null)}
      />

    </div>
  );
}
