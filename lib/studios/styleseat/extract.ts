// lib/studios/styleseat/extract.ts
// Pulls StyleSeat operator listings via local discovery crawl or Apify web scraper.
// If STYLESEAT_MOCK=true, returns mock operators. Market search uses Apify when configured.
//
// StyleSeat search URL format:
//   https://www.styleseat.com/{category-slug}/{city-slug}--{state-slug}
//   e.g. https://www.styleseat.com/braiders/houston--tx

import type { StyleSeatOperator, StyleSeatCategory, StyleSeatRunConfig, StyleSeatCrawlResult } from "./types";
import { STYLESEAT_CATEGORY_SLUGS } from "./types";
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

function classifyStyleSeatDebugUrl(url: string): "profile" | "search" | "category" | "booking" | "login" | "unknown" {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  const lower = pathname.toLowerCase();
  if (lower.includes("appointment") || lower.includes("booking") || lower.includes("book")) return "booking";
  if (lower.includes("login") || lower.includes("my-account") || lower.includes("sign")) return "login";
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

function extractRawInternalLinks(html: string, baseUrl: string): Array<{ href: string; normalizedUrl: string | null; classifiedType: string }> {
  const links: Array<{ href: string; normalizedUrl: string | null; classifiedType: string }> = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const normalizedUrl = normalizeStyleSeatUrl(new URL(href, baseUrl).toString());
      links.push({ href, normalizedUrl, classifiedType: classifyStyleSeatDebugUrl(normalizedUrl) });
    } catch {
      // external URL
    }
  }
  for (const normalizedUrl of extractAnchorUrls(html, baseUrl)) {
    if (!links.some((link) => link.normalizedUrl === normalizedUrl)) {
      links.push({ href: normalizedUrl, normalizedUrl, classifiedType: classifyStyleSeatDebugUrl(normalizedUrl) });
    }
  }
  return links;
}

function extractScriptContents(html: string): Array<{ attributes: string; content: string }> {
  const scripts: Array<{ attributes: string; content: string }> = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    scripts.push({ attributes: match[1] ?? "", content: (match[2] ?? "").trim() });
  }
  return scripts;
}

