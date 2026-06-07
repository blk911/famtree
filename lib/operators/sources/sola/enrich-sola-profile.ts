// lib/operators/sources/sola/enrich-sola-profile.ts
// Playwright enrichment for individual Sola /pro profile pages.

import {
  formatPlaywrightHarvestWarning,
  getPlaywrightRuntimeStatus,
  PLAYWRIGHT_BROWSER_MISSING_WARNING,
  resolvePlaywrightBrowserWarning,
} from "@/lib/intelligence/salon/source-ingest/playwright-runtime";
import { normalizeSolaProfileUrl } from "./scrape-sola-location";
import type { SolaProfileApiHit, SolaProfileEnrichment } from "./types";

const PAGE_TIMEOUT_MS = 45_000;
const SETTLE_MS = 6_000;
const MAX_API_BODY_CHARS = 80_000;
const VISIBLE_TEXT_LIMIT = 2_000;
const SOLA_BOOK_HOST = "book.solasalonstudios.com";

const EXCLUDED_HOSTS = [
  "solasalonstudios.com",
  "solafranchising.com",
  "cookieyes.com",
  "google.com",
  "facebook.com/tr",
  "doubleclick.net",
];

const SOCIAL_HOSTS = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
} as const;

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

export type PlaywrightPage = {
  goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  on: (event: "response", handler: (response: PlaywrightResponse) => void) => void;
  evaluate: <T>(fn: () => T) => Promise<T>;
  close: () => Promise<void>;
};

function truncateJsonBody(body: unknown): unknown {
  const raw = JSON.stringify(body);
  if (raw.length <= MAX_API_BODY_CHARS) return body;
  return { _truncated: true, preview: raw.slice(0, MAX_API_BODY_CHARS) };
}

function normalizeHref(href: string, baseUrl: string): string | undefined {
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#" || trimmed === "_blank" || trimmed.startsWith("javascript:")) {
    return undefined;
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:" && resolved.protocol !== "tel:" && resolved.protocol !== "mailto:") {
      return undefined;
    }
    return resolved.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isExcludedLink(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("javascript:")) return true;
  if (lower.startsWith("tel:") || lower.startsWith("mailto:")) return false;

  const host = hostOf(url);
  if (!host) return true;

  if (host === SOLA_BOOK_HOST) {
    return (
      lower.includes("/location") ||
      lower.includes("solasalonstudios.com/why-sola") ||
      lower.includes("solasalonstudios.com/about") ||
      lower.includes("solasalonstudios.com/faq") ||
      lower.includes("solasalonstudios.com/contact")
    );
  }

  if (host.includes("vagaro.com") && url.toLowerCase().includes("/pro/")) {
    return true;
  }

  return EXCLUDED_HOSTS.some(
    (excluded) => host === excluded || host.endsWith(`.${excluded}`),
  );
}

