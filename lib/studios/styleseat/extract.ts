// lib/studios/styleseat/extract.ts
// Pulls StyleSeat operator listings via local discovery crawl or Apify web scraper.
// If STYLESEAT_MOCK=true, returns mock operators. Market search uses Apify when configured.
//
// StyleSeat search URL format:
//   https://www.styleseat.com/{category-slug}/{city-slug}--{state-slug}
//   e.g. https://www.styleseat.com/braiders/houston--tx

import type { StyleSeatOperator, StyleSeatCategory, StyleSeatRunConfig, StyleSeatCrawlResult } from "./types";
import { STYLESEAT_CATEGORY_SLUGS } from "./types";
import { extractEmbeddedStyleSeatData, extractScriptContents } from "./embedded-data";
import { extractStyleSeatViaInternalApi } from "./internal-api";
import fs from "node:fs/promises";
import path from "node:path";

const APIFY_BASE = "https://api.apify.com/v2";
const WAIT_FOR_FINISH_SECS = 55;
const DEFAULT_AGGREGATOR_URL = "https://www.styleseat.com/m/";
const DEBUG_ROOT = process.env.VERCEL
  ? "/tmp/studios-styleseat/debug"
  : path.join(process.cwd(), "runtime-data", "studios", "styleseat", "debug");
const AGGREGATOR_EMPTY_NOTE = "No profiles found from aggregator root. Try a direct search URL.";
const SUGGESTED_SEARCH_URLS = [
  "https://www.styleseat.com/m/search/denver-co/braids",
  "https://www.styleseat.com/m/search/houston-tx/hair",
  "https://www.styleseat.com/m/search/atlanta-ga/locs",
];
const BLOCKED_PATH_PARTS = [
  "/appointments", "/my-account", "/login", "/blog", "/about", "/terms", "/privacy",
  "/help", "/support", "/careers", "/download", "/pro", "/join",
];

// ─── URL builders ─────────────────────────────────────────────────────────────

function buildSearchUrl(category: StyleSeatCategory, market: string, state: string): string {
  const catSlug   = STYLESEAT_CATEGORY_SLUGS[category];
  const citySlug  = market.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const stateSlug = state.toLowerCase().replace(/[^a-z]+/g, "-");
  return `https://www.styleseat.com/${catSlug}/${citySlug}--${stateSlug}`;
}

function buildMarketplaceSearchUrl(category: StyleSeatCategory, market: string, state: string): string {
  const categorySlug = category === "hair" ? "hair-salons" : category;
  const citySlug = market.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const stateSlug = state.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  return `https://www.styleseat.com/m/search/${citySlug}-${stateSlug}/${categorySlug}`;
}

export function normalizeStyleSeatUrl(input: string): string {
  const url = new URL(input, DEFAULT_AGGREGATOR_URL);
  if (!/(\.|^)styleseat\.com$/i.test(url.hostname)) {
    throw new Error("Only styleseat.com URLs are supported");
  }
  url.protocol = "https:";
  url.hash = "";
  for (const key of Array.from(url.searchParams.keys())) {
    if (key.toLowerCase().startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
}

function classifyStyleSeatUrl(url: string): "profile" | "search" | "category" | "aggregator" | "unknown" {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  if (BLOCKED_PATH_PARTS.some((part) => pathname.toLowerCase().startsWith(part))) return "unknown";
  if (/^\/m\/search(?:\/|$)/i.test(pathname) || pathname.includes("/search/")) return "search";
  if (/^\/m\/?$/i.test(pathname)) return "aggregator";
  if (/^\/m\/[^/]+$/i.test(pathname)) return "profile";
  if (/^\/m\/(?:p|v|pro|provider)\/[^/]+$/i.test(pathname)) return "profile";
  if (Object.values(STYLESEAT_CATEGORY_SLUGS).some((slug) => pathname.includes(`/${slug}/`) || pathname === `/${slug}`)) return "category";
  return "unknown";
}

function classifyStyleSeatDebugUrl(url: string): "profile" | "search" | "category" | "booking" | "account" | "blog" | "legal" | "unknown" {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  const lower = pathname.toLowerCase();
  if (lower.includes("terms") || lower.includes("privacy") || lower.includes("legal")) return "legal";
  if (lower.includes("blog")) return "blog";
  if (lower.includes("appointment") || lower.includes("booking") || lower.includes("book")) return "booking";
  if (lower.includes("login") || lower.includes("my-account") || lower.includes("sign")) return "account";
  const kind = classifyStyleSeatUrl(url);
  if (kind === "aggregator") return "category";
  return kind === "profile" || kind === "search" || kind === "category" ? kind : "unknown";
}

function extractAnchorUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      urls.push(normalizeStyleSeatUrl(new URL(href, baseUrl).toString()));
    } catch {
      // non-StyleSeat URL
    }
  }
  const absoluteRe = /https?:\\?\/\\?\/(?:www\.)?styleseat\.com\\?\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+/gi;
  while ((match = absoluteRe.exec(html))) {
    const raw = match[0].replace(/\\\//g, "/").replace(/\\u002F/gi, "/");
    try {
      urls.push(normalizeStyleSeatUrl(raw));
    } catch {
      // non-StyleSeat URL
    }
  }
  return Array.from(new Set(urls));
}

function normalizeDebugUrl(raw: string, baseUrl: string): string | null {
  try {
    return normalizeStyleSeatUrl(new URL(raw, baseUrl).toString());
  } catch {
    return null;
  }
}

