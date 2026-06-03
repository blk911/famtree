// lib/intelligence/salon/source-ingest/playwright-runtime.ts
// Detect Playwright package + Chromium binary before browser directory harvest.

import { access } from "fs/promises";

export const PLAYWRIGHT_PACKAGE_MISSING_WARNING =
  "Full scroll harvest requires Playwright. Install: npm install playwright";

export const PLAYWRIGHT_BROWSER_MISSING_WARNING =
  "Full scroll harvest requires the Playwright Chromium browser. Run: npx playwright install chromium";

export type PlaywrightRuntimeStatus = {
  packageInstalled: boolean;
  browserAvailable: boolean;
};

let cachedStatus: PlaywrightRuntimeStatus | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

export async function getPlaywrightRuntimeStatus(
  forceRefresh = false,
): Promise<PlaywrightRuntimeStatus> {
  const now = Date.now();
  if (!forceRefresh && cachedStatus && now - cacheAt < CACHE_MS) {
    return cachedStatus;
  }

  let packageInstalled = false;
  try {
    await import("playwright");
    packageInstalled = true;
  } catch {
    cachedStatus = { packageInstalled: false, browserAvailable: false };
    cacheAt = now;
    return cachedStatus;
  }

  try {
    const pw = (await import("playwright")) as unknown as {
      chromium: { executablePath: () => string };
    };
    const executablePath = pw.chromium.executablePath();
    await access(executablePath);
    cachedStatus = { packageInstalled: true, browserAvailable: true };
  } catch {
    cachedStatus = { packageInstalled: true, browserAvailable: false };
  }

  cacheAt = now;
  return cachedStatus;
}

/** Map launch failures to operator-safe warnings (no stack traces). */
export function formatPlaywrightHarvestWarning(error: unknown): {
  warning: string;
  browserAvailable: boolean;
} {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (
    lower.includes("executable doesn't exist") ||
    lower.includes('executable doesn\'t exist') ||
    lower.includes("executable path") ||
    lower.includes("npx playwright install") ||
    lower.includes("browserType.launch")
  ) {
    return {
      warning: PLAYWRIGHT_BROWSER_MISSING_WARNING,
      browserAvailable: false,
    };
  }

  if (lower.includes("cannot find module") && lower.includes("playwright")) {
    return {
      warning: PLAYWRIGHT_PACKAGE_MISSING_WARNING,
      browserAvailable: false,
    };
  }

  return {
    warning:
      "Browser scroll harvest could not complete. Ensure Chromium is installed: npx playwright install chromium",
    browserAvailable: false,
  };
}

export async function resolvePlaywrightBrowserWarning(
  status?: PlaywrightRuntimeStatus,
): Promise<string | null> {
  const s = status ?? (await getPlaywrightRuntimeStatus());
  if (!s.packageInstalled) return PLAYWRIGHT_PACKAGE_MISSING_WARNING;
  if (!s.browserAvailable) return PLAYWRIGHT_BROWSER_MISSING_WARNING;
  return null;
}
