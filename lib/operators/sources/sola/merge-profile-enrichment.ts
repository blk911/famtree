// lib/operators/sources/sola/merge-profile-enrichment.ts

import type { SolaProfileEnrichment, SolaResolverCandidate } from "./types";

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function mergeProfileEnrichment(
  candidate: SolaResolverCandidate,
  enrichment: SolaProfileEnrichment,
): SolaResolverCandidate {
  const socialLinks = uniqueStrings([
    ...candidate.socialLinks,
    ...enrichment.instagramLinks,
    ...enrichment.facebookLinks,
  ]);

  const bookingLinks = uniqueStrings([
    ...candidate.bookingLinks,
    ...enrichment.bookingLinks,
    enrichment.profileUrl,
  ]);

  const phones = uniqueStrings([
    ...enrichment.phoneLinks.map((link) => link.replace(/^tel:/i, "")),
  ]);

  const emails = uniqueStrings([
    ...enrichment.emailLinks.map((link) => link.replace(/^mailto:/i, "")),
  ]);

  const externalLinks = uniqueStrings([
    ...enrichment.websiteLinks,
    ...enrichment.instagramLinks,
    ...enrichment.facebookLinks,
  ]);

  const services = uniqueStrings([
    ...candidate.services,
    ...candidate.categories,
    ...enrichment.services,
  ]);

  const profileImages = uniqueStrings([
    candidate.imageUrl,
    ...enrichment.imageUrls,
  ]);

  const enrichmentStatus = enrichment.error ? "failed" : "enriched";

  return {
    ...candidate,
    professionalName:
      enrichment.professionalName &&
      enrichment.professionalName.length <= 60
        ? enrichment.professionalName
        : candidate.professionalName,
    businessName: enrichment.businessName ?? candidate.businessName,
    website: enrichment.websiteLinks[0] ?? candidate.website,
    services,
    categories: uniqueStrings([...candidate.categories, ...enrichment.services]),
    phoneLinks: uniqueStrings([...candidate.phoneLinks, ...enrichment.phoneLinks]),
    socialLinks,
    bookingLinks,
    phones,
    emails,
    externalLinks,
    bio: enrichment.bio ?? candidate.bio,
    profileImages,
    imageUrl: profileImages[0] ?? candidate.imageUrl,
    enrichmentStatus,
    enrichmentFetchedAt: enrichment.fetchedAt,
  };
}