function extractRawInternalLinks(html: string, baseUrl: string): Array<{ raw: string; normalizedUrl: string | null; source: "anchor" | "script" | "text"; classification: string }> {
  const links: Array<{ raw: string; normalizedUrl: string | null; source: "anchor" | "script" | "text"; classification: string }> = [];
  const seen = new Set<string>();
  const add = (raw: string, source: "anchor" | "script" | "text") => {
    const normalizedUrl = normalizeDebugUrl(raw.replace(/\\\//g, "/").replace(/\\u002F/gi, "/"), baseUrl);
    if (!normalizedUrl) return;
    const key = `${source}:${normalizedUrl}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ raw, normalizedUrl, source, classification: classifyStyleSeatDebugUrl(normalizedUrl) });
  };
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    add(href, "anchor");
  }
  const scripts = extractScriptContents(html);
  for (const script of scripts) {
    const urlRe = /(https?:\\?\/\\?\/(?:www\.)?styleseat\.com\\?\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+|\/m\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+)/gi;
    while ((match = urlRe.exec(script.content))) add(match[1], "script");
  }
  const textHtml = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const textUrlRe = /(https?:\\?\/\\?\/(?:www\.)?styleseat\.com\\?\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+|\/m\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+)/gi;
  while ((match = textUrlRe.exec(textHtml))) add(match[1], "text");
  return links;
}

function likelyExtractionSource(input: {
  htmlLength: number;
  statusCode?: number;
  profileLikeLinkCount: number;
  embeddedCandidateCount: number;
  nextDataFound: boolean;
  nextFlightFound: boolean;
  nextFlightLinkCount: number;
  jsonLdCount: number;
  networkHintCount: number;
}): {
  source: "static_links" | "next_data" | "next_flight" | "json_ld" | "internal_api" | "rendered_dom_required" | "blocked_or_empty";
  recommendation: string;
} {
  if ((input.statusCode && input.statusCode >= 400) || input.htmlLength < 500) {
    return { source: "blocked_or_empty", recommendation: "URL returned no useful HTML." };
  }
  if (input.profileLikeLinkCount > 0) {
    return { source: "static_links", recommendation: "Parse static profile-like links from the listing HTML." };
  }
  if (input.nextDataFound && input.embeddedCandidateCount > 0) {
    return { source: "next_data", recommendation: "Parse __NEXT_DATA__ candidates." };
  }
  if (input.nextFlightFound && input.nextFlightLinkCount > 0) {
    return { source: "next_flight", recommendation: "Parse Next flight strings for profile URLs and operator text." };
  }
  if (input.jsonLdCount > 0 && input.embeddedCandidateCount > 0) {
    return { source: "json_ld", recommendation: "Parse JSON-LD profile candidates." };
  }
  if (input.networkHintCount > 0) {
    return { source: "internal_api", recommendation: "Investigate internal API hints." };
  }
  return { source: "rendered_dom_required", recommendation: "Install Playwright rendered fallback only if rendered DOM contains cards." };
}

function networkHintScriptIndex(scripts: ReturnType<typeof extractScriptContents>, index: number): number | undefined {
  let cursor = 0;
  for (let i = 0; i < scripts.length; i += 1) {
    const script = scripts[i];
    const start = cursor + script.attributes.length;
    const end = start + script.content.length;
    if (index >= start && index <= end) return i;
    cursor = end;
  }
  return undefined;
}

function collectNetworkHints(html: string): {
  counts: Record<string, number>;
  scriptSources: string[];
  urlLikeStrings: string[];
  hints: Array<{ matchedString: string; kind: string; index: number; sourceScriptIndex?: number; snippet: string }>;
} {
  const terms = [
    "graphql", "api", "fetch(", "xhr", "XMLHttpRequest", "relay", "apollo", "queryHash", "queryId",
    "search.styleseat.com", "professionals", "providers", "stylists", "searchResults", "marketplace", "booking",
  ];
  const hints: Array<{ matchedString: string; kind: string; index: number; sourceScriptIndex?: number; snippet: string }> = [];
  const counts: Record<string, number> = {};
  const scripts = extractScriptContents(html);
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    const matches = Array.from(html.matchAll(re));
    counts[term] = matches.length;
    for (const match of matches.slice(0, 12)) {
      const index = match.index ?? 0;
      hints.push({
        matchedString: match[0],
        kind: term,
        index,
        sourceScriptIndex: networkHintScriptIndex(scripts, index),
        snippet: html.slice(Math.max(0, index - 220), Math.min(html.length, index + 420)),
      });
    }
  }
  const scriptSources = scripts
    .flatMap((script) => {
      const match = script.attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      return match?.[1] ? [match[1]] : [];
    });
  const urlLikeStrings = Array.from(new Set(Array.from(html.matchAll(/["'`](https?:\\?\/\\?\/[^"'`]+|\/[^"'`\s]*(?:api|graphql|search|professionals|providers|marketplace|styleSeat|styleseat)[^"'`\s]*)["'`]/gi))
    .map((match) => match[1].replace(/\\\//g, "/").replace(/\\u002F/gi, "/")))).slice(0, 300);
  return { counts, scriptSources, urlLikeStrings, hints };
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveCategories(text: string, fallback: StyleSeatCategory[]): StyleSeatCategory[] {
  const lower = text.toLowerCase();
  const hits: StyleSeatCategory[] = [];
  const checks: Array<[StyleSeatCategory, string[]]> = [
    ["hair", ["hair", "silk press", "color", "stylist"]],
    ["braids", ["braid", "knotless", "protective style"]],
    ["barber", ["barber", "fade", "beard"]],
    ["locs", ["loc", "retwist", "starter loc"]],
    ["makeup", ["makeup", "mua", "glam"]],
    ["lashes", ["lash", "extensions"]],
    ["brows", ["brow", "lamination", "threading"]],
    ["nails", ["nail", "acrylic", "manicure"]],
    ["extensions", ["extensions", "weave", "sew-in"]],
  ];
  for (const [category, needles] of checks) {
    if (needles.some((needle) => lower.includes(needle))) hits.push(category);
  }
  return hits.length > 0 ? hits : fallback.length > 0 ? fallback : ["hair"];
}

function deriveLocation(text: string, fallbackCity: string, fallbackState: string): { city: string; state: string } {
  const match = text.match(/\b([A-Z][a-zA-Z .'-]{2,40}),\s*([A-Z]{2})\b/);
  return {
    city: match?.[1]?.trim() || fallbackCity,
    state: match?.[2]?.trim() || fallbackState,
  };
}

function operatorFromProfileHtml(
  profileUrl: string,
  html: string,
  config: StyleSeatRunConfig,
  idx: number,
  seedUrl: string,
  batch: string,
): StyleSeatOperator {
  const rawText = textFromHtml(html).slice(0, 5000);
  const pathParts = new URL(profileUrl).pathname.split("/").filter(Boolean);
  const slug = pathParts.at(-1) || `profile-${idx + 1}`;
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = textFromHtml(h1Match?.[1] || titleMatch?.[1] || slug.replace(/[-_]+/g, " "))
    .replace(/\s*\|\s*StyleSeat.*$/i, "")
    .replace(/\s*-\s*StyleSeat.*$/i, "")
    .trim() || slug;
  const location = deriveLocation(rawText, config.market, config.state);
  const categories = deriveCategories(rawText, config.categories);
  const reviewMatch = rawText.match(/\b([0-9][0-9,]*)\s+reviews?\b/i);
  const ratingMatch = rawText.match(/\b([0-5](?:\.[0-9])?)\s*(?:stars?|rating)\b/i);
  const imageCount = (html.match(/<img\b/gi) ?? []).length;

  return {
    styleseatId: `ss-${slug}-${idx}`,
    name,
    slug,
    styleseatUrl: profileUrl,
    city: location.city,
    state: location.state,
    categories,
    specialties: categories,
    bio: rawText.slice(0, 300) || null,
    services: categories.map((category) => ({ name: category, price: null, duration: null })),
    reviewCount: reviewMatch ? Number(reviewMatch[1].replace(/,/g, "")) : 0,
    rating: ratingMatch ? Number(ratingMatch[1]) : null,
    imageUrl: null,
    priceRange: null,
    isIndependent: true,
    harvestDate: new Date().toISOString().slice(0, 10),
    batchId: batch,
    discoveryMode: config.discoveryMode ?? "market_search",
    seedUrl,
    sourceUrl: profileUrl,
    rawText,
    imageCount,
    extractionSource: "static_links",
  };
}

type StyleSeatHtmlFetchResult = {
  html: string;
  statusCode: number;
  finalUrl: string;
  fetchedAt: string;
};

async function fetchHtmlWithMeta(url: string): Promise<StyleSeatHtmlFetchResult> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIH StyleSeat Discovery/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return {
    html: await res.text(),
    statusCode: res.status,
    finalUrl: res.url || url,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchHtml(url: string): Promise<string> {
  return (await fetchHtmlWithMeta(url)).html;
}

function collectInternalStyleSeatHrefs(urls: string[]): string[] {
  return Array.from(new Set(urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return /(\.|^)styleseat\.com$/i.test(parsed.hostname);
    } catch {
      return false;
    }
  })));
}

function getRunDebugDir(runId?: string): string | null {
  return runId ? path.join(DEBUG_ROOT, runId) : null;
}

async function saveExtractionDiagnostics(input: {
  runId?: string;
  url: string;
  html: string;
  pageLinks: string[];
  statusCode?: number;
  finalUrl?: string;
  fetchedAt?: string;
  force?: boolean;
}): Promise<{
  diagnosticsDir?: string;
  rawHtmlPath?: string;
  scriptsIndexPath?: string;
  embeddedJsonPath?: string;
  jsonLdPath?: string;
  allInternalLinksPath?: string;
  internalLinksPath?: string;
  urlClassificationPath?: string;
  networkHintsPath?: string;
  extractionReportPath?: string;
  embeddedDataCount: number;
  jsonScriptCount: number;
  jsonLdCount: number;
  nextDataFound: boolean;
  nextFlightFound: boolean;
  candidateObjectCount: number;
  networkHintCount: number;
  internalLinkCount: number;
  profileLinkCount: number;
  profileLikeLinkCount: number;
  embeddedCandidateCount: number;
  likelyExtractionSource: "static_links" | "next_data" | "next_flight" | "json_ld" | "internal_api" | "rendered_dom_required" | "blocked_or_empty";
  recommendation: string;
  hasUsableStaticLinks: boolean;
  hasEmbeddedData: boolean;
  hasNetworkHints: boolean;
}> {
  const embeddedData = extractEmbeddedStyleSeatData(input.html);
  const allLinks = extractRawInternalLinks(input.html, input.url);
  const classifications = allLinks;
  const networkHints = collectNetworkHints(input.html);
  const profileLinkCount = classifications.filter((link) => link.classification === "profile").length;
  const networkHintCount = networkHints.hints.length + networkHints.urlLikeStrings.length;
  const sourceGuess = likelyExtractionSource({
    htmlLength: input.html.length,
    statusCode: input.statusCode,
    profileLikeLinkCount: profileLinkCount,
    embeddedCandidateCount: embeddedData.candidateObjects.length,
    nextDataFound: embeddedData.nextDataFound,
    nextFlightFound: embeddedData.nextFlightFound,
    nextFlightLinkCount: embeddedData.nextFlight.links.length,
    jsonLdCount: embeddedData.jsonLd.length,
    networkHintCount,
  });
  const createdAt = new Date().toISOString();
  const extractionReport = {
    runId: input.runId,
    url: input.url,
    finalUrl: input.finalUrl ?? input.url,
    createdAt,
    fetchedAt: input.fetchedAt ?? createdAt,
    statusCode: input.statusCode,
    htmlLength: input.html.length,
    staticAnchorCount: input.pageLinks.length,
    internalStyleSeatLinkCount: classifications.length,
    profileLikeLinkCount: profileLinkCount,
    jsonScriptCount: embeddedData.embeddedJson.length,
    jsonLdCount: embeddedData.jsonLd.length,
    nextDataFound: embeddedData.nextDataFound,
    nextFlightFound: embeddedData.nextFlightFound,
    embeddedCandidateCount: embeddedData.candidateObjects.length,
    networkHintCount,
    likelyExtractionSource: sourceGuess.source,
    recommendation: sourceGuess.recommendation,
    debugArtifactPath: getRunDebugDir(input.runId) ?? undefined,
  };
  const result = {
    embeddedDataCount: embeddedData.embeddedJson.length + embeddedData.jsonLd.length,
    jsonScriptCount: embeddedData.embeddedJson.length,
    jsonLdCount: embeddedData.jsonLd.length,
    nextDataFound: embeddedData.nextDataFound,
    nextFlightFound: embeddedData.nextFlightFound,
    candidateObjectCount: embeddedData.candidateObjects.length,
    networkHintCount,
    internalLinkCount: classifications.length,
    profileLinkCount,
    profileLikeLinkCount: profileLinkCount,
    embeddedCandidateCount: embeddedData.candidateObjects.length,
    likelyExtractionSource: sourceGuess.source,
    recommendation: sourceGuess.recommendation,
    hasUsableStaticLinks: profileLinkCount > 0,
    hasEmbeddedData: embeddedData.candidateObjects.length > 0,
    hasNetworkHints: networkHints.hints.length > 0,
  };
  const dir = getRunDebugDir(input.runId);
  if (!dir || (!input.force && result.hasUsableStaticLinks)) return result;

  await fs.mkdir(dir, { recursive: true });
  const rawHtmlPath = path.join(dir, "raw.html");
  const scriptsIndexPath = path.join(dir, "scripts-index.json");
  const embeddedJsonPath = path.join(dir, "embedded-json.json");
  const jsonLdPath = path.join(dir, "json-ld.json");
  const internalLinksPath = path.join(dir, "internal-links.json");
  const allInternalLinksPath = internalLinksPath;
  const urlClassificationPath = path.join(dir, "url-classification.json");
  const networkHintsPath = path.join(dir, "network-hints.json");
  const extractionReportPath = path.join(dir, "extraction-report.json");

  await fs.writeFile(rawHtmlPath, input.html, "utf8");
  await fs.writeFile(scriptsIndexPath, JSON.stringify(embeddedData.scriptsIndex, null, 2), "utf8");
  await fs.writeFile(embeddedJsonPath, JSON.stringify({
    nextDataFound: embeddedData.nextDataFound,
    nextFlightFound: embeddedData.nextFlightFound,
    embeddedJson: embeddedData.embeddedJson,
    candidateObjects: embeddedData.candidateObjects,
    nextFlight: embeddedData.nextFlight,
  }, null, 2), "utf8");
  await fs.writeFile(jsonLdPath, JSON.stringify(embeddedData.jsonLd, null, 2), "utf8");
  await fs.writeFile(internalLinksPath, JSON.stringify(classifications, null, 2), "utf8");
  await fs.writeFile(urlClassificationPath, JSON.stringify({
    sourceUrl: input.url,
    totals: {
      allInternalLinks: classifications.length,
      profile: classifications.filter((link) => link.classification === "profile").length,
      search: classifications.filter((link) => link.classification === "search").length,
      category: classifications.filter((link) => link.classification === "category").length,
      booking: classifications.filter((link) => link.classification === "booking").length,
      account: classifications.filter((link) => link.classification === "account").length,
      blog: classifications.filter((link) => link.classification === "blog").length,
      legal: classifications.filter((link) => link.classification === "legal").length,
      unknown: classifications.filter((link) => link.classification === "unknown").length,
    },
    links: classifications,
  }, null, 2), "utf8");
  await fs.writeFile(networkHintsPath, JSON.stringify(networkHints, null, 2), "utf8");
  await fs.writeFile(extractionReportPath, JSON.stringify(extractionReport, null, 2), "utf8");

  return {
    ...result,
    diagnosticsDir: dir,
    rawHtmlPath,
    scriptsIndexPath,
    embeddedJsonPath,
    jsonLdPath,
    allInternalLinksPath,
    internalLinksPath,
    urlClassificationPath,
    networkHintsPath,
    extractionReportPath,
  };
}

async function saveRenderedDebugSnapshot(input: {
  runId?: string;
  html: string;
  debug: {
    staticAnchorCount: number;
    renderedAnchorCount: number;
    firstInternalHrefs: string[];
    notes: string[];
    suggestedUrls: string[];
  };
}): Promise<{ renderedHtmlPath?: string; debugJsonPath?: string }> {
  const dir = getRunDebugDir(input.runId);
  if (!dir) return {};
  await fs.mkdir(dir, { recursive: true });
  const htmlPath = path.join(dir, "rendered.html");
  const jsonPath = path.join(dir, "render-debug.json");
  await fs.writeFile(htmlPath, input.html, "utf8");
  await fs.writeFile(jsonPath, JSON.stringify(input.debug, null, 2), "utf8");
  return { renderedHtmlPath: htmlPath, debugJsonPath: jsonPath };
}

export async function crawlStyleSeatRenderedPage(url: string, runId?: string): Promise<{
  html: string;
  hrefs: string[];
  renderedLinksPath?: string;
  screenshotPath?: string;
  error?: string;
}> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{
      chromium?: {
        launch(options?: Record<string, unknown>): Promise<{
          newPage(): Promise<{
            goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
            waitForSelector(selector: string, options?: Record<string, unknown>): Promise<unknown>;
            $$eval<T>(selector: string, pageFunction: (elements: Element[]) => T): Promise<T>;
            content(): Promise<string>;
            screenshot(options?: Record<string, unknown>): Promise<Buffer>;
          }>;
          close(): Promise<void>;
        }>;
      };
    }>;
    const playwright = await dynamicImport("playwright");
    if (!playwright.chromium) {
      return { html: "", hrefs: [], error: "Playwright chromium is unavailable" };
    }
    const browser = await playwright.chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForSelector("a[href*='/m/'], a[href*='styleseat.com/m/']", { timeout: 10_000 }).catch(() => undefined);
      const hrefs = await page.$$eval("a[href]", (anchors) =>
        anchors
          .map((anchor) => anchor.getAttribute("href") ?? "")
          .filter(Boolean)
      );
      const html = await page.content();
      let renderedLinksPath: string | undefined;
      let screenshotPath: string | undefined;
      const dir = getRunDebugDir(runId);
      if (dir) {
        await fs.mkdir(dir, { recursive: true });
        renderedLinksPath = path.join(dir, "rendered-links.json");
        screenshotPath = path.join(dir, "screenshot.png");
        await fs.writeFile(renderedLinksPath, JSON.stringify(hrefs, null, 2), "utf8");
        await fs.writeFile(screenshotPath, await page.screenshot({ fullPage: true }));
      }
      return { html, hrefs, renderedLinksPath, screenshotPath };
    } finally {
      await browser.close();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { html: "", hrefs: [], error: `Rendered extraction unavailable: ${msg}` };
  }
}

export async function crawlStyleSeatDiscovery(input: {
  startUrl: string;
  crawlDepth: number;
  maxOperators: number;
  categories: StyleSeatCategory[];
  discoveryMode?: StyleSeatRunConfig["discoveryMode"];
  runId?: string;
  config: StyleSeatRunConfig;
}): Promise<StyleSeatCrawlResult> {
  const seedUrl = normalizeStyleSeatUrl(input.startUrl || DEFAULT_AGGREGATOR_URL);
  const queue: Array<{ url: string; depth: number }> = [{ url: seedUrl, depth: 0 }];
  const seen = new Set<string>();
  const crawledUrls: string[] = [];
  const profileUrls: string[] = [];
  const rejectedUrls: string[] = [];
  const discoveredMarkets = new Set<string>();
  const discoveredCategories = new Set<string>();
  const apiOperators: StyleSeatOperator[] = [];
  let staticAnchorCount = 0;
  let renderedAnchorCount = 0;
  let renderedHtml = "";
  let renderedHtmlPath: string | undefined;
  let debugJsonPath: string | undefined;
  let diagnosticsDir: string | undefined;
  let rawHtmlPath: string | undefined;
  let scriptsIndexPath: string | undefined;
  let embeddedJsonPath: string | undefined;
  let jsonLdPath: string | undefined;
  let allInternalLinksPath: string | undefined;
  let internalLinksPath: string | undefined;
  let urlClassificationPath: string | undefined;
  let networkHintsPath: string | undefined;
  let extractionReportPath: string | undefined;
  let embeddedDataCount = 0;
  let jsonScriptCount = 0;
  let jsonLdCount = 0;
  let candidateObjectCount = 0;
  let networkHintCount = 0;
  let nextDataFound = false;
  let nextFlightFound = false;
  let internalLinkCount = 0;
  let profileLinkCount = 0;
  let profileLikeLinkCount = 0;
  let embeddedCandidateCount = 0;
  let detectedLikelyExtractionSource: "static_links" | "next_data" | "next_flight" | "json_ld" | "internal_api" | "rendered_dom_required" | "blocked_or_empty" | undefined;
  let detectedRecommendation: string | undefined;
  let extractionSource: "internal_api" | "static_links" | "embedded_json" | "none" = "none";
  let searchApiUrl: string | undefined;
  let searchApiResponsePath: string | undefined;
  let searchApiResultCount = 0;
  let internalApiDebugPath: string | undefined;
  const internalApiUrlsTried: string[] = [];
  const internalApiUrlsSucceeded: string[] = [];
  const internalApiUrlsFailed: Array<{ url: string; status?: number; error?: string }> = [];
  let internalApiRecords = 0;
  const firstInternalHrefs: string[] = [];
  const debugNotes: string[] = [];

  while (queue.length > 0 && profileUrls.length < input.maxOperators) {
    const next = queue.shift()!;
    if (seen.has(next.url)) continue;
    seen.add(next.url);

    const kind = classifyStyleSeatUrl(next.url);
    if (kind === "unknown") {
      rejectedUrls.push(next.url);
      continue;
    }
    if (kind === "profile") {
      profileUrls.push(next.url);
      continue;
    }
    if (next.depth > input.crawlDepth) continue;

    if (kind === "search") {
      const apiResult = await extractStyleSeatViaInternalApi({
        sourceUrl: next.url,
        city: input.config.market,
        state: input.config.state,
        categories: input.config.categories,
        maxOperators: input.maxOperators - profileUrls.length,
        debug: input.config.debug,
        runId: input.config.runId,
        discoveryMode: input.config.discoveryMode,
      });
      internalApiUrlsTried.push(...apiResult.apiUrlsTried);
      internalApiUrlsSucceeded.push(...apiResult.apiUrlsSucceeded);
      internalApiUrlsFailed.push(...apiResult.apiUrlsFailed);
      internalApiRecords += apiResult.records.length;
      internalApiDebugPath = apiResult.diagnostics.debugArtifactPath ?? internalApiDebugPath;
      searchApiUrl = apiResult.apiUrlsSucceeded[0] ?? apiResult.apiUrlsTried[0] ?? searchApiUrl;
      searchApiResponsePath = internalApiDebugPath ?? searchApiResponsePath;
      searchApiResultCount += apiResult.records.length;
      for (const operator of apiResult.records) {
        if (profileUrls.length >= input.maxOperators) break;
        if (!profileUrls.includes(operator.styleseatUrl)) {
          apiOperators.push(operator);
          profileUrls.push(operator.styleseatUrl);
        }
      }
      if (apiResult.records.length > 0) {
        extractionSource = "internal_api";
        crawledUrls.push(next.url);
        for (const operator of apiResult.records) {
          if (operator.city && operator.state) discoveredMarkets.add(`${operator.city}, ${operator.state}`);
          for (const category of operator.categories) discoveredCategories.add(category);
        }
        continue;
      }
      if (apiResult.apiUrlsFailed.length > 0) {
        debugNotes.push(`Internal API returned 0 records for ${next.url}`);
      }
    }

    let html = "";
    let htmlFetch: StyleSeatHtmlFetchResult | null = null;
    try {
      htmlFetch = await fetchHtmlWithMeta(next.url);
      html = htmlFetch.html;
      crawledUrls.push(next.url);
    } catch {
      rejectedUrls.push(next.url);
      continue;
    }

    let pageLinks = extractAnchorUrls(html, next.url);
    const staticLinks = pageLinks;
    staticAnchorCount += staticLinks.length;

    const hasStaticProfiles = staticLinks.some((url) => classifyStyleSeatUrl(url) === "profile");
    const diagnostics = await saveExtractionDiagnostics({
      runId: input.runId,
      url: next.url,
      html,
      pageLinks,
      statusCode: htmlFetch?.statusCode,
      finalUrl: htmlFetch?.finalUrl,
      fetchedAt: htmlFetch?.fetchedAt,
      force: input.config.debug,
    }).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      debugNotes.push(`Failed to save extraction diagnostics: ${msg}`);
      return null;
    });
    if (diagnostics) {
      diagnosticsDir = diagnostics.diagnosticsDir ?? diagnosticsDir;
      rawHtmlPath = diagnostics.rawHtmlPath ?? rawHtmlPath;
      scriptsIndexPath = diagnostics.scriptsIndexPath ?? scriptsIndexPath;
      embeddedJsonPath = diagnostics.embeddedJsonPath ?? embeddedJsonPath;
      jsonLdPath = diagnostics.jsonLdPath ?? jsonLdPath;
      allInternalLinksPath = diagnostics.allInternalLinksPath ?? allInternalLinksPath;
      internalLinksPath = diagnostics.internalLinksPath ?? internalLinksPath;
      urlClassificationPath = diagnostics.urlClassificationPath ?? urlClassificationPath;
      networkHintsPath = diagnostics.networkHintsPath ?? networkHintsPath;
      extractionReportPath = diagnostics.extractionReportPath ?? extractionReportPath;
      embeddedDataCount += diagnostics.embeddedDataCount;
      jsonScriptCount += diagnostics.jsonScriptCount;
      jsonLdCount += diagnostics.jsonLdCount;
      candidateObjectCount += diagnostics.candidateObjectCount;
      networkHintCount += diagnostics.networkHintCount;
      nextDataFound = nextDataFound || diagnostics.nextDataFound;
      nextFlightFound = nextFlightFound || diagnostics.nextFlightFound;
      internalLinkCount += diagnostics.internalLinkCount;
      profileLinkCount += diagnostics.profileLinkCount;
      profileLikeLinkCount += diagnostics.profileLikeLinkCount;
      embeddedCandidateCount += diagnostics.embeddedCandidateCount;
      detectedLikelyExtractionSource = diagnostics.likelyExtractionSource;
      detectedRecommendation = diagnostics.recommendation;
    }
    if (hasStaticProfiles) extractionSource = "static_links";

    const hasProfilesAfterApi = pageLinks.some((url) => classifyStyleSeatUrl(url) === "profile") || profileUrls.length > 0;
    const needsRenderedFallback = !hasProfilesAfterApi
      && ["search", "category", "aggregator"].includes(kind)
      && !diagnostics?.hasEmbeddedData
      && !diagnostics?.hasUsableStaticLinks
      && process.env.STYLESEAT_ENABLE_RENDERED_FALLBACK === "true";
    if (!hasProfilesAfterApi && ["search", "category", "aggregator"].includes(kind) && process.env.STYLESEAT_ENABLE_RENDERED_FALLBACK !== "true") {
      debugNotes.push("Rendered DOM fallback skipped; set STYLESEAT_ENABLE_RENDERED_FALLBACK=true after diagnostics prove browser rendering is required.");
    }
    if (needsRenderedFallback) {
      const rendered = await crawlStyleSeatRenderedPage(next.url, input.runId);
      if (rendered.error) debugNotes.push(rendered.error);
      renderedHtml = rendered.html || html;
      const renderedUrls = rendered.hrefs.flatMap((href) => {
        try {
          return [normalizeStyleSeatUrl(new URL(href, next.url).toString())];
        } catch {
          return [];
        }
      });
      renderedAnchorCount += renderedUrls.length;
      pageLinks = Array.from(new Set([...staticLinks, ...renderedUrls, ...extractAnchorUrls(rendered.html, next.url)]));
      if (renderedUrls.some((url) => classifyStyleSeatUrl(url) === "profile")) extractionSource = "static_links";
    }

    for (const href of collectInternalStyleSeatHrefs(pageLinks)) {
      if (firstInternalHrefs.length >= 50) break;
      firstInternalHrefs.push(href);
    }

    const pageText = textFromHtml(`${html} ${renderedHtml}`);
    const location = deriveLocation(pageText, "", "");
    if (location.city && location.state) discoveredMarkets.add(`${location.city}, ${location.state}`);
    for (const category of deriveCategories(pageText, input.categories)) discoveredCategories.add(category);

    for (const url of pageLinks) {
      const urlKind = classifyStyleSeatUrl(url);
      if (urlKind === "profile" && profileUrls.length < input.maxOperators && !profileUrls.includes(url)) {
        profileUrls.push(url);
      } else if (["search", "category", "aggregator"].includes(urlKind) && next.depth + 1 <= input.crawlDepth && !seen.has(url)) {
        queue.push({ url, depth: next.depth + 1 });
      } else if (urlKind === "unknown") {
        rejectedUrls.push(url);
      }
    }
  }

  if (input.discoveryMode === "aggregator_crawl" && profileUrls.length === 0) {
    debugNotes.push(AGGREGATOR_EMPTY_NOTE);
  }

  for (const operator of apiOperators) {
    if (operator.city && operator.state) discoveredMarkets.add(`${operator.city}, ${operator.state}`);
    for (const category of operator.categories) discoveredCategories.add(category);
  }

  if (profileUrls.length === 0 && renderedHtml) {
    try {
      const saved = await saveRenderedDebugSnapshot({
        runId: input.runId,
        html: renderedHtml,
        debug: {
          staticAnchorCount,
          renderedAnchorCount,
          firstInternalHrefs: Array.from(new Set(firstInternalHrefs)).slice(0, 50),
          notes: debugNotes,
          suggestedUrls: SUGGESTED_SEARCH_URLS,
        },
      });
      renderedHtmlPath = saved.renderedHtmlPath;
      debugJsonPath = saved.debugJsonPath;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      debugNotes.push(`Failed to save rendered debug snapshot: ${msg}`);
    }
  }

  return {
    seedUrls: [seedUrl],
    crawledUrls: Array.from(new Set(crawledUrls)),
    profileUrls: Array.from(new Set(profileUrls)).slice(0, input.maxOperators),
    rejectedUrls: Array.from(new Set(rejectedUrls)).slice(0, 200),
    discoveredMarkets: Array.from(discoveredMarkets),
    discoveredCategories: Array.from(discoveredCategories),
    apiOperators,
    debug: {
      staticAnchorCount,
      renderedAnchorCount,
      firstInternalHrefs: Array.from(new Set(firstInternalHrefs)).slice(0, 50),
      renderedHtmlPath,
      debugJsonPath,
      diagnosticsDir,
      rawHtmlPath,
      scriptsIndexPath,
      embeddedJsonPath,
      jsonLdPath,
      allInternalLinksPath,
      internalLinksPath,
      urlClassificationPath,
      networkHintsPath,
      extractionReportPath,
      extractionSource,
      embeddedDataCount,
      jsonScriptCount,
      jsonLdCount,
      nextDataFound,
      nextFlightFound,
      candidateObjectCount,
      embeddedCandidateCount,
      networkHintCount,
      internalLinkCount,
      profileLinkCount,
      profileLikeLinkCount,
      likelyExtractionSource: detectedLikelyExtractionSource,
      recommendation: detectedRecommendation,
      searchApiUrl,
      searchApiResultCount,
      searchApiResponsePath,
      internalApiUrlsTried: Array.from(new Set(internalApiUrlsTried)),
      internalApiUrlsSucceeded: Array.from(new Set(internalApiUrlsSucceeded)),
      internalApiUrlsFailed,
      internalApiRecords,
      internalApiDebugPath,
      notes: debugNotes,
      suggestedUrls: SUGGESTED_SEARCH_URLS,
    },
  };
}

// ─── Apify helpers (mirrors apify-client.ts pattern) ─────────────────────────

function apifyUrl(path: string, token: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${APIFY_BASE}${path}${sep}token=${encodeURIComponent(token)}`;
}

async function apifyFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
}

// ─── PageFunction (runs inside Apify's headless browser) ─────────────────────
// Extracts operator cards from StyleSeat listing pages.
// StyleSeat renders via React; Apify's web-scraper uses Puppeteer.

const PAGE_FUNCTION = /* javascript */ `
async function pageFunction(context) {
  const { page, request, log } = context;

  // Wait for pro cards to render
  try {
    await page.waitForSelector('[data-test="pro-name"], .pro-card, [class*="ProCard"], h2, h3', { timeout: 8000 });
  } catch (e) {
    log.warning("Selector not found — page may have changed layout");
  }

  const html = await page.content();

  // Try to extract from JSON-LD (most reliable)
  const jsonLdMatches = html.match(/<script type="application\\/ld\\+json"[^>]*>([\\s\\S]*?)<\\/script>/gi) || [];
  const ldPersons = [];
  for (const block of jsonLdMatches) {
    try {
      const inner = block.replace(/<script[^>]*>/, "").replace(/<\\/script>/, "");
      const parsed = JSON.parse(inner);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item["@type"] === "Person" || item["@type"] === "LocalBusiness") {
          ldPersons.push(item);
        }
      }
    } catch (e) {}
  }

  const results = [];
  const sourceUrl = request.url;

  // Extract from JSON-LD
  for (const person of ldPersons.slice(0, 30)) {
    const name = person.name || person.givenName || "";
    const slug = (person.url || "").split("/m/")[1]?.split("?")[0] || "";
    if (!name || !slug) continue;
    const address = person.address || {};
    results.push({
      name: name.trim(),
      slug: slug.trim(),
      styleseatUrl: "https://www.styleseat.com/m/" + slug,
      city: address.addressLocality || "",
      state: address.addressRegion || "",
      bio: person.description || null,
      reviewCount: person.aggregateRating?.reviewCount || 0,
      rating: person.aggregateRating?.ratingValue || null,
      imageUrl: person.image?.url || person.image || null,
      specialties: person.knowsAbout || [],
      sourceUrl,
    });
  }

  // Fallback: DOM extraction if JSON-LD empty
  if (results.length === 0) {
    const cards = await page.$$('[data-pro-slug], [data-test="pro-card"], [class*="pro-card"], [class*="ProCard"]');
    for (const card of cards.slice(0, 30)) {
      try {
        const name = await card.$eval('[data-test="pro-name"], [class*="pro-name"], h2, h3', el => el.textContent?.trim() || "").catch(() => "");
        const href = await card.$eval("a[href*='/m/']", el => el.getAttribute("href") || "").catch(() => "");
        const slug = href.split("/m/")[1]?.split("?")[0] || "";
        const reviewText = await card.$eval('[data-test="review-count"], [class*="review"]', el => el.textContent?.trim() || "0").catch(() => "0");
        const reviewCount = parseInt(reviewText.replace(/[^0-9]/g, "")) || 0;
        const ratingText = await card.$eval('[class*="rating"], [class*="star"]', el => el.getAttribute("aria-label") || el.textContent?.trim() || "").catch(() => "");
        const rating = parseFloat(ratingText.replace(/[^0-9.]/g, "")) || null;
        const imageUrl = await card.$eval("img", el => el.getAttribute("src") || null).catch(() => null);

        if (name && slug) {
          results.push({
            name, slug,
            styleseatUrl: "https://www.styleseat.com/m/" + slug,
            city: "", state: "", bio: null,
            reviewCount, rating, imageUrl,
            specialties: [],
            sourceUrl,
          });
        }
      } catch (e) {}
    }
  }

  return results;
}
`;

// ─── Main extract function ────────────────────────────────────────────────────

export interface StyleSeatExtractResult {
  operators: StyleSeatOperator[];
  actorRunId: string | null;
  error: string | null;
  crawl?: StyleSeatCrawlResult | null;
}

export async function runStyleSeatHarvest(
  config: StyleSeatRunConfig,
): Promise<StyleSeatExtractResult> {
  const discoveryMode = config.discoveryMode ?? "market_search";
  const maxOperators = config.maxOperators ?? config.maxResults;
  const crawlDepth = config.crawlDepth ?? 2;

  // Dev mock mode
  if (process.env.STYLESEAT_MOCK === "true") {
    const reason = "STYLESEAT_MOCK=true - mock operators returned";
    console.warn(`[styleseat/extract] ${reason}`);
    return {
      operators: generateMockOperators({ ...config, maxResults: maxOperators }),
      actorRunId: null,
      error: reason,
      crawl: mockCrawl(config),
    };
  }

  if (discoveryMode === "aggregator_crawl" || discoveryMode === "direct_url") {
    const startUrl = config.sourceUrl || DEFAULT_AGGREGATOR_URL;
    let crawl: StyleSeatCrawlResult;
    try {
      crawl = await crawlStyleSeatDiscovery({
        startUrl,
        crawlDepth,
        maxOperators,
        categories: config.categories,
        discoveryMode,
        runId: config.runId,
        config,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { operators: [], actorRunId: null, error: `StyleSeat crawl failed: ${msg}`, crawl: null };
    }

    const batch = `styleseat-crawl-${Date.now()}`;
    const operators: StyleSeatOperator[] = [...(crawl.apiOperators ?? [])].slice(0, maxOperators);
    for (const profileUrl of crawl.profileUrls.slice(0, maxOperators)) {
      if (operators.some((operator) => operator.styleseatUrl === profileUrl)) continue;
      try {
        const html = await fetchHtml(profileUrl);
        operators.push(operatorFromProfileHtml(profileUrl, html, config, operators.length, crawl.seedUrls[0], batch));
      } catch {
        // keep crawling results inspectable even if one profile fails
      }
    }

    return {
      operators,
      actorRunId: null,
      error: operators.length === 0
        ? discoveryMode === "aggregator_crawl"
          ? `${AGGREGATOR_EMPTY_NOTE} Examples: ${SUGGESTED_SEARCH_URLS.join(", ")}`
          : "StyleSeat crawl found no extractable profiles"
        : null,
      crawl,
    };
  }

  if (discoveryMode === "market_search" && config.market && config.state) {
    const operators: StyleSeatOperator[] = [];
    const crawls: StyleSeatCrawlResult[] = [];
    for (const category of config.categories.length > 0 ? config.categories : ["hair" as StyleSeatCategory]) {
      if (operators.length >= maxOperators) break;
      const crawl = await crawlStyleSeatDiscovery({
        startUrl: buildMarketplaceSearchUrl(category, config.market, config.state),
        crawlDepth,
        maxOperators: maxOperators - operators.length,
        categories: [category],
        discoveryMode,
        runId: config.runId,
        config: { ...config, categories: [category], maxOperators: maxOperators - operators.length },
      });
      crawls.push(crawl);
      for (const operator of crawl.apiOperators ?? []) {
        if (operators.length >= maxOperators) break;
        if (!operators.some((existing) => existing.styleseatUrl === operator.styleseatUrl)) {
          operators.push(operator);
        }
      }
    }
    if (operators.length > 0 || config.debug) {
      const crawl: StyleSeatCrawlResult = {
        seedUrls: Array.from(new Set(crawls.flatMap((item) => item.seedUrls))),
        crawledUrls: Array.from(new Set(crawls.flatMap((item) => item.crawledUrls))),
        profileUrls: Array.from(new Set(crawls.flatMap((item) => item.profileUrls))).slice(0, maxOperators),
        rejectedUrls: Array.from(new Set(crawls.flatMap((item) => item.rejectedUrls))).slice(0, 200),
        discoveredMarkets: Array.from(new Set(crawls.flatMap((item) => item.discoveredMarkets))),
        discoveredCategories: Array.from(new Set(crawls.flatMap((item) => item.discoveredCategories))),
        apiOperators: operators,
        debug: crawls.find((item) => item.debug?.extractionSource === "internal_api")?.debug ?? crawls[0]?.debug,
      };
      return {
        operators,
        actorRunId: null,
        error: operators.length === 0 ? "StyleSeat internal API found no market search records" : null,
        crawl,
      };
    }
  }

  if (!process.env.APIFY_TOKEN) {
    const reason = "APIFY_TOKEN not set - mock operators returned for market_search";
    console.warn(`[styleseat/extract] ${reason}`);
    return {
      operators: generateMockOperators({ ...config, maxResults: maxOperators }),
      actorRunId: null,
      error: reason,
      crawl: mockCrawl(config),
    };
  }

  const token = process.env.APIFY_TOKEN!;

  const startUrls = config.categories.map((cat) => ({
    url: buildSearchUrl(cat, config.market, config.state),
    metadata: { category: cat },
  }));

  const runPayload = {
    startUrls,
    pageFunction: PAGE_FUNCTION,
    maxRequestsPerCrawl: Math.max(config.categories.length * 3, 10),
    maxConcurrency: 2,
    waitUntil: "networkidle2",
  };

  // Start Apify web-scraper run
  let runRes: Response;
  try {
    runRes = await apifyFetch(
      apifyUrl(`/acts/apify~web-scraper/runs?waitForFinish=${WAIT_FOR_FINISH_SECS}`, token),
      { method: "POST", body: JSON.stringify(runPayload) },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[styleseat/extract] Apify network error:", msg);
    return { operators: generateMockOperators(config), actorRunId: null, error: `Apify network error: ${msg}` };
  }

  if (!runRes.ok) {
    const text = await runRes.text().catch(() => "");
    console.error(`[styleseat/extract] Apify HTTP ${runRes.status}:`, text.slice(0, 200));
    return {
      operators: generateMockOperators(config),
      actorRunId: null,
      error: `Apify HTTP ${runRes.status}: ${text.slice(0, 120)}`,
    };
  }

  const runData = await runRes.json() as { data?: { id: string; status: string; defaultDatasetId: string } };
  const runId = runData.data?.id;
  const datasetId = runData.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    return { operators: generateMockOperators(config), actorRunId: null, error: "Apify: unexpected run response shape" };
  }

  // Fetch dataset items
  const datasetRes = await apifyFetch(
    apifyUrl(`/datasets/${datasetId}/items?limit=${config.maxResults * config.categories.length * 2}&clean=true`, token),
  );

  if (!datasetRes.ok) {
    return { operators: generateMockOperators(config), actorRunId: runId, error: `Apify dataset fetch HTTP ${datasetRes.status}` };
  }

  const rawItems = await datasetRes.json() as Record<string, unknown>[];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { operators: generateMockOperators(config), actorRunId: runId, error: "Apify returned 0 items — check search URLs and page function" };
  }

  const now   = new Date().toISOString().slice(0, 10);
  const batch = `styleseat-batch-${Date.now()}`;

  const operators: StyleSeatOperator[] = rawItems
    .slice(0, maxOperators)
    .map((item, idx): StyleSeatOperator | null => {
      const name = String(item.name ?? "").trim();
      const slug = String(item.slug ?? "").trim();
      if (!name || !slug) return null;

      // Infer category from source URL
      const sourceUrl = String(item.sourceUrl ?? "");
      const category = config.categories.find((c) => sourceUrl.includes(STYLESEAT_CATEGORY_SLUGS[c]))
        ?? config.categories[idx % config.categories.length];

      return {
        styleseatId:  `ss-${slug}-${idx}`,
        name,
        slug,
        styleseatUrl: String(item.styleseatUrl ?? `https://www.styleseat.com/m/${slug}`),
        city:  String(item.city  ?? config.market),
        state: String(item.state ?? config.state),
        categories:  [category],
        specialties: Array.isArray(item.specialties) ? item.specialties.map(String) : [],
        bio:         item.bio ? String(item.bio).slice(0, 300) : null,
        services:    [],
        reviewCount: Number(item.reviewCount ?? 0),
        rating:      item.rating != null ? Number(item.rating) : null,
        imageUrl:    item.imageUrl ? String(item.imageUrl) : null,
        priceRange:  null,
        isIndependent: true,
        harvestDate: now,
        batchId:     batch,
        discoveryMode,
        seedUrl: sourceUrl,
        sourceUrl,
        rawText: String(item.bio ?? ""),
        imageCount: item.imageUrl ? 1 : 0,
      };
    })
    .filter((op): op is StyleSeatOperator => op !== null);

  return {
    operators,
    actorRunId: runId,
    error: null,
    crawl: {
      seedUrls: startUrls.map((s) => s.url),
      crawledUrls: startUrls.map((s) => s.url),
      profileUrls: operators.map((op) => op.styleseatUrl),
      rejectedUrls: [],
      discoveredMarkets: Array.from(new Set(operators.map((op) => `${op.city}, ${op.state}`))),
      discoveredCategories: Array.from(new Set(operators.flatMap((op) => op.categories))),
    },
  };
}

