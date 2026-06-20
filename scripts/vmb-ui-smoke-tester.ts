/**
 * VMB UI Smoke Tester
 *
 * Runs browser route checks against a running Next server.
 * Env:
 * - VMB_QA_BASE_URL=http://127.0.0.1:3000
 */
import fs from "node:fs/promises";
import path from "node:path";

type RouteReport = {
  route: string;
  status: "PASS" | "WARN" | "FAIL";
  errors: string[];
  warnings: string[];
  screenshot: string;
};

const ROUTES = ["/vmb/start", "/vmb/service-presets", "/vmb/invitations", "/vmb/salon-page", "/vmb/activity"];
const BASE_URL = (process.env.VMB_QA_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT_DIR = path.join(process.cwd(), "artifacts", "vmb-ui-smoke-tester");

function routeSlug(route: string): string {
  return route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-") || "root";
}

function ignoredUrl(url: string): boolean {
  return url.startsWith("data:") || url.startsWith("blob:") || url.includes("/_next/webpack-hmr");
}

async function run(): Promise<void> {
  const playwright = (await import("playwright")) as typeof import("playwright");
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await playwright.chromium.launch({ headless: true });
  const reports: RouteReport[] = [];

  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") errors.push(`console error: ${text}`);
      if (/hydration|did not match|react/i.test(text)) warnings.push(`console warning: ${text}`);
    });
    page.on("pageerror", (err) => errors.push(`runtime exception: ${err.message}`));
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (!ignoredUrl(url)) errors.push(`request failed: ${req.method()} ${url} (${req.failure()?.errorText ?? "unknown"})`);
    });
    page.on("response", (res) => {
      const url = res.url();
      const status = res.status();
      if (!ignoredUrl(url) && status >= 400) {
        const kind = /\.(avif|gif|jpe?g|png|svg|webp|css|js|mp4)(\?|$)/i.test(url) ? "asset" : "request";
        errors.push(`${kind} ${status}: ${url}`);
      }
    });

    try {
      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const status = response?.status() ?? 0;
      if (!response) errors.push("page did not return an HTTP response");
      if (status >= 400) errors.push(`page returned HTTP ${status}`);
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {
        warnings.push("network did not become idle within 8s");
      });
      await page.locator("body").waitFor({ state: "visible", timeout: 8_000 });

      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((img) => img.currentSrc && img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc),
      );
      for (const src of brokenImages) errors.push(`broken image component: ${src}`);

      const visibleTextLength = await page.locator("body").innerText({ timeout: 5_000 }).then((text) => text.trim().length);
      if (visibleTextLength < 20) warnings.push("page rendered with very little visible text");
    } catch (err) {
      errors.push(`render failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const screenshot = path.join(OUT_DIR, `${routeSlug(route)}.png`);
    await page.screenshot({ path: screenshot, fullPage: true }).catch((err) => {
      warnings.push(`screenshot failed: ${err instanceof Error ? err.message : String(err)}`);
    });
    await page.close();

    reports.push({
      route,
      status: errors.length ? "FAIL" : warnings.length ? "WARN" : "PASS",
      errors,
      warnings,
      screenshot,
    });
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, "report.json");
  await fs.writeFile(reportPath, JSON.stringify({ baseUrl: BASE_URL, reports }, null, 2), "utf8");

  console.log("Route | Status | Errors | Screenshot");
  console.log("--- | --- | --- | ---");
  for (const report of reports) {
    const detail = [...report.errors, ...report.warnings].join("; ") || "None";
    console.log(`${report.route} | ${report.status} | ${detail} | ${report.screenshot}`);
  }

  if (reports.some((report) => report.status === "FAIL")) {
    process.exit(1);
  }
}

void run().catch((err) => {
  console.error("FAIL: VMB UI Smoke Tester crashed");
  console.error(err);
  process.exit(1);
});
