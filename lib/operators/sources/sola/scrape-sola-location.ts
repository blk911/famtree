// lib/operators/sources/sola/scrape-sola-location.ts
// Playwright harvest for Sola Salon Studios suite directory pages (Vagaro-powered).

import {
  formatPlaywrightHarvestWarning,
  getPlaywrightRuntimeStatus,
  PLAYWRIGHT_BROWSER_MISSING_WARNING,
  resolvePlaywrightBrowserWarning,
} from "@/lib/intelligence/salon/source-ingest/playwright-runtime";
import { buildSolaCandidateKey } from "./candidate-key";
import {
  normalizeSolaName,
  normalizeSolaProfileUrl,
} from "./profile-url-utils";
import type { SolaApiHit, SolaLocationScrapeResult, SolaRawListing } from "./types";
import { SOLA_SOURCE_PROVIDER, SOLA_SOURCE_TYPE } from "./types";

const PAGE_TIMEOUT_MS = 45_000;
const SETTLE_MS = 10_000;
const CARD_WAIT_MS = 25_000;
const MAX_API_BODY_CHARS = 120_000;

export function buildSolaLocationUrl(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return `https://book.solasalonstudios.com/${clean}/location`;
}

export function parentContainerIdForSlug(slug: string): string {
  return `sola:${slug.trim().toLowerCase()}`;
}

export { normalizeSolaName, normalizeSolaProfileUrl } from "./profile-url-utils";