function mockCrawl(config: StyleSeatRunConfig): StyleSeatCrawlResult {
  const seed = config.sourceUrl || DEFAULT_AGGREGATOR_URL;
  const operators = generateMockOperators(config);
  return {
    seedUrls: [seed],
    crawledUrls: [seed],
    profileUrls: operators.map((op) => op.styleseatUrl),
    rejectedUrls: [],
    discoveredMarkets: Array.from(new Set(operators.map((op) => `${op.city}, ${op.state}`))),
    discoveredCategories: Array.from(new Set(operators.flatMap((op) => op.categories))),
  };
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_OPERATORS_POOL: Array<{ name: string; specialties: string[]; bio: string }> = [
  { name: "Janelle Carter",    specialties: ["knotless braids", "faux locs"],    bio: "Natural hair specialist. Braids, twists, protective styles in Houston." },
  { name: "Aisha Williams",    specialties: ["box braids", "senegalese twists"], bio: "Certified braider. 10+ yrs experience. Book online." },
  { name: "Destiny Brown",     specialties: ["sew-in", "quickweave"],            bio: "Versatile hair stylist. All textures welcome." },
  { name: "Keisha Thompson",   specialties: ["loc maintenance", "retwist"],       bio: "Loc specialist and natural hair educator." },
  { name: "Monique Davis",     specialties: ["color", "balayage"],               bio: "Color expert. Specializing in lived-in looks and blonding." },
  { name: "Tanya Robinson",    specialties: ["lash extensions", "brow lamination"], bio: "Lash & brow artist. Licensed aesthetician." },
  { name: "Shanice Johnson",   specialties: ["acrylic nails", "nail art"],        bio: "Nail tech. Creative designs. Appointments only." },
  { name: "Brianna Wilson",    specialties: ["knotless braids", "tribal braids"], bio: "Braiding since 2017. IG: @briannabraid" },
  { name: "Latoya Anderson",   specialties: ["cut & color", "natural hair"],      bio: "Natural texture specialist serving the community." },
  { name: "Dominique Harris",  specialties: ["makeup", "bridal glam"],           bio: "MUA for all skin tones. Bridal + editorial." },
  { name: "Niesha Davis Beauty", specialties: ["lashes", "brows"],               bio: "Lash studio owner. Glam for everyday & events." },
  { name: "Tamika Flowers",    specialties: ["starter locs", "loc retwist"],      bio: "Loc journey specialist. DM to start yours." },
  { name: "Chantel Moore",     specialties: ["silk press", "natural blowout"],    bio: "Hair care educator. Soft, bouncy silk presses." },
  { name: "Jasmine Cruz",      specialties: ["wax", "threading"],                bio: "Esthetician. Full body wax + brow shaping." },
  { name: "Simone Carter Studio", specialties: ["braids", "protective styles"],  bio: "Suite-based studio. All braiding styles." },
];

function generateMockOperators(config: StyleSeatRunConfig): StyleSeatOperator[] {
  const now   = new Date().toISOString().slice(0, 10);
  const batch = `styleseat-mock-${Date.now()}`;
  const cap   = Math.min(config.maxOperators ?? config.maxResults, MOCK_OPERATORS_POOL.length);

  return MOCK_OPERATORS_POOL.slice(0, cap).map((tmpl, i): StyleSeatOperator => {
    const category = config.categories[i % Math.max(config.categories.length, 1)] ?? "hair";
    const slug     = tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const reviews  = 5 + (i * 7) + (i % 3) * 11;
    const rating   = Number((4.3 + (i % 4) * 0.15).toFixed(1));

    return {
      styleseatId:  `ss-mock-${i + 1}`,
      name:         tmpl.name,
      slug,
      styleseatUrl: `https://www.styleseat.com/m/${slug}`,
      city:         config.market,
      state:        config.state || "TX",
      categories:   [category],
      specialties:  tmpl.specialties,
      bio:          tmpl.bio,
      services:     [
        { name: category === "braids" ? "Box Braids (Med)" : "Signature Service", price: 80 + i * 10, duration: 90 },
        { name: "Consultation", price: 0, duration: 15 },
      ],
      reviewCount:  reviews,
      rating,
      imageUrl:     null,
      priceRange:   `$${70 + i * 5}–$${140 + i * 10}`,
      isIndependent: true,
      harvestDate:  now,
      batchId:      batch,
      discoveryMode: config.discoveryMode ?? "market_search",
      seedUrl:      config.sourceUrl ?? DEFAULT_AGGREGATOR_URL,
      sourceUrl:    config.sourceUrl ?? DEFAULT_AGGREGATOR_URL,
      rawText:      tmpl.bio,
      imageCount:   0,
    };
  });
}
