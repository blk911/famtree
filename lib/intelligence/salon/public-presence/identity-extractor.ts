// lib/intelligence/salon/public-presence/identity-extractor.ts

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import type {
  PublicPresenceProspectInput,
  SalonIdentityPacket,
} from "./types";

const SERVICE_KEYWORDS = [
  "hair",
  "nails",
  "nail",
  "balayage",
  "colorist",
  "esthetician",
  "esthetic",
  "lashes",
  "lash",
  "brows",
  "brow",
  "barber",
  "makeup",
  "massage",
  "skincare",
  "skin",
  "spa",
  "suite",
  "braids",
  "extensions",
  "waxing",
  "facial",
];

const PROVIDER_QUERY_TERMS = [
  "GlossGenius",
  "Vagaro",
  "Booksy",
  "Square",
  "Fresha",
  "StyleSeat",
];

const LOCATION_NOISE = new Set([
  "co",
  "colorado",
  "denver",
  "nyc",
  "la",
  "tx",
  "fl",
  "ca",
]);

function uniqueStrings(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) return out;
  }
  return out;
}

function parseLocation(locationGuess?: string | null): { city?: string; state?: string } {
  if (!locationGuess?.trim()) return {};
  const parts = locationGuess.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], state: parts[parts.length - 1]?.slice(0, 2).toUpperCase() };
  }
  const one = parts[0] ?? "";
  if (/^[A-Z]{2}$/i.test(one)) return { state: one.toUpperCase() };
  return { city: one };
}

function primaryNameSegment(displayName: string): string {
  const pipe = displayName.split("|")[0]?.trim();
  return pipe && pipe.length > 0 ? pipe : displayName.trim();
}

function extractPersonName(displayName: string): string | undefined {
  const primary = primaryNameSegment(displayName);
  const beforeAt = primary.split("@")[0]?.trim() ?? primary;
  const cleaned = beforeAt
    .replace(/\b(hair|nails|lash|lashes|brow|barber|esthetician|colorist|denver|co)\b/gi, "")
    .replace(/[^a-zA-Z\s]/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 1 && !LOCATION_NOISE.has(w.toLowerCase()));
  if (words.length >= 2 && words.length <= 4) return words.slice(0, 3).join(" ");
  if (words.length === 1 && words[0]!.length >= 4) return words[0];
  return undefined;
}

function extractBusinessName(
  displayName: string,
  handle?: string,
): string | undefined {
  const primary = primaryNameSegment(displayName);
  const brand = primary.split(/\||@|·|•/)[0]?.trim();
  if (brand && brand.length >= 3 && !/colorist|esthetician|denver/i.test(brand)) {
    const person = extractPersonName(displayName);
    if (person && brand.toLowerCase() === person.toLowerCase()) {
      // display is person-only
    } else if (brand.split(/\s+/).length <= 5) {
      return brand;
    }
  }
  if (handle) {
    const h = handle.replace(/^@+/, "").trim();
    if (h.length >= 4) return h;
  }
  return undefined;
}

function extractKeywords(text: string, categoryHint?: string | null): string[] {
  const hay = `${text} ${categoryHint ?? ""}`.toLowerCase();
  const hits = SERVICE_KEYWORDS.filter((k) => hay.includes(k));
  if (categoryHint) {
    const hint = categoryHint.toLowerCase().split(/[\s,/|]+/).filter((w) => w.length > 2);
    for (const w of hint) {
      if (SERVICE_KEYWORDS.some((k) => w.includes(k) || k.includes(w))) hits.push(w);
    }
  }
  return uniqueStrings(hits, 12);
}