export function dedupeLinks(links: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of links) {
    const normalized = link.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function discoverLikelyProfileApiEndpoint(apiHits: SolaProfileApiHit[]): string | undefined {
  const patterns = [
    /staff/i,
    /provider/i,
    /professional/i,
    /services/i,
    /businessdetail/i,
    /merchant/i,
    /mysite/i,
  ];

  for (const hit of apiHits) {
    const url = hit.url.toLowerCase();
    if (!url.includes("vagaro.com")) continue;
    if (!patterns.some((re) => re.test(url))) continue;
    if (url.includes("dateformat") || url.includes("tracking/save") || url.includes("cookie")) {
      continue;
    }

    const body = hit.body;
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      const data = record.Data ?? record.data;
      if (data && typeof data === "object") {
        const keys = Object.keys(data as object).join(" ").toLowerCase();
        if (
          keys.includes("service") ||
          keys.includes("staff") ||
          keys.includes("provider") ||
          keys.includes("business") ||
          keys.includes("phone")
        ) {
          return hit.url;
        }
      }
      if (Array.isArray(data) && data.length > 0) {
        return hit.url;
      }
    }
  }

  return undefined;
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

type DomProfile = {
  pageTitle: string;
  professionalName?: string;
  businessName?: string;
  phoneHrefs: string[];
  emailHrefs: string[];
  websiteHrefs: string[];
  instagramHrefs: string[];
  facebookHrefs: string[];
  bookingHrefs: string[];
  services: string[];
  bio?: string;
  imageUrls: string[];
  visibleTextSample: string;
};

export type EnrichSolaProfileOptions = {
  page?: PlaywrightPage;
};

export async function enrichSolaProfile(
  profileUrl: string,
  opts?: EnrichSolaProfileOptions,
): Promise<SolaProfileEnrichment> {
  const normalizedUrl = normalizeSolaProfileUrl(profileUrl) ?? profileUrl.trim();
  const fetchedAt = new Date().toISOString();
  const base: SolaProfileEnrichment = {
    profileUrl: normalizedUrl,
    phoneLinks: [],
    emailLinks: [],
    websiteLinks: [],
    instagramLinks: [],
    facebookLinks: [],
    bookingLinks: [],
    services: [],
    imageUrls: [],
    fetchedAt,
    apiHitsCount: 0,
  };

  const status = await getPlaywrightRuntimeStatus();
  const preflight = await resolvePlaywrightBrowserWarning(status);
  if (preflight) {
    return { ...base, error: preflight };
  }

  const ownsBrowser = !opts?.page;
  let browser: Awaited<ReturnType<PlaywrightChromium["launch"]>> | null = null;
  let page: PlaywrightPage | null = opts?.page ?? null;
  const apiHits: SolaProfileApiHit[] = [];
  const pendingResponses: Promise<void>[] = [];

  try {
    if (!page) {
      const chromium = await loadPlaywrightChromium();
      if (!chromium) {
        return { ...base, error: PLAYWRIGHT_BROWSER_MISSING_WARNING };
      }
      browser = await chromium.launch({ headless: true });
      page = (await browser.newPage()) as PlaywrightPage;
    }

    page.on("response", (response) => {
      const task = (async () => {
        const contentType = response.headers()["content-type"] ?? "";
        if (!contentType.includes("json")) return;
        try {
          apiHits.push({
            url: response.url(),
            status: response.status(),
            contentType,
            body: truncateJsonBody(await response.json()),
          });
        } catch {
          // ignore
        }
      })();
      pendingResponses.push(task);
    });

    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_TIMEOUT_MS,
    });
    await page.waitForTimeout(SETTLE_MS);
    await Promise.allSettled(pendingResponses);

    const dom = await page.evaluate(() => {
      const pageTitle = document.title?.trim() || "";
      const businessName = document.querySelector("h1")?.textContent?.trim() || undefined;

      const bodyText = document.body.innerText.replace(/\s+/g, " ").trim();
      const meetMatch = bodyText.match(
        /Meet\s+([A-Za-z][A-Za-z .'-]{0,48}?)(?:\s{2,}|\.|!|\s+I\s+have|\s+Contact|\s+Primary|$)/i,
      );
      const professionalName = meetMatch?.[1]?.trim();

      const services: string[] = [];
      const serviceMatch = bodyText.match(/Primary Services\s+(.+?)(?:Portfolio|Business Info|Hours of Operation|$)/i);
      if (serviceMatch) {
        const chunk = serviceMatch[1];
        const known = [
          "Hair",
          "Hair Extensions",
          "Lashes",
          "Waxing",
          "Barber",
          "Brows",
          "Nails",
          "Skin Care",
          "Makeup",
          "Massage",
        ];
        for (const label of known) {
          if (chunk.includes(label) && !services.includes(label)) services.push(label);
        }
        if (!services.length) {
          services.push(
            ...chunk
              .split(/\s{2,}|\+/)
              .map((part) => part.trim())
              .filter((part) => part.length > 1 && part.length < 40),
          );
        }
      }

      const bioMatch = bodyText.match(
        /Meet\s+[A-Za-z .'-]+\s+(.+?)(?:Contact|Primary Services|Business Info|$)/i,
      );
      const bio = bioMatch?.[1]?.trim().slice(0, 1200);

      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const phoneHrefs: string[] = [];
      const emailHrefs: string[] = [];
      const websiteHrefs: string[] = [];
      const instagramHrefs: string[] = [];
      const facebookHrefs: string[] = [];
      const bookingHrefs: string[] = [];

      for (const anchor of anchors) {
        const href = anchor.getAttribute("href") ?? "";
        const lower = href.toLowerCase();
        if (lower.startsWith("tel:")) phoneHrefs.push(href);
        else if (lower.startsWith("mailto:")) emailHrefs.push(href);
        else if (lower.includes("instagram.com")) instagramHrefs.push(href);
        else if (lower.includes("facebook.com") || lower.includes("fb.com")) facebookHrefs.push(href);
        else if (
          (lower.includes("vagaro.com") && !lower.includes("vagaro.com/pro/")) ||
          lower === "book-now" ||
          (lower.includes("book.solasalonstudios.com") && !lower.includes("/location")) ||
          anchor.textContent?.trim().toLowerCase() === "book now"
        ) {
          bookingHrefs.push(href);
        } else if (
          lower.startsWith("http") &&
          !lower.includes("solasalonstudios.com") &&
          !lower.includes("cookieyes.com") &&
          !lower.includes("google.com/maps")
        ) {
          websiteHrefs.push(href);
        }
      }

      const imageUrls = Array.from(document.querySelectorAll("img[src]"))
        .map((img) => img.getAttribute("src") ?? "")
        .filter((src) => src.startsWith("http") && !src.includes("cookieyes.com"))
        .slice(0, 12);

      return {
        pageTitle,
        professionalName,
        businessName,
        phoneHrefs,
        emailHrefs,
        websiteHrefs,
        instagramHrefs,
        facebookHrefs,
        bookingHrefs,
        services,
        bio,
        imageUrls,
        visibleTextSample: bodyText.slice(0, 2000),
      } satisfies DomProfile;
    });

    const filterLinks = (hrefs: string[]): string[] =>
      dedupeLinks(
        hrefs
          .map((href) => normalizeHref(href, normalizedUrl))
          .filter((href): href is string => Boolean(href))
          .filter((href) => {
            const lower = href.toLowerCase();
            if (lower.startsWith("tel:") || lower.startsWith("mailto:")) return true;
            return !isExcludedLink(href);
          }),
      );

    const bookingLinks = dedupeLinks(
      dom.bookingHrefs
        .map((href) => {
          if (href.toLowerCase() === "book-now") return normalizedUrl;
          return normalizeHref(href, normalizedUrl);
        })
        .filter((href): href is string => Boolean(href)),
    );

    const likelyProfileApiEndpoint = discoverLikelyProfileApiEndpoint(apiHits);

    return {
      profileUrl: normalizedUrl,
      pageTitle: dom.pageTitle,
      professionalName: dom.professionalName,
      businessName: dom.businessName,
      phoneLinks: filterLinks(dom.phoneHrefs),
      emailLinks: filterLinks(dom.emailHrefs),
      websiteLinks: filterLinks(dom.websiteHrefs),
      instagramLinks: filterLinks(dom.instagramHrefs),
      facebookLinks: filterLinks(dom.facebookHrefs),
      bookingLinks,
      services: dom.services,
      bio: dom.bio,
      imageUrls: dedupeLinks(dom.imageUrls),
      visibleTextSample: dom.visibleTextSample.slice(0, VISIBLE_TEXT_LIMIT),
      fetchedAt,
      apiHitsCount: apiHits.length,
      likelyProfileApiEndpoint,
    };
  } catch (error) {
    const formatted = formatPlaywrightHarvestWarning(error);
    getPlaywrightRuntimeStatus(true).catch(() => undefined);
    return {
      ...base,
      apiHitsCount: apiHits.length,
      error: formatted.warning,
    };
  } finally {
    if (ownsBrowser) {
      await page?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    }
  }
}

export async function createSolaProfileBrowser(): Promise<{
  browser: Awaited<ReturnType<PlaywrightChromium["launch"]>>;
} | null> {
  const chromium = await loadPlaywrightChromium();
  if (!chromium) return null;
  const browser = await chromium.launch({ headless: true });
  return { browser };
}
