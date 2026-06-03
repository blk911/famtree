// lib/intelligence/salon/source-ingest/directory-candidate-normalizer.ts

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";
import { normalizeHandle } from "@/lib/studios/prospects/store-json";
import { businessNameToHandleHint } from "@/lib/intelligence/salon/ggen-seed-discovery/parse";
import type {
  DirectoryCandidate,
  DirectoryClassification,
  DirectoryRawListing,
  DirectorySourceType,
  SalonDirectoryProvider,
} from "./types";

const BOOKING_LABELS: Partial<Record<SalonDirectoryProvider, string>> = {
  vagaro: "Vagaro",
  styleseat: "StyleSeat",
  glossgenius: "GlossGenius",
};

function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function directoryCandidateDedupeKey(
  listing: DirectoryRawListing,
  provider: SalonDirectoryProvider,
): string {
  const loc = [listing.city, listing.state].filter(Boolean).join(",");
  const nameKey = normalizeNameKey(listing.displayName);
  const urlKey =
    (listing.providerProfileUrl ?? listing.bookingUrl ?? "").toLowerCase();
  return `${provider}|${nameKey}|${loc}|${urlKey}`;
}

export function normalizeDirectoryListing(
  listing: DirectoryRawListing,
): DirectoryCandidate {
  return {
    ...listing,
    dedupeKey: directoryCandidateDedupeKey(listing, listing.sourceProvider),
  };
}

export function isDuplicateDirectoryCandidate(
  candidate: DirectoryCandidate,
  existing: ProspectRecord[],
): boolean {
  const profile = (candidate.providerProfileUrl ?? "").toLowerCase();
  const booking = (candidate.bookingUrl ?? "").toLowerCase();
  const nameKey = normalizeNameKey(candidate.displayName);
  const loc = [candidate.city, candidate.state].filter(Boolean).join(",").toLowerCase();
  const provider = (candidate.sourceProvider ?? "").toLowerCase();

  return existing.some((p) => {
    const urls = [
      p.bestMatch?.url,
      p.bookingUrl,
      ...(p.allMatchedUrls ?? []).map((u) => u.url),
    ]
      .filter(Boolean)
      .map((u) => u!.toLowerCase());

    if (profile && urls.some((u) => u === profile || u.startsWith(profile))) return true;
    if (booking && urls.some((u) => u === booking || u.startsWith(booking))) return true;

    const pName = normalizeNameKey(p.identity.name);
    const pLoc = (p.identity.locationGuess ?? "").toLowerCase();
    const pProvider = (p.bookingProvider ?? p.sourcePlatform ?? "").toLowerCase();
    if (
      nameKey.length > 2 &&
      pName === nameKey &&
      (!loc || pLoc.includes(loc) || loc.includes(pLoc)) &&
      (!provider || pProvider === provider)
    ) {
      return true;
    }
    return false;
  });
}

export function directorySourceTypeToProspectSource(
  sourceType: DirectorySourceType,
): UpsertInput["source"]["sourceType"] {
  switch (sourceType) {
    case "vagaro_directory":
      return "vagaro_directory";
    case "styleseat_directory":
      return "styleseat_directory";
    case "glossgenius_directory":
      return "glossgenius_directory";
    case "suite_directory":
      return "suite_directory";
    default:
      return "unknown_directory";
  }
}

export function directoryListingToUpsertInput(
  listing: DirectoryCandidate,
  classification: DirectoryClassification,
  ingestRunId: string,
  notes?: string,
): UpsertInput {
  const bookingProvider =
    listing.sourceProvider !== "unknown" &&
    listing.sourceProvider !== "sola" &&
    listing.sourceProvider !== "phenix" &&
    listing.sourceProvider !== "spectra"
      ? listing.sourceProvider
      : listing.bookingUrl?.includes("vagaro")
        ? "vagaro"
        : undefined;

  const handleBase = businessNameToHandleHint(listing.displayName);
  const handle = `@${normalizeHandle(handleBase).slice(0, 30) || "salon"}`;
  const locationGuess =
    [listing.city, listing.state].filter(Boolean).join(", ") || null;
  const profileUrl = listing.providerProfileUrl ?? listing.bookingUrl ?? "";
  const bookingUrl = listing.bookingUrl ?? profileUrl;
  const confidence = 48;

  const tags = [
    "backoffice_import_candidate",
    "salon_directory_ingest",
    listing.sourceType,
  ];

  const evidence = [...listing.evidence];
  if (notes?.trim()) evidence.push(`Ingest notes: ${notes.trim()}`);
  if (listing.professionalName) {
    evidence.push(`Listed professional: ${listing.professionalName}`);
  }

  const platform = bookingProvider ?? listing.sourceProvider;

  return {
    source: {
      sourceType: directorySourceTypeToProspectSource(listing.sourceType),
      batchId: ingestRunId,
      sourceHandle: handle,
      sourceDisplayName: listing.displayName,
    },
    vertical: "salon",
    sourcePlatform: platform,
    sourceTool: "salon_directory_ingest",
    sourceHashtag: classification.category ?? null,
    sourceHashtags: classification.category ? [classification.category] : [],
    sourcePath: `salon/directory-ingest/${ingestRunId}`,
    runId: ingestRunId,
    harvestDate: new Date().toISOString().slice(0, 10),
    identity: {
      name: listing.displayName,
      handle,
      categoryGuess: listing.category ?? classification.category ?? null,
      locationGuess,
    },
    platforms: platform ? [platform] : [],
    bestMatch: profileUrl
      ? {
          platform: platform ?? "website",
          url: profileUrl,
          confidence,
          matchReason: `Salon directory ingest (${listing.sourceType})`,
        }
      : null,
    allMatchedUrls: profileUrl
      ? [
          {
            platform: platform ?? "website",
            url: profileUrl,
            confidence,
            matchReason: "directory profile",
          },
          ...(bookingUrl && bookingUrl !== profileUrl
            ? [
                {
                  platform: platform ?? "website",
                  url: bookingUrl,
                  confidence,
                  matchReason: "directory booking",
                },
              ]
            : []),
        ]
      : [],
    evidence,
    bookingProvider: bookingProvider as UpsertInput["bookingProvider"],
    bookingProviderLabel:
      bookingProvider ? BOOKING_LABELS[bookingProvider] ?? bookingProvider : undefined,
    bookingUrl: bookingUrl || undefined,
    bookingProviderConfidence: bookingProvider ? confidence : undefined,
    bookingProviderEvidence: evidence,
    bookingProviderSource: "direct_url",
    offerFitTags: Array.from(new Set(tags)),
    suggestedValidationStatus: "new",
    educationType: null,
    audienceType: null,
    sourceTopic: listing.category ?? classification.category ?? null,
    services: [],
    confidence: {
      identityMatch: 0,
      bookingMatch: bookingProvider ? confidence : 0,
      categoryMatch: 0,
      locationMatch: locationGuess ? 40 : 0,
      overall: confidence,
    },
  };
}