export function buildSalonSearchQueries(identity: SalonIdentityPacket): string[] {
  const loc = [identity.city, identity.state].filter(Boolean).join(" ").trim();
  const person = identity.extractedPersonName;
  const business = identity.extractedBusinessName;
  const handle = identity.instagramHandle?.replace(/^@+/, "");
  const queries: string[] = [];

  if (person) {
    if (loc) queries.push(`"${person}" "${loc}" hair`);
    queries.push(`"${person}" "GlossGenius"`);
    queries.push(`"${person}" "Vagaro"`);
    queries.push(`"${person}" "Booksy"`);
  }

  if (business) {
    const label = business.length > 3 && business !== handle ? business : handle;
    if (label) {
      if (loc) queries.push(`"${label}" "${loc}"`);
      queries.push(`"${label}" "GlossGenius"`);
      queries.push(`${label} GlossGenius`);
    }
  }

  if (handle) {
    queries.push(`"${handle}" GlossGenius`);
    queries.push(`site:glossgenius.com ${handle}`);
  }

  for (const provider of PROVIDER_QUERY_TERMS) {
    if (person && loc) queries.push(`"${person}" "${provider}" ${loc}`);
    else if (person) queries.push(`"${person}" "${provider}"`);
  }

  return uniqueStrings(queries, 8);
}

export function buildSalonIdentityPacket(
  prospect: PublicPresenceProspectInput | ProspectRecord,
): SalonIdentityPacket {
  const isRecord = "identity" in prospect && prospect.identity != null;
  let handle = "";
  let displayName = "";
  let bio = "";
  let city: string | undefined;
  let state: string | undefined;
  let categoryHint: string | null = null;
  let prospectId: string | undefined;

  if (isRecord) {
    const rec = prospect as ProspectRecord;
    handle = rec.identity.handle.replace(/^@+/, "");
    displayName = rec.identity.name ?? "";
    bio = "";
    const locParsed = parseLocation(rec.identity.locationGuess);
    city = locParsed.city;
    state = locParsed.state;
    categoryHint =
      rec.identity.categoryGuess ?? rec.businessSubcategory ?? rec.businessCategory ?? null;
    prospectId = rec.prospectId;
  } else {
    const inp = prospect as PublicPresenceProspectInput;
    handle = (inp.instagramHandle ?? "").replace(/^@+/, "");
    displayName = inp.displayName ?? "";
    bio = inp.bio ?? "";
    const locParsed = parseLocation(null);
    city = inp.city ?? locParsed.city;
    state = inp.state ?? locParsed.state;
    categoryHint = inp.categoryHint ?? null;
    prospectId = inp.prospectId;
  }

  const extractedPersonName = extractPersonName(displayName ?? "");
  const extractedBusinessName = extractBusinessName(displayName ?? "", handle);
  const extractedKeywords = extractKeywords(
    `${displayName} ${bio} ${handle}`,
    categoryHint,
  );

  const packet: SalonIdentityPacket = {
    prospectId,
    instagramHandle: handle,
    displayName: displayName ?? undefined,
    bio: bio || undefined,
    city,
    state,
    categoryHint: categoryHint ?? undefined,
    extractedPersonName,
    extractedBusinessName,
    extractedKeywords,
    searchQueries: [],
  };

  packet.searchQueries = buildSalonSearchQueries(packet);
  return packet;
}

export function prospectToPublicPresenceInput(
  prospect: ProspectRecord,
): PublicPresenceProspectInput {
  const loc = parseLocation(prospect.identity.locationGuess);
  return {
    prospectId: prospect.prospectId,
    instagramHandle: prospect.identity.handle,
    displayName: prospect.identity.name,
    bio: prospect.evidence
      ?.filter((e) => typeof e === "string")
      .join(" ")
      .slice(0, 500),
    city: loc.city,
    state: loc.state,
    categoryHint:
      prospect.identity.categoryGuess ??
      prospect.businessSubcategory ??
      prospect.businessCategory ??
      null,
    website: prospect.bestMatch?.url,
    bioUrl: prospect.linkInBioUrl,
    bestMatchUrl: prospect.bestMatch?.url ?? prospect.bookingUrl,
    allMatchedUrls: prospect.allMatchedUrls,
    linkTrailUrls: prospect.linkTrailUrlsScanned,
    linkTrailUrlsScanned: prospect.linkTrailUrlsScanned,
    linkInBioUrl: prospect.linkInBioUrl,
    linkInBioPageFetched: prospect.linkInBioPageFetched,
    evidence: prospect.evidence,
    bookingProvider: prospect.bookingProvider,
    bookingProviderConfidence: prospect.bookingProviderConfidence,
    bookingProviderSource: prospect.bookingProviderSource,
    bookingUrl: prospect.bookingUrl,
  };
}
