// lib/studios/creator-lab/fetch-public-page.ts
// Fetches a public creator page and extracts raw source data.
// No DOM library — uses regex on raw HTML. Runs server-side only.

import type { CreatorSource, Platform } from "./types";
import { normalizeUrl, detectPlatform } from "./url-utils";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

const FETCH_TIMEOUT_MS = 12_000;

// ─── HTML utilities ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractLinks(html: string, baseUrl: string): string[] {
  const hrefs: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
    try {
      const abs = new URL(href, baseUrl).toString();
      hrefs.push(abs);
    } catch {
      if (href.startsWith("http")) hrefs.push(href);
    }
  }
  // Deduplicate while preserving order
  return Array.from(new Set(hrefs));
}

function extractImageUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];

  // <img src="...">
  const imgRe = /(?:src|data-src|data-lazy-src)=["']([^"']+\.(jpg|jpeg|png|webp|gif|svg)[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    try { urls.push(new URL(m[1], baseUrl).toString()); } catch { urls.push(m[1]); }
  }

  // og:image / twitter:image
  const metaRe = /(?:og:image|twitter:image)[^>]+content=["']([^"']+)["']/gi;
  while ((m = metaRe.exec(html)) !== null) {
    try { urls.push(new URL(m[1], baseUrl).toString()); } catch { urls.push(m[1]); }
  }

  // srcset
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const parts = m[1].split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
    for (const p of parts) {
      try { urls.push(new URL(p, baseUrl).toString()); } catch { urls.push(p); }
    }
  }

  // Filter out tracking pixels, icons, tiny images
  return Array.from(new Set(urls)).filter((u) => {
    const lower = u.toLowerCase();
    return (
      !lower.includes("favicon") &&
      !lower.includes("pixel") &&
      !lower.includes("1x1") &&
      !lower.includes("tracking")
    );
  }).slice(0, 60);
}

function extractTextBlocks(html: string): string[] {
  const text = stripHtml(html);
  // Split on sentence boundaries or multiple spaces to get meaningful chunks
  const blocks = text
    .split(/[.!?]\s+|\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length >= 10 && b.length <= 600)
    .filter((b) => {
      // Filter out blocks that are mostly numbers/symbols (nav, prices, etc.)
      const letterRatio = (b.match(/[a-zA-Z]/g)?.length ?? 0) / b.length;
      return letterRatio > 0.4;
    });

  return Array.from(new Set(blocks)).slice(0, 120);
}

function extractMetaDescription(html: string): string | null {
  const m =
    html.match(/name=["']description["'][^>]+content=["']([^"']{10,500})["']/i) ||
    html.match(/content=["']([^"']{10,500})["'][^>]+name=["']description["']/i) ||
    html.match(/property=["']og:description["'][^>]+content=["']([^"']{10,500})["']/i) ||
    html.match(/content=["']([^"']{10,500})["'][^>]+property=["']og:description["']/i);
  return m ? m[1].trim() : null;
}

function extractTitle(html: string): string | null {
  const og = html.match(/property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
             html.match(/content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og) return og[1].trim();
  const title = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  return title ? title[1].trim() : null;
}

// ─── Platform-specific hints ───────────────────────────────────────────────────

function buildFetchHeaders(platform: Platform): Record<string, string> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const base: Record<string, string> = {
    "User-Agent": ua,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
  };

  // Instagram requires additional headers to avoid redirect to login
  if (platform === "instagram") {
    base["X-Requested-With"] = "XMLHttpRequest";
  }

  return base;
}

// ─── Main fetch function ───────────────────────────────────────────────────────

export async function fetchPublicPage(rawUrl: string): Promise<CreatorSource> {
  const normalizedUrl = normalizeUrl(rawUrl);
  const platform = detectPlatform(normalizedUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let htmlText = "";
  let httpStatus = 0;

  try {
    const res = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: buildFetchHeaders(platform),
      redirect: "follow",
    });
    httpStatus = res.status;
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${normalizedUrl}`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      throw new Error(`Non-HTML response (${contentType}) from ${normalizedUrl}`);
    }
    htmlText = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const links      = extractLinks(htmlText, normalizedUrl);
  const imageUrls  = extractImageUrls(htmlText, normalizedUrl);
  const rawTextBlocks = extractTextBlocks(htmlText);

  // Prepend meta description and title as high-signal blocks
  const metaDesc = extractMetaDescription(htmlText);
  const pageTitle = extractTitle(htmlText);
  const priorityBlocks: string[] = [];
  if (pageTitle) priorityBlocks.push(pageTitle);
  if (metaDesc) priorityBlocks.push(metaDesc);

  const allBlocks = Array.from(new Set([...priorityBlocks, ...rawTextBlocks])).slice(0, 120);

  return {
    sourceUrl:    rawUrl,
    normalizedUrl,
    platform,
    fetchedAt:    new Date().toISOString(),
    httpStatus,
    htmlLength:   htmlText.length,
    htmlText:     htmlText.slice(0, 800_000), // cap at ~800KB to avoid storage bloat
    links:        links.slice(0, 200),
    imageUrls,
    rawTextBlocks: allBlocks,
  };
}
