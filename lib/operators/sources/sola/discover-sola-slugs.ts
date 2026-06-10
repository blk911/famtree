// lib/operators/sources/sola/discover-sola-slugs.ts

import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getSolaDataDir } from "./paths";
import { SOLA_BOOK_ORIGIN } from "./profile-url-utils";

const SOLA_DATA_DIR = getSolaDataDir();
const SLUGS_SEED_PATH = path.join(SOLA_DATA_DIR, "sola-slugs.seed.json");

const VALIDATE_TIMEOUT_MS = 20_000;

const LOCATION_PAGE_MARKERS = [
  /dir-card-wrapper/i,
  /sola\s+salons?/i,
  /book\.solasalonstudios\.com/i,
  /studio\s*#?\s*\d+/i,
];

export interface SolaSlugParseResult {
  input: string;
  slug?: string;
  skipped: boolean;
  skipReason?: string;
}

export interface SolaSlugDiscoverSummary {
  inputCount: number;
  validAdded: number;
  alreadyExisted: number;
  invalidSkipped: number;
  slugs: string[];
}

export function buildSolaLocationDirectoryUrl(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return `${SOLA_BOOK_ORIGIN}/${clean}/location`;
}

export function parseSolaSlugInput(input: string): SolaSlugParseResult {
  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return { input: trimmed, skipped: true, skipReason: "empty_or_comment" };
  }

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    trimmed.includes("solasalonstudios.com") ||
    trimmed.startsWith("book.solasalonstudios.com") ||
    trimmed.startsWith("www.solasalonstudios.com");

  if (looksLikeUrl) {
    try {
      const url = new URL(trimmed, SOLA_BOOK_ORIGIN);
      url.search = "";
      url.hash = "";
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const segments = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);

      if (host === "book.solasalonstudios.com") {
        if (segments.length >= 2 && segments[1].toLowerCase() === "pro") {
          return { input: trimmed, skipped: true, skipReason: "profile_url" };
        }

        const slug = segments[0]?.toLowerCase();
        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
          return { input: trimmed, skipped: true, skipReason: "unparseable_url" };
        }

        return { input: trimmed, slug, skipped: false };
      }

      if (host === "solasalonstudios.com" && segments[0]?.toLowerCase() === "locations") {
        const slug = segments[1]?.toLowerCase();
        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
          return { input: trimmed, skipped: true, skipReason: "unparseable_url" };
        }
        return { input: trimmed, slug, skipped: false };
      }

      return { input: trimmed, skipped: true, skipReason: "non_sola_host" };
    } catch {
      return { input: trimmed, skipped: true, skipReason: "invalid_url" };
    }
  }

  const slug = trimmed.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { input: trimmed, skipped: true, skipReason: "invalid_slug" };
  }

  return { input: trimmed, slug, skipped: false };
}

export function isSolaLocationDirectoryHtml(html: string): boolean {
  if (!html || html.length < 400) return false;

  const lower = html.toLowerCase();
  if (
    (lower.includes("page not found") || lower.includes("404 error")) &&
    !lower.includes("dir-card-wrapper")
  ) {
    return false;
  }

  const markerHits = LOCATION_PAGE_MARKERS.filter((pattern) => pattern.test(html)).length;
  return markerHits >= 2;
}

export async function validateSolaLocationSlug(slug: string): Promise<boolean> {
  const url = buildSolaLocationDirectoryUrl(slug);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "famtree-sola-slug-discovery/1.0",
      },
      signal: AbortSignal.timeout(VALIDATE_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) return false;

    const html = await response.text();
    return isSolaLocationDirectoryHtml(html);
  } catch {
    return false;
  }
}

export async function readSolaSeedSlugs(): Promise<string[]> {
  try {
    const raw = await readFile(SLUGS_SEED_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const slugs = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { slugs?: unknown }).slugs)
        ? (parsed as { slugs: unknown[] }).slugs
        : [];
    return Array.from(
      new Set(
        slugs
          .map((slug) => String(slug).trim().toLowerCase())
          .filter((slug) => /^[a-z0-9-]+$/.test(slug)),
      ),
    ).sort();
  } catch {
    return [];
  }
}

export async function writeSolaSeedSlugs(slugs: string[]): Promise<string[]> {
  const normalized = Array.from(
    new Set(
      slugs
        .map((slug) => slug.trim().toLowerCase())
        .filter((slug) => /^[a-z0-9-]+$/.test(slug)),
    ),
  ).sort();

  await mkdir(SOLA_DATA_DIR, { recursive: true });
  await writeFile(SLUGS_SEED_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function collectDiscoveryInputs(argv: string[]): Promise<string[]> {
  const tokens: string[] = [];

  for (const arg of argv) {
    const trimmed = arg.trim();
    if (!trimmed) continue;

    const candidatePath = path.isAbsolute(trimmed)
      ? trimmed
      : path.join(process.cwd(), trimmed);

    if (await fileExists(candidatePath)) {
      const raw = await readFile(candidatePath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const value = line.trim();
        if (value) tokens.push(value);
      }
      continue;
    }

    tokens.push(trimmed);
  }

  return tokens;
}

export async function discoverSolaSlugs(inputs: string[]): Promise<SolaSlugDiscoverSummary> {
  const existing = await readSolaSeedSlugs();
  const existingSet = new Set(existing);

  const parsed = inputs.map(parseSolaSlugInput);
  const candidateSlugs = Array.from(
    new Set(
      parsed
        .filter((row) => !row.skipped && row.slug)
        .map((row) => row.slug as string),
    ),
  );

  let validAdded = 0;
  let alreadyExisted = 0;
  let invalidSkipped = parsed.filter((row) => row.skipped).length;

  for (const slug of candidateSlugs) {
    if (existingSet.has(slug)) {
      alreadyExisted += 1;
      continue;
    }

    const valid = await validateSolaLocationSlug(slug);
    if (!valid) {
      invalidSkipped += 1;
      continue;
    }

    existingSet.add(slug);
    validAdded += 1;
  }

  const slugs = Array.from(existingSet).sort();
  await writeSolaSeedSlugs(slugs);

  return {
    inputCount: inputs.length,
    validAdded,
    alreadyExisted,
    invalidSkipped,
    slugs,
  };
}
