/**
 * Studio Builder contracts (Agent 94).
 * DB: StudioBuilderDraft.content holds StudioDraftContentDTO JSON.
 */

// ─── Enums / unions ───────────────────────────────────────────

export const STUDIO_TEMPLATE_TYPES = [
  "private-studio-network",
  "private-client-network",
  "family-learning",
  "executive-work",
  "local-community",
  "gap-u-learning-lab",
] as const;

export type StudioTemplateType = (typeof STUDIO_TEMPLATE_TYPES)[number];

export const STUDIO_SOURCE_TYPES = [
  "instagram",
  "website",
  "booking",
  "glossgenius",
  "vagaro",
  "square",
  "youtube",
  "facebook",
  "google_business",
  "linkedin",
  "manual",
] as const;

export type StudioSourceType = (typeof STUDIO_SOURCE_TYPES)[number];

export const STUDIO_SOURCE_STATUSES = [
  "pending",
  "extracting",
  "extracted",
  "failed",
  "skipped",
] as const;

export type StudioSourceStatus = (typeof STUDIO_SOURCE_STATUSES)[number];

/** Coarse DB lifecycle (studio_builder_drafts.status). */
export const STUDIO_DRAFT_STATUSES = ["draft", "reviewed", "published"] as const;

export type StudioDraftStatus = (typeof STUDIO_DRAFT_STATUSES)[number];

/** Wizard step ids (studio_builder_drafts.builderStep). */
export const STUDIO_BUILDER_STEPS = [
  "choose_template",
  "add_sources",
  "review_draft",
  "publish",
] as const;

export type StudioBuilderStep = (typeof STUDIO_BUILDER_STEPS)[number];

// ─── Source DTOs ──────────────────────────────────────────────

export type StudioSourceExtractedData = {
  displayName?: string;
  tagline?: string;
  category?: string;
  toneHints?: string[];
  audienceHints?: string[];
  location?: {
    city?: string;
    region?: string;
    country?: string;
    formatted?: string;
    confidence?: number;
  };
  services?: Array<{ name: string; description?: string; priceHint?: string }>;
  offers?: string[];
  mediaUrls?: string[];
  socialProof?: string[];
  contactHints?: {
    email?: string;
    phone?: string;
    website?: string;
    confidence?: number;
  };
  platformMeta?: Record<string, string>;
};

export type StudioSourceInputDTO = {
  id: string;
  draftId: string;
  sourceType: StudioSourceType;
  url: string | null;
  label?: string | null;
  userNotes?: string | null;
  status: StudioSourceStatus;
  extractedAt?: string | null;
  extractionConfidence?: number | null;
  extractedData?: StudioSourceExtractedData | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStudioSourceInputDTO = {
  sourceType: StudioSourceType;
  url?: string;
  label?: string;
  userNotes?: string;
};

// ─── Draft content (JSON blob) ────────────────────────────────

export type StudioDraftConfidenceWarning = {
  field: string;
  severity: "low" | "medium" | "high";
  message: string;
  sourceIds?: string[];
};

export type StudioDraftSection = {
  title: string;
  body: string;
  bullets?: string[];
  visible: boolean;
  approved: boolean;
  lastGeneratedAt?: string;
};

export type StudioDraftContentDTO = {
  version: number;
  /** Set by AI stub generator (Agent 98). */
  generatedBy?: "ai_stub";
  generatedAt?: string;
  aiDraftLabel?: string;
  suggestedTemplateType?: StudioTemplateType;
  identity: {
    name: string;
    slugSuggestion?: string;
    category?: string;
    tone?: string;
    audience?: string;
    tagline?: string;
    fieldConfidence?: Record<string, number>;
  };
  hero: {
    eyebrow?: string;
    headline: string;
    subcopy: string[];
    triadLensId?: "studio-network" | "client-network" | "family-learning";
    introVideoScript?: string;
    introVideoSrc?: string;
    fieldConfidence?: Record<string, number>;
  };
  cards: {
    cards: Array<{
      id: string;
      title: string;
      subcopy: string[];
      benefits: string[];
    }>;
  };
  benefits: StudioDraftSection;
  howItWorks: StudioDraftSection;
  servicesPrograms: Array<{
    id: string;
    name: string;
    description?: string;
    priceDisplay?: string;
    visible: boolean;
    approved: boolean;
    sourceRef?: string;
  }>;
  location: {
    displayAddress?: string;
    city?: string;
    region?: string;
    mapVisible: boolean;
    confirmed: boolean;
    fieldConfidence?: number;
  };
  media: {
    logoUrl?: string;
    heroImageUrl?: string;
    galleryRefs?: string[];
    videoRefs?: string[];
  };
  inviteCopy: {
    inviteMessage: string;
    emailSubjectSuggestion?: string;
  };
  firstPosts: Array<{
    id: string;
    title?: string;
    body: string;
    audience: "members" | "stewards";
    approved: boolean;
  }>;
  requestAccessCopy: {
    headline: string;
    body: string;
    ctaLabel: string;
  };
  confidenceWarnings: StudioDraftConfidenceWarning[];
  approvals: {
    sections: Record<string, boolean>;
    globalApproved: boolean;
    contactConfirmed: boolean;
    locationConfirmed: boolean;
    claimsConfirmed: boolean;
  };
};

/** Full draft row + parsed content for API responses. */
export type StudioDraftDTO = {
  id: string;
  ownerUserId: string;
  templateType: StudioTemplateType;
  status: StudioDraftStatus;
  builderStep: StudioBuilderStep;
  content: StudioDraftContentDTO;
  version: number;
  linkedSpaceId: string | null;
  publishedStudioId: string | null;
  sources?: StudioSourceInputDTO[];
  createdAt: string;
  updatedAt: string;
};

export type CreateStudioDraftDTO = {
  templateType: StudioTemplateType;
  builderStep?: StudioBuilderStep;
};

export type PatchStudioDraftDTO = {
  templateType?: StudioTemplateType;
  status?: StudioDraftStatus;
  builderStep?: StudioBuilderStep;
  content?: Partial<StudioDraftContentDTO> | StudioDraftContentDTO;
  linkedSpaceId?: string | null;
};
