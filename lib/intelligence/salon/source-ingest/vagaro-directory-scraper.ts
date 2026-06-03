// lib/intelligence/salon/source-ingest/vagaro-directory-scraper.ts

import type { DirectoryRawListing } from "./types";

const JS_RENDER_WARNING =
  "Directory page appears client-rendered; needs browser/Apify scraper adapter.";

const SLUG_RE =
  /id="lnkServiceProvider_(\d+)_(\d+)"[^>]*(?:href="\.\.\/\.\.\/\.\.\/([^"]+)"|onclick="_home\.redirecttoStaff\('([^']+)')/i;

const PROVIDER_NAME_RE =
  /id="spnProviderName_(\d+)_(\d+)"[^>]*>([^<]+)</i;

const BUSINESS_NAME_RE =
  /id="spnBusinessName_(\d+)_(\d+)"[^>]*>([^<]+)</i;

const LOCATION_RE =
  /id="spnBusinessName_(\d+)_(\d+)"[\s\S]{0,400}?<span>([^<]+)<\/span>/i;

const ARIA_RE =
  /aria-label="([^"]+)"/i;

function parseAriaLabel(label: string): {
  professionalName?: string;
  businessName?: string;
  city?: string;
  state?: string;
  rating?: number;
  reviewCount?: number;
} {
  const fromMatch = label.match(
    /^([^,]+?)\s+from\s+(.+?),\s*([^,]+),\s*([A-Z]{2})\s+Has\s+([\d.]+)\s+Star Ratings Having Total\s+(\d+)\s+reviews/i,
  );
  if (fromMatch) {
    return {
      professionalName: fromMatch[1].trim(),
      businessName: fromMatch[2].trim(),
      city: fromMatch[3].trim(),
      state: fromMatch[4].trim(),
      rating: Number.parseFloat(fromMatch[5]),
      reviewCount: Number.parseInt(fromMatch[6], 10),
    };
  }
  const bizMatch = label.match(
    /^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+Has\s+([\d.]+)\s+Star/i,
  );
  if (bizMatch) {
    return {
      businessName: bizMatch[1].trim(),
      city: bizMatch[2].trim(),
      state: bizMatch[3].trim(),
      rating: Number.parseFloat(bizMatch[4]),
    };
  }
  return {};
}

function splitCityState(raw: string): { city?: string; state?: string } {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const state = parts[parts.length - 1].replace(/\.$/, "");
    const city = parts.slice(0, -1).join(", ");
    return { city, state: state.length <= 3 ? state.toUpperCase() : state };
  }
  return {};
}

function vagaroProfileUrl(slug: string, hrefPath?: string): string {
  const clean = (hrefPath ?? slug).replace(/^\.\.\/\.\.\/\.\.\//, "").replace(/^\/+/, "");
  const base = clean.split("/")[0] || slug;
  return `https://www.vagaro.com/${base}`;
}

function vagaroBookingUrl(profileUrl: string): string {
  return profileUrl.replace(/\/$/, "");
}

export type VagaroScrapeResult = {
  listings: DirectoryRawListing[];
  warnings: string[];
};

export function scrapeVagaroDirectoryHtml(
  html: string,
  directoryUrl: string,
  opts?: { market?: string; category?: string },
): VagaroScrapeResult {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const listings: DirectoryRawListing[] = [];

  const idMatches = Array.from(html.matchAll(/id="lnkServiceProvider_(\d+)_(\d+)"/g));
  if (idMatches.length === 0) {
    warnings.push(JS_RENDER_WARNING);
    return { listings, warnings };
  }

  for (const match of idMatches) {
    const bizId = match[1];
    const providerId = match[2];
    const key = `${bizId}_${providerId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const start = Math.max(0, match.index ?? 0);
    const chunk = html.slice(start, start + 12000);

    const slugMatch = chunk.match(SLUG_RE);
    const slug = slugMatch?.[3] ?? slugMatch?.[4];
    if (!slug) continue;

    const providerNameMatch = chunk.match(PROVIDER_NAME_RE);
    const businessNameMatch = chunk.match(BUSINESS_NAME_RE);
    const locationMatch = chunk.match(LOCATION_RE);
    const ariaMatch = chunk.match(ARIA_RE);

    const ariaParsed = ariaMatch ? parseAriaLabel(ariaMatch[1]) : {};
    const businessName =
      businessNameMatch?.[3]?.trim() ??
      ariaParsed.businessName ??
      slug;
    const professionalName =
      providerNameMatch?.[3]?.trim() ?? ariaParsed.professionalName;
    const displayName = businessName || professionalName || slug;

    let city = ariaParsed.city;
    let state = ariaParsed.state;
    if (locationMatch?.[3]) {
      const loc = splitCityState(locationMatch[3]);
      city = city ?? loc.city;
      state = state ?? loc.state;
    }

    const hrefPath = slugMatch?.[3];
    const profileUrl = vagaroProfileUrl(slug, hrefPath);
    const bookingUrl = vagaroBookingUrl(profileUrl);

    const evidence: string[] = [
      `Vagaro directory listing (${directoryUrl})`,
      `Business ID ${bizId}, provider ID ${providerId}`,
    ];
    if (professionalName) evidence.push(`Professional: ${professionalName}`);
    if (ariaParsed.rating != null) {
      evidence.push(`Rating: ${ariaParsed.rating} (${ariaParsed.reviewCount ?? 0} reviews)`);
    }
    if (opts?.market) evidence.push(`Market: ${opts.market}`);
    if (opts?.category) evidence.push(`Category: ${opts.category}`);

    listings.push({
      displayName,
      professionalName,
      businessName,
      providerProfileUrl: profileUrl.includes("/staff") ? profileUrl : `${profileUrl}/staff`,
      bookingUrl,
      city,
      state,
      category: opts?.category,
      rating: ariaParsed.rating,
      reviewCount: ariaParsed.reviewCount,
      sourceUrl: directoryUrl,
      sourceProvider: "vagaro",
      sourceType: "vagaro_directory",
      evidence,
    });
  }

  if (listings.length === 0 && idMatches.length > 0) {
    warnings.push(JS_RENDER_WARNING);
  }

  return { listings, warnings };
}

export async function fetchVagaroDirectoryPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AMIHUMAN-SalonDirectoryIngest/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Vagaro fetch failed (${res.status})`);
  }
  return res.text();
}
