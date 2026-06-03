// lib/intelligence/salon/source-ingest/vagaro-browser-scraper.ts
// Tier 2 — Playwright scroll harvest for Vagaro directory pages (optional dependency).

import type { DirectoryRawListing } from "./types";
import {
  mergeVagaroDirectoryListings,
  scrapeVagaroDirectoryHtml,
} from "./vagaro-directory-scraper";
import {
  formatPlaywrightHarvestWarning,
  getPlaywrightRuntimeStatus,
  PLAYWRIGHT_BROWSER_MISSING_WARNING,
  PLAYWRIGHT_PACKAGE_MISSING_WARNING,
  resolvePlaywrightBrowserWarning,
} from "./playwright-runtime";

export const PLAYWRIGHT_UNAVAILABLE_WARNING = PLAYWRIGHT_PACKAGE_MISSING_WARNING;

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
  /** Playwright package present */
  packageInstalled: boolean;
  /** Chromium binary installed and launchable */
  browserAvailable: boolean;
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
  const status = await getPlaywrightRuntimeStatus();
  if (!status.packageInstalled || !status.browserAvailable) {
    return null;
  }
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

function unavailableResult(warning: string, status: {
  packageInstalled: boolean;
  browserAvailable: boolean;
}): VagaroBrowserScrapeResult {
  return {
    listings: [],
    warnings: [warning],
    scrollModeUsed: "static",
    scrollAttempts: 0,
    packageInstalled: status.packageInstalled,
    browserAvailable: status.browserAvailable,
  };
}

export async function scrapeVagaroDirectoryWithBrowser(
  directoryUrl: string,
  opts?: { market?: string; category?: string },
): Promise<VagaroBrowserScrapeResult> {
  const status = await getPlaywrightRuntimeStatus();
  const preflightWarning = await resolvePlaywrightBrowserWarning(status);
  if (preflightWarning) {
    return unavailableResult(preflightWarning, status);
  }

  const chromium = await loadPlaywrightChromium();
  if (!chromium) {
    return unavailableResult(PLAYWRIGHT_BROWSER_MISSING_WARNING, {
      packageInstalled: status.packageInstalled,
      browserAvailable: false,
    });
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

    const warnings: string[] = [];
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
      packageInstalled: true,
      browserAvailable: true,
    };
  } catch (e) {
    const formatted = formatPlaywrightHarvestWarning(e);
    getPlaywrightRuntimeStatus(true).catch(() => undefined);
    return {
      listings: [],
      warnings: [formatted.warning],
      scrollModeUsed: "static",
      scrollAttempts: 0,
      packageInstalled: status.packageInstalled,
      browserAvailable: formatted.browserAvailable,
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
  browserAvailable: boolean;
}> {
  const staticCandidatesFound = staticListings.length;
  if (!fullScroll) {
    const status = await getPlaywrightRuntimeStatus();
    return {
      listings: staticListings,
      warnings: [],
      staticCandidatesFound,
      browserCandidatesFound: 0,
      scrollModeUsed: "static",
      scrollAttempts: 0,
      browserAvailable: status.browserAvailable,
    };
  }

  const browser = await scrapeVagaroDirectoryWithBrowser(directoryUrl, opts);
  const browserCandidatesFound = browser.listings.length;

  if (!browser.browserAvailable || browser.scrollModeUsed !== "full_scroll") {
    return {
      listings: staticListings,
      warnings: browser.warnings,
      staticCandidatesFound,
      browserCandidatesFound: 0,
      scrollModeUsed: "static",
      scrollAttempts: 0,
      browserAvailable: browser.browserAvailable,
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
    browserAvailable: true,
  };
}
