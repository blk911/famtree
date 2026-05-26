// lib/studios/creator-lab/hashtag-harvest/extract-post-creators.ts
// Extracts HarvestedCreatorSeed records from raw Apify post items.

import type { ApifyPost, HarvestedCreatorSeed } from "./types";
import { inferEducationType, inferAudienceType } from "./education-config";

// ─── Category detection ───────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Array<{ terms: string[]; category: string }> = [
  { terms: ["lash", "lashes", "lashtech", "lashartist", "lashlift", "volumelash", "russianvolume"], category: "Lash & Brow" },
  { terms: ["brow", "brows", "browlamination", "browtech", "microblading", "pmu", "permanentmakeup"], category: "Lash & Brow" },
  { terms: ["inject", "injector", "botox", "filler", "dysport", "aestheticnurse", "medaesthetics", "aestheticmedicine"], category: "Medical Aesthetics" },
  { terms: ["nailtech", "nailartist", "nails", "nailart", "gelnails", "acrylicnails", "manicure", "pedicure", "nailsalon"], category: "Nails" },
  { terms: ["hairstylist", "haircolorist", "balayage", "highlights", "hairextensions", "keratin", "blondespecialist", "hairsalon"], category: "Hair" },
  { terms: ["massage", "massagetherapist", "bodywork", "deeptissue"], category: "Massage" },
  { terms: ["makeup", "mua", "makeupartist", "makeupartists", "bridalmakeup"], category: "Makeup" },
  { terms: ["tattoo", "tattooist", "tattooartist", "tattooart", "fineline", "piercing"], category: "Tattoo & Body Art" },
  { terms: ["esthetician", "esthetics", "facial", "skincare", "skintherapist", "dermaplaning", "waxing", "wax"], category: "Skin & Body" },
  { terms: ["personaltrainer", "fitnesstrainer", "yogateacher", "pilates", "crossfit", "hiit", "fitnesscoach"], category: "Fitness & Wellness" },
  { terms: ["nutritionist", "dietitian", "healthcoach", "wellness", "holistichealth"], category: "Health & Nutrition" },
  { terms: ["salon", "salonowner", "beautyspace", "beautystudio", "beautyenthusiast"], category: "Beauty" },
  { terms: ["ceramics", "pottery", "potter", "claystudio"], category: "Ceramics & Art" },
  { terms: ["artist", "artgallery", "fineart", "artstudio", "visualartist", "painter"], category: "Visual Art" },
  { terms: ["coach", "lifecoach", "businesscoach", "onlinecoach"], category: "Coaching" },
];

const LOCATION_KEYWORDS: Record<string, string> = {
  denver: "Denver, CO",
  nyc: "New York, NY",
  "new york": "New York, NY",
  "los angeles": "Los Angeles, CA",
  la: "Los Angeles, CA",
  miami: "Miami, FL",
  chicago: "Chicago, IL",
  houston: "Houston, TX",
  dallas: "Dallas, TX",
  atlanta: "Atlanta, GA",
  austin: "Austin, TX",
  seattle: "Seattle, WA",
  boston: "Boston, MA",
  phoenix: "Phoenix, AZ",
  nashville: "Nashville, TN",
  "las vegas": "Las Vegas, NV",
  portland: "Portland, OR",
  charlotte: "Charlotte, NC",
  "san francisco": "San Francisco, CA",
  sf: "San Francisco, CA",
};

function detectCategory(text: string): string | null {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  for (const { terms, category } of CATEGORY_KEYWORDS) {
    if (terms.some((t) => lower.includes(t))) return category;
  }
  return null;
}

function detectLocation(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, location] of Object.entries(LOCATION_KEYWORDS)) {
    if (lower.includes(keyword)) return location;
  }
  return null;
}

// ─── Handle extraction ────────────────────────────────────────────────────────

function extractHandle(post: ApifyPost): string | null {
  const raw =
    post.ownerUsername ??
    post.owner?.username ??
    post.username ??
    null;
  if (!raw) return null;
  return raw.replace(/^@/, "").toLowerCase().trim() || null;
}

function extractDisplayName(post: ApifyPost, handle: string): string {
  const raw =
    post.ownerFullName ??
    post.fullName ??
    post.owner?.fullName ??
    null;
  return (raw && raw.trim()) ? raw.trim() : handle;
}

function extractPostUrl(post: ApifyPost): string | null {
  if (post.url) return post.url;
  if (post.postUrl) return post.postUrl;
  if (post.shortCode) return `https://www.instagram.com/p/${post.shortCode}/`;
  return null;
}

function extractImageUrl(post: ApifyPost): string | null {
  return post.imageUrl ?? post.thumbnailUrl ?? post.displayUrl ?? null;
}

// ─── Main extractor ───────────────────────────────────────────────────────────

/**
 * Extracts unique creator seeds from a batch of Apify posts for a single hashtag.
 * Deduplicates by handle within the batch.
 */
export function extractPostCreators(
  posts: ApifyPost[],
  sourceHashtag: string,
  marketHint: string,
  categoryHint: string,
): HarvestedCreatorSeed[] {
  const seen = new Set<string>();
  const seeds: HarvestedCreatorSeed[] = [];

  for (const post of posts) {
    const handle = extractHandle(post);
    if (!handle || handle.length < 2) continue;
    if (seen.has(handle)) continue;
    seen.add(handle);

    const displayName = extractDisplayName(post, handle);
    const caption = (post.caption ?? "").slice(0, 400);
    const captionSnippet = caption.slice(0, 200) || null;
    const postHashtags = (post.hashtags ?? []).join(" ");
    const fullText = `${displayName} ${caption} ${postHashtags} ${marketHint} ${categoryHint}`;

    const detectedCategory = detectCategory(fullText) ?? (categoryHint || null);
    const detectedLocation = detectLocation(fullText) ?? (marketHint || null);
    const educationType = inferEducationType(sourceHashtag, caption);
    const audienceType  = inferAudienceType(sourceHashtag, caption);

    const evidence: string[] = [];
    if (captionSnippet) evidence.push(`Caption: "${captionSnippet.slice(0, 100)}"`);
    if (detectedCategory) evidence.push(`Category: ${detectedCategory}`);
    if (detectedLocation) evidence.push(`Location: ${detectedLocation}`);
    if (educationType && educationType !== "unknown") evidence.push(`Education type: ${educationType}`);
    evidence.push(`Source hashtag: #${sourceHashtag}`);

    seeds.push({
      handle,
      displayName,
      profileUrl: `https://www.instagram.com/${handle}/`,
      sourceHashtag,
      captionSnippet,
      postUrl: extractPostUrl(post),
      imageUrl: extractImageUrl(post),
      detectedCategory,
      detectedLocation,
      educationType,
      audienceType,
      evidence,
    });
  }

  return seeds;
}
