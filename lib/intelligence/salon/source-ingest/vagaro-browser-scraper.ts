// lib/intelligence/salon/source-ingest/vagaro-browser-scraper.ts
// Tier 2 — Playwright scroll harvest for Vagaro directory pages (optional dependency).

import type { DirectoryRawListing } from "./types";
import {
  mergeVagaroDirectoryListings,
  scrapeVagaroDirectoryHtml,
} from "./vagaro-directory-scraper";

export const PLAYWRIGHT_UNAVAILABLE_WARNING =
  "Full scroll harvest requires browser scraper support. Install Playwright: npm install playwright && npx playwright install chromium";

const MAX_SCROLL_ATTEMPTS = 50;
const STALE_SCROLL_LIMIT = 3;
const SCROLL_WAIT_MS = 900;
const INITIAL_WAIT_MS = 2500;

export type VagaroScrollMode = "static" | "full_scroll";

export type VagaroBrowserScrapeResult = {
  listings: DirectoryRawListing[];
  warnings: string[];
  scrollModeUsed: VagaroScrollMode;
  scrollAttempts: number;
  available: boolean;
};

type PlaywrightChromium = {
  launch: (opts?: { headless?: boolean }) => Promise<{
    newPage: () => Promise<PlaywrightPage>;
    close: () => Promise<void>;
  }>;
};

type PlaywrightPage = {
  goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  evaluate: <T>(fn: () => T) => Promise<T>;
  content: () => Promise<string>;
  close: () => Promise<void>;
};

async function loadPlaywrightChromium(): Promise<PlaywrightChromium | null> {
  try {
    const mod = (await import("playwright")) as { chromium: PlaywrightChromium };
    return mod.chromium ?? null;
  } catch {
    return null;
  }
}

async function countProviderCards(page: PlaywrightPage): Promise<number> {
  return page.evaluate(() => {
    return document.querySelectorAll('[id^="lnkServiceProvider_"]').length;
  });
}

export async function scrapeVagaroDirectoryWithBrowser(
  directoryUrl: string,
  opts?: { market?: string; category?: string },
): Promise<VagaroBrowserScrapeResult> {
  const warnings: string[] = [];
  const chromium = await loadPlaywrightChromium();

  if (!chromium) {
    return {
      listings: [],
      warnings: [PLAYWRIGHT_UNAVAILABLE_WARNING],
      scrollModeUsed: "static",
      scrollAttempts: 0,
      available: false,
    };
  }

  let browser: Awaited<ReturnType<PlaywrightChromium["launch"]>> | null = null;
  let page: PlaywrightPage | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(directoryUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(INITIAL_WAIT_MS);

    try {
      await page.evaluate(() => {
        const first = document.querySelector('[id^="lnkServiceProvider_"]');
        if (first) first.scrollIntoView({ block: "center" });
      });
      await page.waitForTimeout(500);
    } catch {
      // non-fatal
    }

    let scrollAttempts = 0;
    let staleStreak = 0;
    let lastCount = await countProviderCards(page);

    while (scrollAttempts < MAX_SCROLL_ATTEMPTS && staleStreak < STALE_SCROLL_LIMIT) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(SCROLL_WAIT_MS);
      scrollAttempts++;

      const count = await countProviderCards(page);
      if (count <= lastCount) {
        staleStreak++;
      } else {
        staleStreak = 0;
        lastCount = count;
      }
    }

    const html = await page.content();
    const scraped = scrapeVagaroDirectoryHtml(html, directoryUrl, opts);
    const listings = scraped.listings.map((row) => ({
      ...row,
      evidence: [
        ...row.evidence.filter((e) => !e.startsWith("Harvest:")),
        `Harvest: browser scroll (${scrollAttempts} scrolls, ${lastCount} cards in DOM)`,
      ],
    }));

    if (listings.length === 0) {
      warnings.push(
        "Browser scroll completed but no Vagaro provider cards were parsed from the final DOM.",
      );
      warnings.push(...scraped.warnings);
    }

    return {
      listings,
      warnings,
      scrollModeUsed: "full_scroll",
      scrollAttempts,
      available: true,
    };
  } catch (e) {
    warnings.push(
      `Browser scroll harvest failed: ${e instanceof Error ? e.message : String(e)}`,
    );
    return {
      listings: [],
      warnings,
      scrollModeUsed: "static",
      scrollAttempts: 0,
      available: true,
    };
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}

/** Run browser scroll and merge with static listings (browser wins on duplicate keys). */
export async function scrapeVagaroDirectoryTiered(
  directoryUrl: string,
  staticListings: DirectoryRawListing[],
  fullScroll: boolean,
  opts?: { market?: string; category?: string },
): Promise<{
  listings: DirectoryRawListing[];
  warnings: string[];
  staticCandidatesFound: number;
  browserCandidatesFound: number;
  scrollModeUsed: VagaroScrollMode;
  scrollAttempts: number;
}> {
  const staticCandidatesFound = staticListings.length;
  if (!fullScroll) {
    return {
      listings: staticListings,
      warnings: [],
      staticCandidatesFound,
      browserCandidatesFound: 0,
      scrollModeUsed: "static",
      scrollAttempts: 0,
    };
  }

  const browser = await scrapeVagaroDirectoryWithBrowser(directoryUrl, opts);
  const browserCandidatesFound = browser.listings.length;

  if (!browser.available) {
    return {
      listings: staticListings,
      warnings: browser.warnings,
      staticCandidatesFound,
      browserCandidatesFound: 0,
      scrollModeUsed: "static",
      scrollAttempts: 0,
    };
  }

  const listings = mergeVagaroDirectoryListings(staticListings, browser.listings);

  return {
    listings,
    warnings: browser.warnings,
    staticCandidatesFound,
    browserCandidatesFound,
    scrollModeUsed: browser.scrollModeUsed,
    scrollAttempts: browser.scrollAttempts,
  };
}
