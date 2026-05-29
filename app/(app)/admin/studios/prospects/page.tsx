"use client";
// app/(app)/admin/studios/prospects/page.tsx
// Discovered Entities Under Review — education-first prospect repository.
// Admin-only. NOT member-facing.

import { Fragment, useState, useEffect, useMemo } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import type { ProspectRecord, ProspectStatus, ProspectListResponse } from "@/lib/studios/prospects/types";
import { PROSPECT_STATUS_LABELS, PROSPECT_STATUS_COLORS } from "@/lib/studios/prospects/types";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_LABELS, BUSINESS_SUBCATEGORIES, RELATIONSHIP_OPPORTUNITY_LABELS, RELATIONSHIP_OPPORTUNITY_TYPES } from "@/lib/studios/prospects/opportunity-taxonomy";
import type { BusinessCategory, RelationshipOpportunityType } from "@/lib/studios/prospects/opportunity-taxonomy";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_COLORS,
  EDUCATION_TYPE_LABELS,
  AUDIENCE_TYPE_LABELS,
  ARCHIVE_REASONS,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { ValidationStatus, EducationType, AudienceType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";

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

type MarketKey =
  | "personal_care"
  | "fitness_wellness"
  | "education"
  | "artists_creators"
  | "misc";

const MARKET_DEFINITIONS: Array<{ key: MarketKey; label: string; categories: BusinessCategory[] }> = [
  { key: "personal_care", label: "Personal Care", categories: ["beauty_personal_care", "medical_aesthetic"] },
  { key: "fitness_wellness", label: "Fitness / Wellness", categories: ["fitness_wellness"] },
  { key: "education", label: "Education", categories: ["education_tutor", "homeschool_microschool"] },
  { key: "artists_creators", label: "Artists / Creators", categories: ["artist_creator", "photographer_videographer", "music_performing_arts", "retail_maker"] },
  { key: "misc", label: "Misc", categories: ["pet_services", "wedding_events", "coach_consultant", "home_services", "food_hospitality", "unknown"] },
];

const RELATIONSHIP_FILTERS: Array<{ value: RelationshipOpportunityType; label: string }> = [
  { value: "appointment_operator", label: "Appointment Operators" },
  { value: "class_workshop_operator", label: "Class / Workshop Operators" },
  { value: "audience_operator", label: "Audience Operators" },
  { value: "community_operator", label: "Community Operators" },
  { value: "commerce_operator", label: "Commerce Operators" },
  { value: "content_operator", label: "Content Operators" },
  { value: "relationship_operator", label: "Relationship Operators" },
  { value: "low_fit_unknown", label: "Unknown / Low Fit" },
];

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

const MARKET_SUBTYPE_HINTS: Partial<Record<MarketKey, string[]>> = {
  personal_care: ["nails", "hair", "barber", "esthetics", "lashes", "makeup", "braids", "extensions", "medical_aesthetics"],
  fitness_wellness: ["personal_trainer", "yoga", "pilates", "nutrition", "sports_coach", "wellness_coach"],
  education: ["tutor", "math_tutor", "science_tutor", "reading_tutor", "test_prep", "homeschool", "microschool", "music_teacher", "coding_teacher"],
  artists_creators: ["artist", "painter", "watercolor_artist", "illustrator", "digital_artist", "photographer", "videographer", "maker", "craft_artist", "musician"],
  misc: ["pet_services", "dog_trainer", "groomer", "wedding_planner", "event_vendor", "home_services", "coach_consultant", "retail_maker", "other_unknown"],
};

function marketForCategory(category?: string | null): typeof MARKET_DEFINITIONS[number] {
  return MARKET_DEFINITIONS.find((market) => market.categories.includes(category as BusinessCategory)) ?? MARKET_DEFINITIONS[MARKET_DEFINITIONS.length - 1];
}

function friendlyMarketLabel(category?: string | null): string {
  return marketForCategory(category).label;
}

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

type SortKey = "name" | "handle" | "educationType" | "businessCategory" | "opportunityScore" | "location" | "platform" | "confidence" | "validationStatus" | "createdAt";

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
  const [fOpportunityType, setFOpportunityType] = useState("all");
  const [fMinOpp, setFMinOpp] = useState(0);
  const [fPlatformSignal, setFPlatformSignal] = useState("all");
  const [fOfferFitTag, setFOfferFitTag] = useState("all");
  const [selectedMarkets, setSelectedMarkets] = useState<MarketKey[]>([]);
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);
  const [selectedSubtypeAllMarkets, setSelectedSubtypeAllMarkets] = useState<MarketKey[]>([]);
  const [relationshipAllSelected, setRelationshipAllSelected] = useState(true);
  const [selectedRelationshipTypes, setSelectedRelationshipTypes] = useState<RelationshipOpportunityType[]>([]);
  const [openMarketDropdown, setOpenMarketDropdown] = useState<MarketKey | null>(null);
  const [relationshipDropdownOpen, setRelationshipDropdownOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const pageSize = 100;

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));
    if (fValidation !== "all") params.set("validationStatus", fValidation);
    if (fEducationType !== "all") params.set("educationType", fEducationType);
    if (fAudienceType !== "all") params.set("audienceType", fAudienceType);
    if (fHashtag !== "all") params.set("sourceHashtag", fHashtag);
    if (fPlatform !== "all") params.set("platform", fPlatform);
    if (fMinConf > 0) params.set("minConfidence", String(fMinConf));
    if (fBusinessCategory !== "all") params.set("businessCategory", fBusinessCategory);
    if (fOpportunityType !== "all") params.set("relationshipOpportunityType", fOpportunityType);
    if (fMinOpp > 0) params.set("minOpportunityScore", String(fMinOpp));
    if (fPlatformSignal !== "all") params.set("platformSignal", fPlatformSignal);
    if (fOfferFitTag !== "all") params.set("offerFitTag", fOfferFitTag);

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
  }, [offset, fValidation, fEducationType, fAudienceType, fHashtag, fPlatform, fMinConf, fBusinessCategory, fOpportunityType, fMinOpp, fPlatformSignal, fOfferFitTag]);

  useEffect(() => {
    setOffset(0);
  }, [fValidation, fEducationType, fAudienceType, fHashtag, fPlatform, fMinConf, fBusinessCategory, fOpportunityType, fMinOpp, fPlatformSignal, fOfferFitTag]);

  // Derive filter options
  const hashtags  = useMemo(() => Array.from(new Set(prospects.map((p) => p.sourceHashtag).filter(Boolean) as string[])).sort(), [prospects]);
  const platforms = useMemo(() => Array.from(new Set(prospects.map((p) => p.bestMatch?.platform).filter(Boolean) as string[])).sort(), [prospects]);
  const platformSignals = useMemo(() => Array.from(new Set(prospects.flatMap((p) => p.platformSignals ?? []))).sort(), [prospects]);
  const offerFitTags = useMemo(() => Array.from(new Set(prospects.flatMap((p) => p.offerFitTags ?? []))).sort(), [prospects]);

  const selectedMarketCategories = useMemo(() => {
    if (selectedMarkets.length === 0) return [];
    return MARKET_DEFINITIONS
      .filter((market) => selectedMarkets.includes(market.key))
      .flatMap((market) => market.categories);
  }, [selectedMarkets]);

  const selectedMarketLabels = useMemo(
    () => MARKET_DEFINITIONS.filter((market) => selectedMarkets.includes(market.key)).map((market) => market.label),
    [selectedMarkets]
  );

  const marketCounts = useMemo(() => {
    const counts: Record<MarketKey, number> = Object.fromEntries(MARKET_DEFINITIONS.map((market) => [market.key, 0])) as Record<MarketKey, number>;
    for (const prospect of prospects) counts[marketForCategory(prospect.businessCategory).key]++;
    return counts;
  }, [prospects]);

  const subtypesByMarket = useMemo(() => {
    const entries: Record<MarketKey, { market: typeof MARKET_DEFINITIONS[number]; subtypes: string[] }> = {} as Record<MarketKey, { market: typeof MARKET_DEFINITIONS[number]; subtypes: string[] }>;

    for (const market of MARKET_DEFINITIONS) {
      const taxonomySubtypes = market.categories.flatMap((category) => BUSINESS_SUBCATEGORIES[category] ?? []);
      const prospectSubtypes = prospects
        .filter((p) => market.categories.includes(p.businessCategory as BusinessCategory))
        .map((p) => p.businessSubcategory)
        .filter(Boolean) as string[];
      const subtypes = unique([...(MARKET_SUBTYPE_HINTS[market.key] ?? []), ...taxonomySubtypes, ...prospectSubtypes])
        .sort((a, b) => friendlySubtypeLabel(a).localeCompare(friendlySubtypeLabel(b)));
      entries[market.key] = { market, subtypes };
    }

    return entries;
  }, [prospects]);

  const subtypeCountsByMarket = useMemo(() => {
    const counts = Object.fromEntries(MARKET_DEFINITIONS.map((market) => [market.key, {}])) as Record<MarketKey, Record<string, number>>;
    for (const prospect of prospects) {
      const subtype = prospect.businessSubcategory;
      if (!subtype) continue;
      const marketKey = marketForCategory(prospect.businessCategory).key;
      counts[marketKey][subtype] = (counts[marketKey][subtype] ?? 0) + 1;
    }
    return counts;
  }, [prospects]);

  const selectedSubtypesByMarket = useMemo(() => {
    const grouped = MARKET_DEFINITIONS.reduce((acc, market) => {
      acc[market.key] = [];
      return acc;
    }, {} as Record<MarketKey, string[]>);
    for (const subtype of selectedSubtypes) {
      const owningMarket = MARKET_DEFINITIONS.find((market) => subtypesByMarket[market.key]?.subtypes.includes(subtype))?.key;
      if (owningMarket) grouped[owningMarket].push(subtype);
    }
    return grouped;
  }, [selectedSubtypes, subtypesByMarket]);

  const relationshipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const prospect of prospects) {
      const type = prospect.relationshipOpportunityType ?? "low_fit_unknown";
      counts[type] = (counts[type] ?? 0) + 1;
    }
    return counts;
  }, [prospects]);

  const visible = useMemo(() => {
    let rows = prospects.filter((p) => {
      if (selectedMarketCategories.length > 0 && !selectedMarketCategories.includes(p.businessCategory as BusinessCategory)) return false;
      const marketKey = marketForCategory(p.businessCategory).key;
      const marketSpecificSubtypes = selectedSubtypesByMarket[marketKey] ?? [];
      const marketAllSelected = selectedSubtypeAllMarkets.includes(marketKey);
      const hasAnySubtypeSelection = selectedSubtypes.length > 0 || selectedSubtypeAllMarkets.length > 0;
      if (hasAnySubtypeSelection) {
        if (selectedMarkets.length > 0) {
          if (!marketAllSelected && !marketSpecificSubtypes.includes(p.businessSubcategory ?? "")) return false;
        } else if (!marketAllSelected && !selectedSubtypes.includes(p.businessSubcategory ?? "")) {
          return false;
        }
      }
      if (!relationshipAllSelected && selectedRelationshipTypes.length === 0) return false;
      if (!relationshipAllSelected && selectedRelationshipTypes.length > 0 && !selectedRelationshipTypes.includes((p.relationshipOpportunityType ?? "low_fit_unknown") as RelationshipOpportunityType)) return false;
      return true;
    });

    rows.sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      switch (sortKey) {
        case "name":             av = a.identity.name;              bv = b.identity.name; break;
        case "handle":           av = a.identity.handle;            bv = b.identity.handle; break;
        case "educationType":    av = a.educationType ?? "";        bv = b.educationType ?? ""; break;
        case "businessCategory": av = a.businessCategory ?? "";     bv = b.businessCategory ?? ""; break;
        case "opportunityScore": av = a.overallOpportunityScore ?? 0; bv = b.overallOpportunityScore ?? 0; break;
        case "location":         av = a.identity.locationGuess ?? ""; bv = b.identity.locationGuess ?? ""; break;
        case "platform":         av = a.bestMatch?.platform ?? "";  bv = b.bestMatch?.platform ?? ""; break;
        case "confidence":       av = a.confidence.overall;         bv = b.confidence.overall; break;
        case "validationStatus": av = a.validationStatus ?? "new";  bv = b.validationStatus ?? "new"; break;
        case "createdAt":        av = a.createdAt;                  bv = b.createdAt; break;
      }
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [prospects, selectedMarketCategories, selectedMarkets, selectedSubtypes, selectedSubtypeAllMarkets, selectedSubtypesByMarket, relationshipAllSelected, selectedRelationshipTypes, sortKey, sortDir]);

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
    setFBusinessCategory("all"); setFOpportunityType("all"); setFMinOpp(0); setFPlatformSignal("all"); setFOfferFitTag("all");
  }
  function clearWorkflowSelection() {
    setSelectedMarkets([]);
    setSelectedSubtypes([]);
    setSelectedSubtypeAllMarkets([]);
    setRelationshipAllSelected(true);
    setSelectedRelationshipTypes([]);
    setOpenMarketDropdown(null);
    setRelationshipDropdownOpen(false);
  }
  function toggleValue<T extends string>(value: T, values: T[], setter: (next: T[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }
  function marketSubtypeBelongsTo(market: typeof MARKET_DEFINITIONS[number], subtype: string) {
    return market.categories.some((category) => (BUSINESS_SUBCATEGORIES[category] ?? []).includes(subtype))
      || (MARKET_SUBTYPE_HINTS[market.key] ?? []).includes(subtype);
  }
  function clearMarketSelection(market: typeof MARKET_DEFINITIONS[number]) {
    setSelectedMarkets(selectedMarkets.filter((item) => item !== market.key));
    setSelectedSubtypes(selectedSubtypes.filter((subtype) => !marketSubtypeBelongsTo(market, subtype)));
    setSelectedSubtypeAllMarkets(selectedSubtypeAllMarkets.filter((item) => item !== market.key));
    if (openMarketDropdown === market.key) setOpenMarketDropdown(null);
  }
  function handleMarketButtonClick(market: typeof MARKET_DEFINITIONS[number]) {
    const selected = selectedMarkets.includes(market.key);
    if (selected && openMarketDropdown === market.key) {
      clearMarketSelection(market);
      return;
    }
    if (!selected) {
      setSelectedMarkets([...selectedMarkets, market.key]);
      setSelectedSubtypeAllMarkets(unique([...selectedSubtypeAllMarkets, market.key]));
    }
    setOpenMarketDropdown(market.key);
    setRelationshipDropdownOpen(false);
  }
  function toggleMarketSubtypeAll(marketKey: MarketKey, subtypes: string[]) {
    if (selectedSubtypeAllMarkets.includes(marketKey)) {
      setSelectedSubtypeAllMarkets(selectedSubtypeAllMarkets.filter((item) => item !== marketKey));
      setSelectedSubtypes(selectedSubtypes.filter((subtype) => !subtypes.includes(subtype)));
      return;
    }
    setSelectedSubtypeAllMarkets(unique([...selectedSubtypeAllMarkets, marketKey]));
    setSelectedSubtypes(selectedSubtypes.filter((subtype) => !subtypes.includes(subtype)));
  }
  function toggleMarketSubtype(marketKey: MarketKey, subtype: string) {
    const marketSubtypes = subtypesByMarket[marketKey]?.subtypes ?? [];
    const currentMarketSubtypes = selectedSubtypes.filter((item) => marketSubtypes.includes(item));
    const selected = currentMarketSubtypes.includes(subtype);
    const withoutSubtype = selectedSubtypes.filter((item) => item !== subtype);
    setSelectedSubtypeAllMarkets(selectedSubtypeAllMarkets.filter((item) => item !== marketKey));
    if (selected) {
      setSelectedSubtypes(withoutSubtype);
    } else {
      setSelectedSubtypes([...withoutSubtype, subtype]);
    }
  }
  function toggleRelationshipAll() {
    if (relationshipAllSelected) {
      setRelationshipAllSelected(false);
      setSelectedRelationshipTypes([]);
      return;
    }
    setRelationshipAllSelected(true);
    setSelectedRelationshipTypes([]);
  }
  function toggleRelationshipType(type: RelationshipOpportunityType) {
    setRelationshipAllSelected(false);
    toggleValue(type, selectedRelationshipTypes, setSelectedRelationshipTypes);
  }
  const relationshipSummary = relationshipAllSelected
    ? "All"
    : selectedRelationshipTypes.length
    ? selectedRelationshipTypes.map((t) => RELATIONSHIP_OPPORTUNITY_LABELS[t]).join(", ")
    : "None";
  const subtypeSummary = useMemo(() => {
    if (selectedMarkets.length === 0 && selectedSubtypes.length === 0 && selectedSubtypeAllMarkets.length === 0) return "All";
    if (selectedMarkets.length > 0 && selectedSubtypes.length === 0 && selectedSubtypeAllMarkets.length === 0) return "None";
    if (selectedMarkets.length > 0 && selectedSubtypes.length === 0 && selectedMarkets.every((market) => selectedSubtypeAllMarkets.includes(market))) return "All";
    const allLabels = MARKET_DEFINITIONS
      .filter((market) => selectedSubtypeAllMarkets.includes(market.key))
      .map((market) => `${market.label}: All`);
    const subtypeLabels = selectedSubtypes.map(friendlySubtypeLabel);
    const noneLabels = MARKET_DEFINITIONS
      .filter((market) => selectedMarkets.includes(market.key) && !selectedSubtypeAllMarkets.includes(market.key) && (selectedSubtypesByMarket[market.key] ?? []).length === 0)
      .map((market) => `${market.label}: None`);
    return [...allLabels, ...subtypeLabels, ...noneLabels].join(", ");
  }, [selectedMarkets, selectedSubtypes, selectedSubtypeAllMarkets, selectedSubtypesByMarket]);
  const hasFilters = fValidation !== "all" || fEducationType !== "all" || fAudienceType !== "all" || fHashtag !== "all" || fPlatform !== "all" || fMinConf > 0 || fBusinessCategory !== "all" || fOpportunityType !== "all" || fMinOpp > 0 || fPlatformSignal !== "all" || fOfferFitTag !== "all";
  const hasWorkflowSelection = selectedMarkets.length > 0 || selectedSubtypes.length > 0 || selectedSubtypeAllMarkets.length > 0 || !relationshipAllSelected || selectedRelationshipTypes.length > 0;
  const canCreateCampaign = visible.length > 0 && (hasWorkflowSelection || hasFilters);

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

  // Stats
  const total       = totalCount;
  const needsReview = prospects.filter((p) => (p.validationStatus ?? "new") === "needs_review").length;
  const distinctMarkets = unique(prospects.map((p) => marketForCategory(p.businessCategory).key)).length;
  const distinctSubtypes = unique(prospects.map((p) => p.businessSubcategory).filter(Boolean) as string[]).length;
  const relationshipOperators = prospects.filter((p) => (p.relationshipOpportunityType ?? "low_fit_unknown") !== "low_fit_unknown").length;
  const campaignReady = visible.filter((p) => (p.overallOpportunityScore ?? 0) >= 60 && p.validationStatus !== "archive").length;
  const highOpportunity = visible.filter((p) => (p.overallOpportunityScore ?? 0) >= 75).length;
  const avgOpportunity = visible.length
    ? Math.round(visible.reduce((sum, p) => sum + (p.overallOpportunityScore ?? 0), 0) / visible.length)
    : 0;
  const selectedOfferFitTags = unique(visible.flatMap((p) => p.offerFitTags ?? [])).slice(0, 8);
  const suggestedCampaignName = selectedMarketLabels.length > 0
    ? `${selectedMarketLabels.join(" + ")}${selectedRelationshipTypes.length === 1 ? ` - ${RELATIONSHIP_OPPORTUNITY_LABELS[selectedRelationshipTypes[0]]}` : ""}`
    : visible.some((p) => p.businessCategory === "education_tutor" || p.businessCategory === "homeschool_microschool")
      ? "Education Tutors - Parent Network"
      : "Relationship Operator Working Set";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <CreatorIntelligenceNav current="prospects" />

      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Prospect Market Intelligence
        </h1>
        <p style={{ fontSize: 12, color: "#a8a29e", margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
          Find the market, isolate relationship operators, then build a campaign around the right offer.
        </p>
      </div>

      {/* Workflow */}
      {!loading && (
        <div style={{ margin: "16px 0", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 850, color: "#1c1917" }}>Market Intelligence</div>
              <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>
                Find the market, isolate relationship operators, then build a campaign around the right offer.
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {["Find Market", "Find Relationship Operators", "Create Campaign"].map((step, i) => (
                <div key={step} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 9px", borderRadius: 999,
                  background: i === 0 ? "#fdf2f8" : "#f5f5f4", color: i === 0 ? "#9d174d" : "#57534e",
                  fontSize: 11, fontWeight: 800,
                }}>
                  <span style={{ width: 18, height: 18, display: "grid", placeItems: "center", borderRadius: 999, background: "#fff", border: "1px solid #e7e5e4" }}>{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Markets", val: distinctMarkets, color: "#1c1917" },
              { label: "Subtypes", val: distinctSubtypes, color: "#57534e" },
              { label: "Relationship Operators", val: relationshipOperators, color: "#0369a1" },
              { label: "Campaign Ready", val: campaignReady, color: "#15803d" },
              { label: "High Opportunity", val: highOpportunity, color: "#9d174d" },
              { label: "Needs Review", val: needsReview, color: "#b45309" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: "#fafaf9", border: "1px solid #ede9e4", borderRadius: 10, padding: "9px 10px" }}>
                <div style={{ fontSize: 20, fontWeight: 850, color }}>{val}</div>
                <div style={{ fontSize: 9, color: "#a8a29e", fontWeight: 800, letterSpacing: "0.04em" }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 850, color: "#1c1917", marginBottom: 7 }}>Business Type / Market</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {MARKET_DEFINITIONS.map((market) => {
                const selected = selectedMarkets.includes(market.key);
                const count = marketCounts[market.key] ?? 0;
                const marketSubtypes = subtypesByMarket[market.key]?.subtypes ?? [];
                const marketSpecific = selectedSubtypesByMarket[market.key] ?? [];
                const allSelected = selectedSubtypeAllMarkets.includes(market.key);
                const open = openMarketDropdown === market.key;
                return (
                  <div key={market.key} style={{ position: "relative" }}>
                    <button onClick={() => handleMarketButtonClick(market)}
                      style={{
                        border: selected ? "1px solid #9d174d" : "1px solid #e7e5e4",
                        background: selected ? "#fdf2f8" : "#fff",
                        color: selected ? "#9d174d" : "#57534e",
                        borderRadius: 9, padding: "7px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer",
                      }}>
                      {market.label} <span style={{ color: selected ? "#be185d" : "#a8a29e" }}>{count}</span> <span style={{ color: "#a8a29e" }}>▼</span>
                    </button>
                    {open && (
                      <div style={{
                        position: "absolute", zIndex: 12, top: 34, left: 0, width: 250, maxHeight: 290, overflow: "auto",
                        background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, boxShadow: "0 14px 35px rgba(28,25,23,0.14)", padding: 8,
                      }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, fontSize: 11, fontWeight: 850, color: "#1c1917", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleMarketSubtypeAll(market.key, marketSubtypes)}
                          />
                          All
                        </label>
                        <div style={{ height: 1, background: "#f0ede8", margin: "4px 0" }} />
                        {marketSubtypes.map((subtype) => {
                          const subtypeSelected = marketSpecific.includes(subtype) && !allSelected;
                          return (
                            <label key={subtype} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, fontSize: 11, color: "#57534e", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={subtypeSelected}
                                onChange={() => toggleMarketSubtype(market.key, subtype)}
                              />
                              <span style={{ flex: 1 }}>{friendlySubtypeLabel(subtype)}</span>
                              <span style={{ color: "#a8a29e", fontWeight: 800 }}>{subtypeCountsByMarket[market.key]?.[subtype] ?? 0}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setRelationshipDropdownOpen((v) => !v); setOpenMarketDropdown(null); }}
                  style={{
                    border: selectedRelationshipTypes.length ? "1px solid #15803d" : "1px solid #e7e5e4",
                    background: selectedRelationshipTypes.length ? "#f0fdf4" : "#fff",
                    color: selectedRelationshipTypes.length ? "#15803d" : "#57534e",
                    borderRadius: 9, padding: "7px 9px", fontSize: 11, fontWeight: 850, cursor: "pointer",
                  }}>
                  Relationship Type <span style={{ color: "#a8a29e" }}>▼</span>
                </button>
                {relationshipDropdownOpen && (
                  <div style={{
                    position: "absolute", zIndex: 12, top: 34, right: 0, width: 285, maxHeight: 320, overflow: "auto",
                    background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, boxShadow: "0 14px 35px rgba(28,25,23,0.14)", padding: 8,
                  }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, fontSize: 11, fontWeight: 850, color: "#1c1917", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={relationshipAllSelected}
                        onChange={toggleRelationshipAll}
                      />
                      All
                    </label>
                    <div style={{ height: 1, background: "#f0ede8", margin: "4px 0" }} />
                    {RELATIONSHIP_FILTERS.map((entry) => (
                      <label key={entry.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, fontSize: 11, color: "#57534e", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedRelationshipTypes.includes(entry.value)}
                          onChange={() => toggleRelationshipType(entry.value)}
                        />
                        <span style={{ flex: 1 }}>{entry.label}</span>
                        <span style={{ color: "#a8a29e", fontWeight: 800 }}>{relationshipCounts[entry.value] ?? 0}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 14, padding: "10px 12px", border: "1px solid #e7e5e4", borderRadius: 10,
            background: "#1c1917", color: "#fff", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 11, color: "#d6d3d1" }}>
              <strong style={{ color: "#fff" }}>Selected</strong>
              {" "}Market: {selectedMarketLabels.length ? selectedMarketLabels.join(", ") : "All"}
              {" "}· Subtypes: {subtypeSummary}
              {" "}· Relationship: {relationshipSummary}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: "#d6d3d1" }}>
              Records: <strong style={{ color: "#fff" }}>{visible.length}</strong> · Avg Opportunity: <strong style={{ color: "#fff" }}>{avgOpportunity}</strong>
            </div>
            {hasWorkflowSelection && (
              <button onClick={clearWorkflowSelection} style={{ border: "1px solid #57534e", background: "transparent", color: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                Clear Selection
              </button>
            )}
            <button onClick={() => setCampaignOpen(true)} disabled={!canCreateCampaign}
              style={{ border: "none", background: !canCreateCampaign ? "#57534e" : "#fce7f3", color: !canCreateCampaign ? "#d6d3d1" : "#9d174d", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 850, cursor: !canCreateCampaign ? "not-allowed" : "pointer" }}>
              Create Campaign
            </button>
          </div>
        </div>
      )}

      {/* Fetch error */}
      {fetchError && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ Failed to load prospects: {fetchError}
        </div>
      )}

      {/* Advanced filters */}
      <div style={{ marginBottom: 14, background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "10px 12px" }}>
        <button onClick={() => setAdvancedOpen((v) => !v)}
          style={{ width: "100%", border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <span style={{ fontSize: 12, fontWeight: 850, color: "#1c1917" }}>Advanced Filters</span>
          <span style={{ fontSize: 11, color: "#a8a29e" }}>{advancedOpen ? "Hide" : "Show"} · {visible.length} shown · {totalCount} matching</span>
        </button>
      {advancedOpen && (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
        <select value={fValidation} onChange={(e) => setFValidation(e.target.value as ValidationStatus | "all")} style={selS}>
          <option value="all">All validation</option>
          {(Object.keys(VALIDATION_STATUS_LABELS) as ValidationStatus[]).map((s) => (
            <option key={s} value={s}>{VALIDATION_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={fEducationType} onChange={(e) => setFEducationType(e.target.value as EducationType | "all")} style={selS}>
          <option value="all">All ed. types</option>
          {(Object.keys(EDUCATION_TYPE_LABELS) as EducationType[]).map((s) => (
            <option key={s} value={s}>{EDUCATION_TYPE_LABELS[s]}</option>
          ))}
        </select>
        <select value={fAudienceType} onChange={(e) => setFAudienceType(e.target.value as AudienceType | "all")} style={selS}>
          <option value="all">All audiences</option>
          {(Object.keys(AUDIENCE_TYPE_LABELS) as AudienceType[]).map((s) => (
            <option key={s} value={s}>{AUDIENCE_TYPE_LABELS[s]}</option>
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
        <select value={fBusinessCategory} onChange={(e) => setFBusinessCategory(e.target.value)} style={selS}>
          <option value="all">All business categories</option>
          {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{BUSINESS_CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={fOpportunityType} onChange={(e) => setFOpportunityType(e.target.value)} style={selS}>
          <option value="all">All opportunity types</option>
          {RELATIONSHIP_OPPORTUNITY_TYPES.map((t) => <option key={t} value={t}>{RELATIONSHIP_OPPORTUNITY_LABELS[t]}</option>)}
        </select>
        <select value={fMinOpp} onChange={(e) => setFMinOpp(Number(e.target.value))} style={selS}>
          <option value={0}>Any opp. score</option>
          <option value={40}>≥ 40</option>
          <option value={60}>≥ 60</option>
          <option value={75}>≥ 75</option>
        </select>
        <select value={fPlatformSignal} onChange={(e) => setFPlatformSignal(e.target.value)} style={selS}>
          <option value="all">All platform signals</option>
          {platformSignals.map((p) => <option key={p} value={p}>{tagLabel(p)}</option>)}
        </select>
        <select value={fOfferFitTag} onChange={(e) => setFOfferFitTag(e.target.value)} style={selS}>
          <option value="all">All offer tags</option>
          {offerFitTags.map((p) => <option key={p} value={p}>{tagLabel(p)}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} style={{ fontSize: 11, color: "#9d174d", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Clear
          </button>
        )}
      </div>
      )}
      </div>

      {campaignOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28, 25, 23, 0.45)", zIndex: 50, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ width: "min(560px, 100%)", background: "#fff", borderRadius: 14, border: "1px solid #e7e5e4", boxShadow: "0 20px 70px rgba(0,0,0,0.25)", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: "#1c1917" }}>Create Campaign</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#78716c", lineHeight: 1.45 }}>
                  Campaign creation will use the current working set. Persistence and outreach steps come next.
                </p>
              </div>
              <button onClick={() => setCampaignOpen(false)} style={{ border: "none", background: "#f5f5f4", borderRadius: 8, padding: "6px 9px", cursor: "pointer", fontWeight: 800 }}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 12, color: "#57534e" }}>
              <div><strong style={{ color: "#1c1917" }}>Suggested name:</strong> {suggestedCampaignName}</div>
              <div><strong style={{ color: "#1c1917" }}>Records:</strong> {visible.length}</div>
              <div><strong style={{ color: "#1c1917" }}>Markets:</strong> {selectedMarketLabels.length ? selectedMarketLabels.join(", ") : "All selected records"}</div>
              <div><strong style={{ color: "#1c1917" }}>Subtypes:</strong> {subtypeSummary}</div>
              <div><strong style={{ color: "#1c1917" }}>Offer fit tags:</strong> {selectedOfferFitTags.length ? selectedOfferFitTags.map(tagLabel).join(", ") : "None detected yet"}</div>
            </div>
          </div>
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
          {total === 0 ? "No prospects yet — run Hashtag Harvest to start discovering education creators." : "No prospects match the current filters."}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {([
                  ["handle",          "@Handle"],
                  ["name",            "Name"],
                  ["businessCategory","Market"],
                  [null,              "Subtype"],
                  ["opportunityScore","Opportunity"],
                  ["location",        "Location"],
                  [null,              "Relationship"],
                  [null,              "Offer Fit Tags"],
                  [null,              "Platform Signals"],
                  [null,              "Best URL"],
                  ["validationStatus","Status"],
                ] as [SortKey | null, string][]).map(([key, label]) => (
                  <th key={label} style={thS} onClick={() => key && toggleSort(key)}>
                    {label}{key && si(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const isExpanded = expandedId === p.prospectId;
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
                      </td>
                      <td style={tdS}>{p.identity.name !== p.identity.handle ? p.identity.name : <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={tdS}>
                        {p.businessCategory ? (
                          <span style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d", borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>
                            {friendlyMarketLabel(p.businessCategory)}
                          </span>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={tdS}>{p.businessSubcategory ? friendlySubtypeLabel(p.businessSubcategory) : <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={tdS}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: confColor(p.overallOpportunityScore ?? 0) }}>
                          {p.overallOpportunityScore ?? <span style={{ color: "#d6d3d1" }}>—</span>}
                        </span>
                      </td>
                      <td style={tdS}>{p.identity.locationGuess ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={tdS}>
                        {p.relationshipOpportunityType ? (
                          <span style={{ fontSize: 10, background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>
                            {RELATIONSHIP_OPPORTUNITY_LABELS[p.relationshipOpportunityType as RelationshipOpportunityType] ?? tagLabel(String(p.relationshipOpportunityType))}
                          </span>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={{ ...tdS, maxWidth: 190 }}>
                        {(p.offerFitTags ?? []).length > 0 ? (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {(p.offerFitTags ?? []).slice(0, 3).map((tag) => (
                              <span key={tag} style={{ fontSize: 9, background: "#f0fdf4", color: "#15803d", borderRadius: 20, padding: "2px 6px", fontWeight: 700 }}>{tagLabel(tag)}</span>
                            ))}
                          </div>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={{ ...tdS, maxWidth: 170 }}>
                        {(p.platformSignals ?? []).length > 0 ? (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {(p.platformSignals ?? []).slice(0, 3).map((signal) => (
                              <span key={signal} style={{ fontSize: 9, background: "#f5f5f4", color: "#57534e", borderRadius: 20, padding: "2px 6px", fontWeight: 700 }}>{tagLabel(signal)}</span>
                            ))}
                          </div>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
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

      <div style={{ marginTop: 12, fontSize: 11, color: "#d6d3d1", textAlign: "right" }}>
        Education vertical · Admin only · Archive does not delete
      </div>
    </div>
  );
}
