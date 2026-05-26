// lib/studios/creator-lab/hashtag-harvest/types.ts
// Types for the Hashtag Harvest pipeline — admin-only, internal tooling only.

import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { EducationType, AudienceType } from "./education-config";

// ─── Apify raw output ─────────────────────────────────────────────────────────

/** Raw post item as returned by Apify Instagram hashtag scraper */
export interface ApifyPost {
  // identity — field names vary across actor versions; handle all
  ownerUsername?: string;
  owner?: { username?: string; fullName?: string; id?: string };
  username?: string;

  // display name
  ownerFullName?: string;
  fullName?: string;

  // content
  caption?: string;
  hashtags?: string[];

  // links
  url?: string;
  shortCode?: string;
  postUrl?: string;

  // media
  imageUrl?: string;
  thumbnailUrl?: string;
  displayUrl?: string;

  // meta
  timestamp?: string;
  likesCount?: number;
  commentsCount?: number;
  id?: string;
}

// ─── Extracted creator seed ───────────────────────────────────────────────────

export interface HarvestedCreatorSeed {
  handle: string;
  displayName: string;
  profileUrl: string | null;
  sourceHashtag: string;           // which hashtag this came from
  captionSnippet: string | null;   // first 200 chars of caption
  postUrl: string | null;
  imageUrl: string | null;
  detectedCategory: string | null;
  detectedLocation: string | null;
  educationType: EducationType | null;
  audienceType: AudienceType | null;
  evidence: string[];
}

// ─── Resolver pipeline result ─────────────────────────────────────────────────

export interface ResolverPipelineResult {
  seed: HarvestedCreatorSeed;
  resolved: boolean;
  bestMatchUrl: string | null;
  bestMatchPlatform: string | null;
  matchedUrlCount: number;
  prospectId: string | null;
  confidence: number;
  notes: string;
}

// ─── Harvest run ──────────────────────────────────────────────────────────────

export interface HashtagHarvestRun {
  runId: string;
  createdAt: string;
  hashtags: string[];
  market: string;
  category: string;
  mode: ResolveMode;
  apifyActorRunId: string | null;
  totalPosts: number;
  totalCreators: number;
  totalResolved: number;
  totalProspectsCreated: number;
  totalProspectsUpdated: number;
  errors: string[];
}

export interface HarvestRunFile {
  run: HashtagHarvestRun;
  creators: HarvestedCreatorSeed[];
  results: ResolverPipelineResult[];
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface HarvestRunRequest {
  hashtags: string[];
  market: string;
  category: string;
  maxPerHashtag: number;
  mode: ResolveMode;
}

export interface HarvestRunResponse {
  ok: true;
  run: HashtagHarvestRun;
  creators: HarvestedCreatorSeed[];
  results: ResolverPipelineResult[];
}

export interface HarvestErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}
