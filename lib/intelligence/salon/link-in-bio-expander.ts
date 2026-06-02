// lib/intelligence/salon/link-in-bio-expander.ts
// Expand Linktree / link-in-bio pages to outbound provider URLs (public fetch only).

import { isLinkInBioUrl } from "./provider-detector";
import { extractGlossGeniusUrlsFromText, isGgClientSubdomainUrl } from "./glossgenius-url";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 600_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type LinkInBioExpandDiagnostics = {
  linkInBioLinksFound: number;
  linkInBioOutboundLinks: string[];
  linkInBioProviderLinks: string[];
  fetchOk: boolean;
  fetchError?: string;
};

export function extractOutboundLinksFromHtml(html: string, baseUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (raw: string) => {
    const href = raw.trim();
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return;
    }
    try {
      const abs = new URL(href, baseUrl).toString();
      if (!abs.startsWith("http")) return;
      const key = abs.toLowerCase().replace(/\/+$/, "");
      if (seen.has(key)) return;
      seen.add(key);
      out.push(abs);
    } catch {
      if (href.startsWith("http")) {
        const key = href.toLowerCase().replace(/\/+$/, "");
        if (!seen.has(key)) {
          seen.add(key);
          out.push(href);
        }
      }
    }
  };

  for (const m of Array.from(html.matchAll(/href=["']([^"']+)["']/gi))) add(m[1]);
  for (const m of Array.from(html.matchAll(/data-href=["']([^"']+)["']/gi))) add(m[1]);
  for (const m of Array.from(html.matchAll(/data-url=["']([^"']+)["']/gi))) add(m[1]);

  for (const m of Array.from(html.matchAll(/https?:\/\/[^\s"'<>]+/gi))) add(m[0]);

  for (const m of Array.from(html.matchAll(/[?&]url=([^&"'\s]+)/gi))) {
    try {
      add(decodeURIComponent(m[1]));
    } catch {
      add(m[1]);
    }
  }

  for (const gg of extractGlossGeniusUrlsFromText(html)) add(gg);

  const jsonUrlRe = /"(?:url|href|link|externalUrl)"\s*:\s*"(https?:[^"\\]+)"/gi;
  for (const m of Array.from(html.matchAll(jsonUrlRe))) add(m[1].replace(/\\u002F/g, "/"));

  return out;
}

function isProviderBookingUrl(url: string): boolean {
  if (isGgClientSubdomainUrl(url)) return true;
  const h = url.toLowerCase();
  return (
    /vagaro\.com|booksy\.com|fresha\.(com|net)|styleseat\.com|book\.squareup\.com|square\.site|squareup\.com\/appointments|schedulicity\.com|acuityscheduling\.com|mangomint\.com|gettimely\.com|setmore\.com|joinblvd\.com|mindbodyonline\.com|gocheckin\.(net|com)/i.test(
      h,
    )
  );
}

export async function expandLinkInBioPage(
  pageUrl: string,
): Promise<{ links: string[]; diagnostics: LinkInBioExpandDiagnostics }> {
  const emptyDiag = (partial?: Partial<LinkInBioExpandDiagnostics>): LinkInBioExpandDiagnostics => ({
    linkInBioLinksFound: 0,
    linkInBioOutboundLinks: [],
    linkInBioProviderLinks: [],
    fetchOk: false,
    ...partial,
  });

  if (!pageUrl.startsWith("http")) {
    return { links: [], diagnostics: emptyDiag({ fetchError: "invalid_url" }) };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        links: [],
        diagnostics: emptyDiag({
          fetchError: `http_${res.status}`,
        }),
      };
    }

    const buf = await res.arrayBuffer();
    const slice =
      buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    const finalBase = res.url || pageUrl;
    const outbound = extractOutboundLinksFromHtml(html, finalBase);
    const providerLinks = outbound.filter(isProviderBookingUrl);

    return {
      links: outbound,
      diagnostics: {
        linkInBioLinksFound: outbound.length,
        linkInBioOutboundLinks: outbound.slice(0, 50),
        linkInBioProviderLinks: providerLinks.slice(0, 20),
        fetchOk: true,
      },
    };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return { links: [], diagnostics: emptyDiag({ fetchError: msg }) };
  }
}

export async function expandLinkInBioUrlsFromList(
  urls: string[],
): Promise<{ expanded: string[]; diagnostics: LinkInBioExpandDiagnostics[] }> {
  const expanded = [...urls];
  const diagnostics: LinkInBioExpandDiagnostics[] = [];
  const seen = new Set(urls.map((u) => u.toLowerCase().replace(/\/+$/, "")));

  const bioPages = urls.filter((u) => isLinkInBioUrl(u));
  for (const page of bioPages.slice(0, 3)) {
    const { links, diagnostics: d } = await expandLinkInBioPage(page);
    diagnostics.push(d);
    for (const link of links) {
      const key = link.toLowerCase().replace(/\/+$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      expanded.push(link);
    }
  }

  return { expanded, diagnostics };
}
