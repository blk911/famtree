// lib/intelligence/salon/business-stack/website-stack-crawler.ts

import {
  detectBusinessStackFromHtml,
  detectBusinessStackFromUrls,
} from "./fingerprint-detector";
import type { SalonStackSignal, WebsiteStackCrawlResult } from "./types";

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 1_000_000;
const LINK_REGEX = /href\s*=\s*["']([^"']+)["']/gi;
const TITLE_REGEX = /<title[^>]*>([^<]*)<\/title>/i;

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) {
    return true;
  }
  return false;
}

function extractLinks(html: string, base: URL): string[] {
  const found: string[] = [];
  let m: RegExpExecArray | null;
  LINK_REGEX.lastIndex = 0;
  while ((m = LINK_REGEX.exec(html)) !== null) {
    const href = m[1]?.trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      continue;
    }
    try {
      const abs = new URL(href, base).href;
      if (abs.startsWith("http")) found.push(abs);
    } catch {
      // skip
    }
  }
  return found;
}

export async function crawlWebsiteForStack(
  url: string,
  options?: { prospectId?: string; instagramHandle?: string },
): Promise<WebsiteStackCrawlResult> {
  const errors: string[] = [];
  const empty: WebsiteStackCrawlResult = {
    ok: false,
    links: [],
    signals: [],
    errors,
  };

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ...empty, errors: ["invalid_protocol"] };
    }
    if (isPrivateHost(parsed.hostname)) {
      return { ...empty, errors: ["private_host_blocked"] };
    }

    const res = await fetch(parsed.href, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "FamtreeSalonStack/1.0 (+public fingerprint)" },
      redirect: "follow",
    });

    const finalUrl = res.url;
    const httpStatus = res.status;
    if (!res.ok) {
      return {
        ok: false,
        finalUrl,
        httpStatus,
        links: [],
        signals: [],
        errors: [`http_${httpStatus}`],
      };
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return {
        ok: false,
        finalUrl,
        httpStatus,
        links: [],
        signals: [],
        errors: ["response_too_large"],
      };
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const titleMatch = html.match(TITLE_REGEX);
    const title = titleMatch?.[1]?.trim();
    const base = new URL(finalUrl);
    const links = extractLinks(html, base).slice(0, 120);

    const htmlSignals = detectBusinessStackFromHtml({
      prospectId: options?.prospectId,
      instagramHandle: options?.instagramHandle,
      urls: [finalUrl],
      html,
      source: "website_html",
    });

    const linkSignals = detectBusinessStackFromUrls({
      prospectId: options?.prospectId,
      instagramHandle: options?.instagramHandle,
      urls: links,
      source: "website_link",
    });

    const signals: SalonStackSignal[] = [
      ...htmlSignals,
      ...linkSignals,
    ];

    return {
      ok: true,
      finalUrl,
      httpStatus,
      title,
      links,
      signals,
      errors,
    };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { ...empty, errors };
  }
}
