// lib/intelligence/salon/source-ingest/normalize-sola-source-url.ts

import { buildSolaLocationDirectoryUrl } from "@/lib/operators/sources/sola/discover-sola-slugs";

export type SolaSourceNormalization = {
  sourceProvider: "sola";
  slug: string;
  /** Canonical book directory URL (query params stripped). */
  directoryUrl: string;
};

export type NormalizeSolaSourceResult =
  | { recognized: true; normalization: SolaSourceNormalization }
  | { recognized: false };

const SLUG_RE = /^[a-z0-9-]+$/;

function parseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    url.hash = "";
    url.search = "";
    return url;
  } catch {
    return null;
  }
}

function slugFromBookPath(pathname: string): string | null {
  const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const slug = segments[0]?.toLowerCase();
  if (!slug || !SLUG_RE.test(slug)) return null;

  if (segments.length >= 2 && segments[1].toLowerCase() === "pro") {
    return null;
  }

  return slug;
}

function slugFromMarketingPath(pathname: string): string | null {
  const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (segments.length < 2) return null;
  if (segments[0].toLowerCase() !== "locations") return null;

  const slug = segments[1]?.toLowerCase();
  if (!slug || !SLUG_RE.test(slug)) return null;
  return slug;
}

export function normalizeSolaSourceUrl(raw: string): NormalizeSolaSourceResult {
  const trimmed = raw.trim();
  if (!trimmed) return { recognized: false };

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    trimmed.includes("solasalonstudios.com") ||
    trimmed.startsWith("book.solasalonstudios.com") ||
    trimmed.startsWith("www.solasalonstudios.com");

  if (looksLikeUrl) {
    const url = parseUrl(trimmed);
    if (!url) return { recognized: false };

    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let slug: string | null = null;

    if (host === "book.solasalonstudios.com") {
      slug = slugFromBookPath(url.pathname);
    } else if (host === "solasalonstudios.com") {
      slug = slugFromMarketingPath(url.pathname);
    }

    if (!slug) return { recognized: false };

    return {
      recognized: true,
      normalization: {
        sourceProvider: "sola",
        slug,
        directoryUrl: buildSolaLocationDirectoryUrl(slug),
      },
    };
  }

  const slug = trimmed.toLowerCase();
  if (!SLUG_RE.test(slug)) return { recognized: false };

  return {
    recognized: true,
    normalization: {
      sourceProvider: "sola",
      slug,
      directoryUrl: buildSolaLocationDirectoryUrl(slug),
    },
  };
}
