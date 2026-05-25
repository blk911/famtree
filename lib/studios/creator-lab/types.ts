// lib/studios/creator-lab/types.ts
// Core types for the Studio Assembler internal lab.
// No database — JSON files under runtime-data/studios/creator-lab/

// ─── Platform detection ────────────────────────────────────────────────────────

export type Platform =
  | "instagram"
  | "etsy"
  | "shopify"
  | "squarespace"
  | "wix"
  | "bigcartel"
  | "website"
  | "unknown";

export type CreatorVertical =
  | "artist"
  | "maker"
  | "tutor"
  | "fitness_trainer"
  | "instructor"
  | "local_expert"
  | "service_creator"
  | "unknown";

// ─── Raw fetch layer ───────────────────────────────────────────────────────────

export interface CreatorSource {
  sourceUrl: string;
  normalizedUrl: string;
  platform: Platform;
  fetchedAt: string;       // ISO-8601
  httpStatus: number;
  htmlLength: number;
  htmlText: string;        // full raw HTML (stored for replay)
  links: string[];         // all <a href> values
  imageUrls: string[];     // all <img src> / og:image values
  rawTextBlocks: string[]; // visible text nodes, deduplicated, min 10 chars
}

// ─── Signal extraction layer ───────────────────────────────────────────────────

export interface ProductSignal {
  title: string;
  price: string | null;
  description: string | null;
  imageUrl: string | null;
  pageUrl: string | null;
}

export interface CollectionSignal {
  name: string;
  itemCount: number | null;
  description: string | null;
}

export interface EventSignal {
  title: string;
  date: string | null;
  location: string | null;
  url: string | null;
}

export interface CreatorSignalSet {
  creatorName: string | null;
  handle: string | null;
  bioCandidates: string[];       // text blocks that look like bios
  externalLinks: string[];       // non-platform links found on page
  imageUrls: string[];           // deduplicated image URLs
  productSignals: ProductSignal[];
  collectionSignals: CollectionSignal[];
  eventSignals: EventSignal[];
  commissionSignals: string[];   // text blocks mentioning commissions
  classWorkshopSignals: string[];// text blocks mentioning classes/workshops
  socialTextSignals: string[];   // captions, post text, hashtags
  evidence: string[];            // raw text snippets used for extraction
}

// ─── AI enrichment layer ──────────────────────────────────────────────────────

export type PriceRange = "budget" | "mid" | "premium" | "luxury";
export type PrimaryMonetizationModel = "products" | "services" | "hybrid" | "community";
export type AssemblyConfidence = "low" | "medium" | "high";
export type AssemblyStatus = "assembled" | "pending_review" | "approved" | "rejected";

export interface StyleProfile {
  aesthetic: string[];      // e.g. ["handmade", "rustic", "earthy"]
  medium: string[];         // e.g. ["ceramics", "glaze", "oil paint"]
  priceRange: PriceRange | null;
  audienceGuess: string[];  // e.g. ["collectors", "home decorators", "beginners"]
  tags: string[];           // searchable flat tags, max 12
}

export interface MonetizationProfile {
  primaryModel: PrimaryMonetizationModel | null;
  signals: string[];        // raw signals found (e.g. "Etsy shop active", "commissions open")
  opportunities: string[];  // AI-inferred opportunities
}

export interface AssembledCollection {
  name: string;
  description: string;
  estimatedItemCount: number | null;
  representativeImageUrl: string | null;
}

export interface CreatorIdentity {
  name: string;
  handle: string | null;
  locationGuess: string | null;
  shortBio: string;   // 1–2 sentences, for cards
  longBio: string;    // 3–5 sentences, for studio about section
}

export interface AssembledCreatorStudio {
  creatorId: string;              // slug-safe, e.g. "sarah-ceramics-2024"
  createdAt: string;             // ISO-8601
  updatedAt: string;
  status: AssemblyStatus;

  // Raw inputs
  source: CreatorSource;
  signals: CreatorSignalSet;

  // AI-assembled outputs
  identity: CreatorIdentity;
  styleProfile: StyleProfile;
  monetization: MonetizationProfile;
  collections: AssembledCollection[];
  vertical: CreatorVertical;

  // Studio framing
  suggestedStudioName: string;
  suggestedTagline: string;
  suggestedCategories: string[];  // e.g. ["Visual Art", "Ceramics", "Home Goods"]
  suggestedHeroImageUrl: string | null;

  // Quality signals
  confidence: AssemblyConfidence;
  reviewNotes: string[];          // AI flags, missing data warnings, admin notes
  adminNotes: string;             // freeform admin annotation (editable)
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface AssembleRequest {
  url: string;
  /** Optional admin-pasted profile info — bio, stats, captions, etc. */
  pastedContext?: string;
}

export interface AssembleResponse {
  ok: true;
  creatorId: string;
  studio: AssembledCreatorStudio;
}

export interface AssembleErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}

// ─── Index / listing ──────────────────────────────────────────────────────────

export interface CreatorLabEntry {
  creatorId: string;
  createdAt: string;
  status: AssemblyStatus;
  name: string;
  handle: string | null;
  platform: Platform;
  sourceUrl: string;
  confidence: AssemblyConfidence;
  suggestedStudioName: string;
}