type EmbeddedStyleSeatBlob = { kind: string; attributes?: string; length: number; snippet: string; parsed?: unknown };
type EmbeddedStyleSeatCandidate = {
  score: number;
  matchedFields: string[];
  value: Record<string, unknown>;
  path: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function candidateFields(value: Record<string, unknown>): string[] {
  const aliases = [
    "name", "firstName", "lastName", "displayName", "profileUrl", "url", "slug",
    "city", "state", "rating", "reviewCount", "services", "specialties",
    "businessName", "professionalId", "providerId", "userId",
  ];
  const keys = new Set(Object.keys(value));
  const matched = aliases.filter((field) => keys.has(field));
  if (keys.has("provider_id")) matched.push("providerId");
  if (keys.has("professional_id")) matched.push("professionalId");
  if (keys.has("user_id")) matched.push("userId");
  if (keys.has("average_rating")) matched.push("rating");
  if (keys.has("num_ratings")) matched.push("reviewCount");
  if (keys.has("matched_services")) matched.push("services");
  if (keys.has("vanity_url")) matched.push("slug");
  if (keys.has("provider_name")) matched.push("name");
  if (isRecord(value.location)) {
    const locationKeys = new Set(Object.keys(value.location));
    if (locationKeys.has("city")) matched.push("city");
    if (locationKeys.has("state")) matched.push("state");
  }
  if (isRecord(value.matched_salon)) matched.push("businessName");
  return Array.from(new Set(matched));
}

function findCandidateObjects(value: unknown, pathLabel = "$", out: EmbeddedStyleSeatCandidate[] = [], seen = new WeakSet<object>()): EmbeddedStyleSeatCandidate[] {
  if (!value || typeof value !== "object") return out;
  if (seen.has(value)) return out;
  seen.add(value);

  if (Array.isArray(value)) {
    value.slice(0, 500).forEach((item, index) => findCandidateObjects(item, `${pathLabel}[${index}]`, out, seen));
    return out;
  }

  const record = value as Record<string, unknown>;
  const matchedFields = candidateFields(record);
  if (matchedFields.length >= 2) {
    out.push({
      score: matchedFields.length,
      matchedFields,
      value: record,
      path: pathLabel,
    });
  }

  for (const [key, child] of Object.entries(record).slice(0, 500)) {
    if (child && typeof child === "object") findCandidateObjects(child, `${pathLabel}.${key}`, out, seen);
  }
  return out;
}

function extractJsonLookingPayloads(text: string): unknown[] {
  const payloads: unknown[] = [];
  const jsonParseRe = /JSON\.parse\(\s*(['"`])([\s\S]{20,20000}?)\1\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = jsonParseRe.exec(text))) {
    try {
      payloads.push(JSON.parse(match[2].replace(/\\"/g, "\"").replace(/\\n/g, "\n")));
    } catch {
      // not a clean JSON payload
    }
  }
  const objectRe = /({(?=[\s\S]{0,2000}(?:provider|professional|profile|services|rating|review|city|state))[\s\S]{50,5000}?})/gi;
  while ((match = objectRe.exec(text)) && payloads.length < 40) {
    try {
      payloads.push(JSON.parse(match[1]));
    } catch {
      // noisy JavaScript object or partial JSON
    }
  }
  return payloads;
}

export function extractEmbeddedStyleSeatData(html: string): {
  scriptsIndex: Array<{ index: number; attributes: string; src?: string; type?: string; id?: string; length: number; signals: string[] }>;
  embeddedJson: EmbeddedStyleSeatBlob[];
  jsonLd: EmbeddedStyleSeatBlob[];
  candidateObjects: EmbeddedStyleSeatCandidate[];
  nextDataFound: boolean;
  nextFlightFound: boolean;
  readableFlightStrings: string[];
  flightUrls: string[];
} {
  const embeddedJson: EmbeddedStyleSeatBlob[] = [];
  const jsonLd: EmbeddedStyleSeatBlob[] = [];
  const candidateObjects: EmbeddedStyleSeatCandidate[] = [];
  const scripts = extractScriptContents(html);
  const scriptsIndex = scripts.map((script, index) => {
    const attrs = script.attributes;
    const signals = [
      "__NEXT_DATA__", "self.__next_f.push", "__INITIAL_STATE__", "__APOLLO_STATE__",
      "graphql", "api", "professionals", "providers", "stylists", "searchResults",
      "marketplace", "booking",
    ].filter((signal) => attrs.includes(signal) || script.content.includes(signal));
    return {
      index,
      attributes: attrs.trim(),
      src: attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1],
      type: attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1],
      id: attrs.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1],
      length: script.content.length,
      signals,
    };
  });
  const readableFlightStrings: string[] = [];
  const flightUrls = Array.from(new Set(
    Array.from(html.matchAll(/https?:\\?\/\\?\/(?:www\.)?styleseat\.com\\?\/m\\?\/[^"'\\\s)]+/gi))
      .map((match) => match[0].replace(/\\\//g, "/").replace(/\\u002F/gi, "/"))
  ));

  for (const script of extractScriptContents(html)) {
    const attrs = script.attributes;
    const content = script.content;
    if (!content) continue;
    const lowerAttrs = attrs.toLowerCase();
    let kind: string | null = null;
    if (attrs.includes("__NEXT_DATA__")) kind = "__NEXT_DATA__";
    else if (lowerAttrs.includes("application/ld+json")) kind = "application/ld+json";
    else if (lowerAttrs.includes("application/json")) kind = "script[type=application/json]";
    else if (content.includes("__APOLLO_STATE__")) kind = "__APOLLO_STATE__";
    else if (content.includes("__INITIAL_STATE__")) kind = "window.__INITIAL_STATE__";
    else if (content.includes("JSON.parse(")) kind = "JSON.parse";
    if (content.includes("self.__next_f.push")) {
      for (const match of Array.from(content.matchAll(/"([^"]{3,160})"/g))) {
        const value = match[1].replace(/\\u002F/gi, "/").replace(/\\"/g, "\"");
        if (/styleseat|\/m\/|provider|professional|search|braid|booking|denver|city|state/i.test(value)) {
          readableFlightStrings.push(value);
        }
      }
    }
    if (!kind) {
      for (const payload of extractJsonLookingPayloads(content)) {
        findCandidateObjects(payload, "$.scriptPayload", candidateObjects);
      }
      continue;
    }

    const blob: EmbeddedStyleSeatBlob = {
      kind,
      attributes: attrs.trim(),
      length: content.length,
      snippet: content.slice(0, 4000),
    };
    if (kind === "__NEXT_DATA__" || kind === "application/ld+json" || kind === "script[type=application/json]") {
      try {
        blob.parsed = JSON.parse(content);
        findCandidateObjects(blob.parsed, `$.${kind}`, candidateObjects);
      } catch { /* keep snippet */ }
    }
    if (kind === "application/ld+json") jsonLd.push(blob);
    else embeddedJson.push(blob);
  }
  const globalPatterns: Array<[string, RegExp]> = [
    ["__APOLLO_STATE__", /__APOLLO_STATE__\s*=\s*({[\s\S]{0,20000}?});/],
    ["window.__INITIAL_STATE__", /__INITIAL_STATE__\s*=\s*({[\s\S]{0,20000}?});/],
    ["JSON.parse", /JSON\.parse\(\s*(['"`])([\s\S]{0,20000}?)\1\s*\)/],
  ];
  for (const [kind, re] of globalPatterns) {
    const match = html.match(re);
    if (!match) continue;
    const content = match[2] ?? match[1] ?? match[0];
    const blob: EmbeddedStyleSeatBlob = { kind, length: content.length, snippet: content.slice(0, 4000) };
    try {
      blob.parsed = JSON.parse(content);
      findCandidateObjects(blob.parsed, `$.${kind}`, candidateObjects);
    } catch { /* keep snippet */ }
    embeddedJson.push(blob);
  }
  return {
    scriptsIndex,
    embeddedJson,
    jsonLd,
    candidateObjects: candidateObjects
      .sort((a, b) => b.score - a.score)
      .slice(0, 100),
    nextDataFound: html.includes("__NEXT_DATA__"),
    nextFlightFound: html.includes("self.__next_f.push"),
    readableFlightStrings: Array.from(new Set(readableFlightStrings)).slice(0, 200),
    flightUrls: flightUrls.slice(0, 100),
  };
}

function collectNetworkHints(html: string): {
  counts: Record<string, number>;
  scriptSources: string[];
  urlLikeStrings: string[];
  hints: Array<{ kind: string; index: number; snippet: string }>;
} {
  const terms = [
    "graphql", "api", "fetch(", "xhr", "XMLHttpRequest", "relay", "apollo", "queryHash", "queryId",
    "search.styleseat.com", "professionals", "providers", "stylists", "searchResults", "marketplace", "booking",
  ];
  const hints: Array<{ kind: string; index: number; snippet: string }> = [];
  const counts: Record<string, number> = {};
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    const matches = Array.from(html.matchAll(re));
    counts[term] = matches.length;
    for (const match of matches.slice(0, 12)) {
      const index = match.index ?? 0;
      hints.push({
        kind: term,
        index,
        snippet: html.slice(Math.max(0, index - 220), Math.min(html.length, index + 420)),
      });
    }
  }
  const scriptSources = extractScriptContents(html)
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
  };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIH StyleSeat Discovery/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

const MARKET_COORDINATES: Record<string, { lat: number; lon: number; label: string }> = {
  "atlanta-ga": { lat: 33.749, lon: -84.388, label: "Atlanta, GA" },
  "denver-co": { lat: 39.7392, lon: -104.9903, label: "Denver, CO" },
  "houston-tx": { lat: 29.7604, lon: -95.3698, label: "Houston, TX" },
  "las-vegas-nv": { lat: 36.1699, lon: -115.1398, label: "Las Vegas, NV" },
  "miami-fl": { lat: 25.7617, lon: -80.1918, label: "Miami, FL" },
  "new-york-ny": { lat: 40.7128, lon: -74.006, label: "New York, NY" },
};

function parseSearchUrl(url: string): { marketSlug: string; query: string; loc: string; lat: number; lon: number } | null {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  const match = pathname.match(/^\/m\/search\/([^/]+)\/([^/]+)$/i);
  if (!match) return null;
  const marketSlug = decodeURIComponent(match[1]).toLowerCase();
  const query = decodeURIComponent(match[2]).replace(/[-_]+/g, " ").trim();
  const coords = MARKET_COORDINATES[marketSlug] ?? { lat: 0, lon: 0, label: marketSlug.replace(/-/g, " ") };
  return { marketSlug, query, loc: coords.label, lat: coords.lat, lon: coords.lon };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberValue(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function operatorFromSearchApiResult(
  item: Record<string, unknown>,
  config: StyleSeatRunConfig,
  idx: number,
  seedUrl: string,
  batch: string,
  query: string,
): StyleSeatOperator {
  const salon = item.matched_salon && typeof item.matched_salon === "object" ? item.matched_salon as Record<string, unknown> : {};
  const location = salon.location && typeof salon.location === "object" ? salon.location as Record<string, unknown> : {};
  const id = stringValue(item.id) || `api-${idx + 1}`;
  const vanity = stringValue(item.vanity_url);
  const profileUrl = vanity
    ? `https://www.styleseat.com/m/v/${vanity}`
    : `https://www.styleseat.com/m/p/${id}`;
  const name = stringValue(item.name) || stringValue(item["0_name"]) || stringValue(salon.name) || vanity || id;
  const city = stringValue(location.city) || config.market;
  const state = stringValue(location.state) || config.state;
  const serviceNames = Array.isArray(item.matched_services)
    ? item.matched_services.flatMap((service) => {
        if (!service || typeof service !== "object") return [];
        const record = service as Record<string, unknown>;
        return stringValue(record.name) ? [stringValue(record.name)] : [];
      })
    : [];
  const rawText = JSON.stringify(item).slice(0, 5000);
  const categories = deriveCategories(`${query} ${name} ${stringValue(salon.name)} ${serviceNames.join(" ")} ${rawText}`, config.categories);

  return {
    styleseatId: `ss-${id}`,
    name,
    slug: vanity || id,
    styleseatUrl: profileUrl,
    city,
    state,
    categories,
    specialties: serviceNames.length > 0 ? serviceNames.slice(0, 8) : categories,
    bio: stringValue(salon.name) || null,
    services: serviceNames.map((service) => ({ name: service, price: null, duration: null })),
    reviewCount: numberValue(item.num_ratings),
    rating: item.average_rating != null ? numberValue(item.average_rating) : null,
    imageUrl: stringValue(item.profile_photo) || null,
    priceRange: null,
    isIndependent: true,
    harvestDate: new Date().toISOString().slice(0, 10),
    batchId: batch,
    discoveryMode: config.discoveryMode ?? "direct_url",
    seedUrl,
    sourceUrl: profileUrl,
    rawText,
    imageCount: [item.profile_photo, item.cover_photo].filter(Boolean).length,
  };
}

async function crawlSearchApi(input: {
  url: string;
  config: StyleSeatRunConfig;
  maxOperators: number;
}): Promise<{ operators: StyleSeatOperator[]; profileUrls: string[]; apiUrl?: string; responsePath?: string; note?: string }> {
  const parsed = parseSearchUrl(input.url);
  if (!parsed) return { operators: [], profileUrls: [] };
  if (!parsed.lat || !parsed.lon) {
    return { operators: [], profileUrls: [], note: `No local coordinates configured for ${parsed.marketSlug}; rendered extraction fallback required.` };
  }
  const params = new URLSearchParams({
    query: parsed.query,
    loc: parsed.loc,
    lat: String(parsed.lat),
    lon: String(parsed.lon),
    size: String(input.maxOperators),
    from: "0",
    date: new Date().toISOString().slice(0, 10),
  });
  const apiUrl = `https://search.styleseat.com/api/v3.0/salons.json?${params.toString()}`;
  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIH StyleSeat Discovery/1.0)",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return { operators: [], profileUrls: [], apiUrl, note: `StyleSeat search API HTTP ${res.status}` };
  const data = await res.json() as { results?: Record<string, unknown>[] };
  let responsePath: string | undefined;
  if (input.config.debug) {
    const dir = getRunDebugDir(input.config.runId);
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      responsePath = path.join(dir, "search-api-response.json");
      await fs.writeFile(responsePath, JSON.stringify({
        apiUrl,
        resultCount: Array.isArray(data.results) ? data.results.length : 0,
        sampleResults: Array.isArray(data.results) ? data.results.slice(0, 5) : [],
      }, null, 2), "utf8");
    }
  }
  const batch = `styleseat-search-${Date.now()}`;
  const operators = (Array.isArray(data.results) ? data.results : [])
    .slice(0, input.maxOperators)
    .map((item, idx) => operatorFromSearchApiResult(item, input.config, idx, input.url, batch, parsed.query));
  return { operators, profileUrls: operators.map((operator) => operator.styleseatUrl), apiUrl, responsePath };
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
  hasUsableStaticLinks: boolean;
  hasEmbeddedData: boolean;
  hasNetworkHints: boolean;
}> {
  const embeddedData = extractEmbeddedStyleSeatData(input.html);
  const allLinks = extractRawInternalLinks(input.html, input.url);
  const classifications = allLinks.map((link) => ({
    ...link,
    classifiedType: link.normalizedUrl ? classifyStyleSeatDebugUrl(link.normalizedUrl) : "unknown",
  }));
  const networkHints = collectNetworkHints(input.html);
  const profileLinkCount = classifications.filter((link) => link.classifiedType === "profile").length;
  const extractionReport = {
    sourceUrl: input.url,
    isStaticHtml: true,
    nextDataFound: embeddedData.nextDataFound,
    nextFlightFound: embeddedData.nextFlightFound,
    jsonScriptCount: embeddedData.embeddedJson.length,
    jsonLdCount: embeddedData.jsonLd.length,
    candidateObjectCount: embeddedData.candidateObjects.length,
    networkHintCount: networkHints.hints.length + networkHints.urlLikeStrings.length,
    internalStyleSeatLinkCount: classifications.length,
    profileLinkCount,
    likelyDataSource: embeddedData.candidateObjects.length > 0
      ? "embedded_json"
      : profileLinkCount > 0
        ? "static_links"
        : networkHints.urlLikeStrings.some((url) => url.includes("search.styleseat.com") || url.includes("/api/"))
          ? "internal_api"
          : "unknown_or_rendered_dom",
  };
  const result = {
    embeddedDataCount: embeddedData.embeddedJson.length + embeddedData.jsonLd.length,
    jsonScriptCount: embeddedData.embeddedJson.length,
    jsonLdCount: embeddedData.jsonLd.length,
    nextDataFound: embeddedData.nextDataFound,
    nextFlightFound: embeddedData.nextFlightFound,
    candidateObjectCount: embeddedData.candidateObjects.length,
    networkHintCount: networkHints.hints.length + networkHints.urlLikeStrings.length,
    internalLinkCount: classifications.length,
    profileLinkCount,
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
    readableFlightStrings: embeddedData.readableFlightStrings,
    flightUrls: embeddedData.flightUrls,
  }, null, 2), "utf8");
  await fs.writeFile(jsonLdPath, JSON.stringify(embeddedData.jsonLd, null, 2), "utf8");
  await fs.writeFile(internalLinksPath, JSON.stringify(classifications, null, 2), "utf8");
  await fs.writeFile(urlClassificationPath, JSON.stringify({
    sourceUrl: input.url,
    totals: {
      allInternalLinks: classifications.length,
      profile: classifications.filter((link) => link.classifiedType === "profile").length,
      search: classifications.filter((link) => link.classifiedType === "search").length,
      category: classifications.filter((link) => link.classifiedType === "category").length,
      booking: classifications.filter((link) => link.classifiedType === "booking").length,
      login: classifications.filter((link) => link.classifiedType === "login").length,
      unknown: classifications.filter((link) => link.classifiedType === "unknown").length,
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
  let extractionSource: "static_links" | "search_api" | "rendered_dom" | "none" = "none";
  let searchApiUrl: string | undefined;
  let searchApiResponsePath: string | undefined;
  let searchApiResultCount = 0;
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

    let html = "";
    try {
      html = await fetchHtml(next.url);
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
    }
    if (hasStaticProfiles) extractionSource = "static_links";

    if (!hasStaticProfiles && kind === "search") {
      const apiResult = await crawlSearchApi({
        url: next.url,
        config: input.config,
        maxOperators: input.maxOperators - profileUrls.length,
      });
      searchApiUrl = apiResult.apiUrl ?? searchApiUrl;
      searchApiResponsePath = apiResult.responsePath ?? searchApiResponsePath;
      searchApiResultCount += apiResult.operators.length;
      if (apiResult.note) debugNotes.push(apiResult.note);
      for (const operator of apiResult.operators) {
        if (profileUrls.length >= input.maxOperators) break;
        if (!profileUrls.includes(operator.styleseatUrl)) {
          apiOperators.push(operator);
          profileUrls.push(operator.styleseatUrl);
        }
      }
      if (apiResult.operators.length > 0) extractionSource = "search_api";
      pageLinks = Array.from(new Set([...pageLinks, ...apiResult.profileUrls]));
    }

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
      if (renderedUrls.some((url) => classifyStyleSeatUrl(url) === "profile")) extractionSource = "rendered_dom";
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
      networkHintCount,
      internalLinkCount,
      profileLinkCount,
      searchApiUrl,
      searchApiResultCount,
      searchApiResponsePath,
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