export function parseSuiteFromLabel(suiteLabel?: string): string | undefined {
  if (!suiteLabel?.trim()) return undefined;
  const match = suiteLabel.match(/studio\s*#?\s*(\d+)/i);
  if (match) return match[1];
  return suiteLabel.trim();
}

/** @deprecated Use buildSolaCandidateKey from ./candidate-key */
export function buildCandidateKey(
  slug: string,
  operatorName: string,
  suite?: string,
): string {
  return buildSolaCandidateKey(slug, {
    businessName: operatorName,
    professionalName: operatorName,
    displayName: operatorName,
    suite,
  });
}

function truncateJsonBody(body: unknown): unknown {
  const raw = JSON.stringify(body);
  if (raw.length <= MAX_API_BODY_CHARS) return body;
  return { _truncated: true, preview: raw.slice(0, MAX_API_BODY_CHARS) };
}

function parseCityFromSuiteLabel(label?: string): string | undefined {
  if (!label) return undefined;
  const match = label.match(/at\s+Sola\s+Salons?\s+(.+)$/i);
  return match?.[1]?.trim();
}

const MARKETING_LOCATION_URL = (slug: string) =>
  `https://www.solasalonstudios.com/locations/${slug}`;

const BOOK_PROFILE_SLUG_RE = /book\.solasalonstudios\.com\/([a-z0-9-]+)/gi;

async function scrapeSolaLocationFromMarketing(
  slug: string,
  sourceUrl: string,
): Promise<{ listings: SolaRawListing[]; parentContainerName?: string }> {
  try {
    const response = await fetch(MARKETING_LOCATION_URL(slug), {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "famtree-sola-harvest/1.0",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return { listings: [] };

    const html = await response.text();
    const profileSlugs = new Set<string>();
    for (const match of Array.from(html.matchAll(BOOK_PROFILE_SLUG_RE))) {
      const profileSlug = match[1].toLowerCase();
      if (profileSlug === slug) continue;
      profileSlugs.add(profileSlug);
    }

    const parentContainerName =
      html.match(/# Salon Suites For Rent ([^,<]+)/i)?.[1]?.trim() ?? slug;

    const listings = Array.from(profileSlugs).map((profileSlug) => {
      const profileUrl = `https://book.solasalonstudios.com/${profileSlug}/pro`;
      const displayName = profileSlug.replace(/-/g, " ");
      return mapDomListing(
        {
          displayName,
          visibleText: displayName,
          profileUrl,
          categories: [],
          phoneLinks: [],
          socialLinks: [],
          bookingLinks: [profileUrl],
          pageCity: parentContainerName,
        },
        slug,
        sourceUrl,
        parentContainerName,
        parentContainerName,
      );
    });

    return { listings, parentContainerName };
  } catch {
    return { listings: [] };
  }
}

type PlaywrightChromium = {
  launch: (opts?: { headless?: boolean }) => Promise<{
    newPage: () => Promise<PlaywrightPage>;
    close: () => Promise<void>;
  }>;
};

type PlaywrightResponse = {
  url: () => string;
  status: () => number;
  headers: () => Record<string, string>;
  json: () => Promise<unknown>;
};

type PlaywrightPage = {
  goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  waitForSelector: (selector: string, opts?: { timeout?: number }) => Promise<unknown>;
  waitForFunction: (
    fn: () => boolean,
    opts?: { timeout?: number },
  ) => Promise<unknown>;
  on: (event: "response", handler: (response: PlaywrightResponse) => void) => void;
  evaluate: <T>(fn: () => T) => Promise<T>;
  close: () => Promise<void>;
};

async function dismissCookieBanner(page: PlaywrightPage): Promise<void> {
  await page.evaluate(() => {
    const selectors = [
      "#cky-btn-accept",
      ".cky-btn-accept",
      '[data-cky-tag="accept-button"]',
      'button[aria-label="Accept"]',
    ];
    for (const selector of selectors) {
      const button = document.querySelector(selector) as HTMLElement | null;
      if (button) {
        button.click();
        break;
      }
    }
  });
}

async function waitForDirectoryCards(page: PlaywrightPage): Promise<void> {
  try {
    await page.waitForSelector("a.dir-card-wrapper", { timeout: CARD_WAIT_MS });
    return;
  } catch {
    // fall through to polling
  }

  try {
    await page.waitForFunction(
      () => document.querySelectorAll("a.dir-card-wrapper").length > 0,
      { timeout: CARD_WAIT_MS },
    );
  } catch {
    // continue with best-effort extraction
  }
}

async function loadPlaywrightChromium(): Promise<PlaywrightChromium | null> {
  const status = await getPlaywrightRuntimeStatus();
  if (!status.packageInstalled || !status.browserAvailable) return null;
  try {
    const mod = (await import("playwright")) as unknown as { chromium: PlaywrightChromium };
    return mod.chromium ?? null;
  } catch {
    return null;
  }
}

type DomListing = {
  professionalName?: string;
  businessName?: string;
  displayName: string;
  visibleText: string;
  profileUrl?: string;
  imageUrl?: string;
  suiteLabel?: string;
  categories: string[];
  phoneLinks: string[];
  socialLinks: string[];
  bookingLinks: string[];
  pageCity?: string;
};

/**
 * TODO: After inspecting apiHits from live harvests, wire a direct API fetch when
 * a response clearly contains the full professionals/tenants array (Vagaro mysite APIs).
 */
export function discoverSolaApiEndpoint(apiHits: SolaApiHit[]): string | null {
  const patterns = [
    /professionals/i,
    /providers/i,
    /tenants/i,
    /staff/i,
    /directory/i,
    /mysite/i,
  ];

  for (const hit of apiHits) {
    const url = hit.url.toLowerCase();
    if (!url.includes("vagaro.com") && !url.includes("solasalonstudios.com")) continue;
    if (!patterns.some((re) => re.test(url))) continue;

    const body = hit.body;
    if (Array.isArray(body) && body.length > 0) return hit.url;
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      const data = record.Data ?? record.data;
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        if (first && typeof first === "object") {
          const keys = Object.keys(first as object).join(" ").toLowerCase();
          if (
            keys.includes("name") ||
            keys.includes("nickname") ||
            keys.includes("business") ||
            keys.includes("professional")
          ) {
            return hit.url;
          }
        }
      }
    }
  }

  return null;
}

function mapDomListing(
  row: DomListing,
  slug: string,
  sourceUrl: string,
  parentContainerName?: string,
  pageCity?: string,
): SolaRawListing {
  const operatorName = row.businessName || row.professionalName || row.displayName;
  const normalizedName = normalizeSolaName(operatorName);
  const normalizedCity = normalizeSolaName(
    pageCity ?? row.pageCity ?? parseCityFromSuiteLabel(row.suiteLabel) ?? "",
  );
  const normalizedProfileUrl = normalizeSolaProfileUrl(row.profileUrl);
  const parentContainerId = parentContainerIdForSlug(slug);
  const suite = parseSuiteFromLabel(row.suiteLabel);

  return {
    professionalName: row.professionalName,
    businessName: row.businessName,
    displayName: row.displayName,
    visibleText: row.visibleText,
    profileUrl: row.profileUrl,
    imageUrl: row.imageUrl,
    suiteLabel: row.suiteLabel,
    suite,
    categories: row.categories,
    services: row.categories,
    phoneLinks: row.phoneLinks,
    socialLinks: row.socialLinks,
    bookingLinks: row.bookingLinks,
    locationSlug: slug,
    parentContainerId,
    parentContainerName,
    sourceUrl,
    normalizedName,
    normalizedCity: normalizedCity || undefined,
    normalizedProfileUrl,
    candidateKey: buildSolaCandidateKey(slug, {
      profileUrl: row.profileUrl,
      normalizedProfileUrl,
      businessName: row.businessName,
      professionalName: row.professionalName,
      displayName: row.displayName,
      suite,
      suiteLabel: row.suiteLabel,
    }),
  };
}

export async function scrapeSolaLocation(
  parentContainerSlug: string,
): Promise<SolaLocationScrapeResult> {
  const slug = parentContainerSlug.trim().toLowerCase();
  const sourceUrl = buildSolaLocationUrl(slug);
  const fetchedAt = new Date().toISOString();
  const base: SolaLocationScrapeResult = {
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    parentContainerSlug: slug,
    sourceUrl,
    fetchedAt,
    apiHits: [],
    listings: [],
  };

  const marketing = await scrapeSolaLocationFromMarketing(slug, sourceUrl);
  if (marketing.listings.length > 0) {
    return {
      ...base,
      parentContainerName: marketing.parentContainerName,
      listings: marketing.listings,
    };
  }

  const status = await getPlaywrightRuntimeStatus();
  const preflight = await resolvePlaywrightBrowserWarning(status);
  if (preflight) {
    return { ...base, error: preflight };
  }

  const chromium = await loadPlaywrightChromium();
  if (!chromium) {
    return { ...base, error: PLAYWRIGHT_BROWSER_MISSING_WARNING };
  }

  let browser: Awaited<ReturnType<PlaywrightChromium["launch"]>> | null = null;
  let page: (PlaywrightPage & { on?: PlaywrightPage["on"] }) | null = null;
  const apiHits: SolaApiHit[] = [];
  const pendingResponses: Promise<void>[] = [];

  try {
    browser = await chromium.launch({ headless: true });
    page = (await browser.newPage()) as PlaywrightPage;

    page.on("response", (response) => {
      const task = (async () => {
        const contentType = response.headers()["content-type"] ?? "";
        if (!contentType.includes("json") && !contentType.includes("javascript")) return;
        try {
          const body = await response.json();
          apiHits.push({
            url: response.url(),
            status: response.status(),
            contentType,
            body: truncateJsonBody(body),
          });
        } catch {
          // non-JSON or unreadable
        }
      })();
      pendingResponses.push(task);
    });

    await page.goto(sourceUrl, {
      waitUntil: "networkidle",
      timeout: PAGE_TIMEOUT_MS,
    });
    await page.waitForTimeout(2_000);
    await dismissCookieBanner(page);
    await page.waitForTimeout(1_000);
    await waitForDirectoryCards(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(SETTLE_MS);
    await Promise.allSettled(pendingResponses);

    const dom = await page.evaluate(() => {
      const locationHeading =
        document.querySelector("h1")?.textContent?.trim() ||
        document.querySelector("h2")?.textContent?.trim() ||
        undefined;
      const pageCity =
        locationHeading ||
        document.body.innerText.match(/\n([A-Za-z .'-]+),\s*[A-Z]{2}\s+\d{5}/)?.[1]?.trim();

      const socialHosts = ["facebook.com", "instagram.com", "tiktok.com", "twitter.com", "x.com"];
      const pageSocial = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.getAttribute("href") ?? "")
        .filter((href) => socialHosts.some((host) => href.includes(host)));

      const pagePhones = Array.from(document.querySelectorAll('a[href^="tel:"]'))
        .map((a) => a.getAttribute("href") ?? "")
        .filter(Boolean);

      const rows: DomListing[] = [];
      const wrappers = document.querySelectorAll("a.dir-card-wrapper");

      wrappers.forEach((anchor) => {
        const href = anchor.getAttribute("href") ?? undefined;
        const card = anchor.querySelector(".dir-card");
        if (!card) return;

        const professionalName = card.querySelector(".dir-pro-name")?.textContent?.trim() || undefined;
        const businessName = card.querySelector(".dir-biz-name")?.textContent?.trim() || undefined;
        const suiteLabel = card.querySelector(".dir-suite-label")?.textContent?.trim() || undefined;
        const imageEl = card.querySelector(".dir-image") as HTMLElement | null;
        const imageUrl = imageEl?.style?.backgroundImage
          ? imageEl.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/i)?.[1]?.replace(/&quot;/g, "")
          : undefined;

        const categories = Array.from(card.querySelectorAll(".dir-chip"))
          .map((chip) => chip.textContent?.trim())
          .filter((value): value is string => Boolean(value));

        const displayName = businessName || professionalName || href || "Unknown";
        const visibleText = card.textContent?.replace(/\s+/g, " ").trim() ?? displayName;

        rows.push({
          professionalName,
          businessName,
          displayName,
          visibleText,
          profileUrl: href,
          imageUrl,
          suiteLabel,
          categories,
          phoneLinks: pagePhones,
          socialLinks: pageSocial,
          bookingLinks: href ? [href] : [],
          pageCity,
        });
      });

      return { rows, pageCity, parentContainerName: locationHeading };
    });

    let listings = dom.rows.map((row) =>
      mapDomListing(row, slug, sourceUrl, dom.parentContainerName, dom.pageCity),
    );

    if (listings.length === 0) {
      const marketing = await scrapeSolaLocationFromMarketing(slug, sourceUrl);
      if (marketing.listings.length > 0) {
        listings = marketing.listings;
        return {
          ...base,
          parentContainerName: marketing.parentContainerName ?? dom.parentContainerName,
          apiHits,
          listings,
        };
      }
    }

    return {
      ...base,
      parentContainerName: dom.parentContainerName,
      apiHits,
      listings,
    };
  } catch (error) {
    const formatted = formatPlaywrightHarvestWarning(error);
    getPlaywrightRuntimeStatus(true).catch(() => undefined);
    return {
      ...base,
      apiHits,
      error: formatted.warning,
    };
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
