/**
 * VMB Customer Journey Bot
 *
 * Browser automation for the critical salon-owner path.
 * Env:
 * - VMB_QA_BASE_URL=http://127.0.0.1:3000
 */
import fs from "node:fs/promises";
import path from "node:path";

type StepReport = {
  step: string;
  route: string;
  status: "PASS" | "WARN" | "FAIL";
  findings: string[];
  screenshot: string;
};

const BASE_URL = (process.env.VMB_QA_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT_DIR = path.join(process.cwd(), "artifacts", "vmb-customer-journey-bot");

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function captureStep(page: import("playwright").Page, step: string, route: string, extraFindings: string[] = []): Promise<StepReport> {
  const findings = [...extraFindings];
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch((err) => {
    findings.push(`DOM load timeout: ${err instanceof Error ? err.message : String(err)}`);
  });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {
    findings.push("network did not become idle within 8s");
  });

  const brokenImages = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.currentSrc && img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc),
  );
  for (const src of brokenImages) findings.push(`missing/broken image: ${src}`);

  const disabledPrimaryButtons = await page
    .locator("button")
    .evaluateAll((buttons) =>
      buttons
        .filter((button) => button.textContent?.trim() && button.hasAttribute("disabled"))
        .map((button) => button.textContent?.trim() ?? ""),
    )
    .catch(() => []);
  if (disabledPrimaryButtons.length > 0) {
    findings.push(`disabled buttons visible: ${disabledPrimaryButtons.slice(0, 5).join(", ")}`);
  }

  const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  if (!bodyText.trim()) findings.push("no visible page text");
  if (/\b(coming soon|placeholder|lorem ipsum|dummy)\b/i.test(bodyText)) {
    findings.push("unexpected placeholder copy visible");
  }

  const screenshot = path.join(OUT_DIR, `${slug(step)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true }).catch((err) => {
    findings.push(`screenshot failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  const fatal = findings.some((finding) => /DOM load timeout|missing\/broken image|no visible page text|placeholder/i.test(finding));
  return {
    step,
    route,
    status: fatal ? "FAIL" : findings.length ? "WARN" : "PASS",
    findings,
    screenshot,
  };
}

async function run(): Promise<void> {
  const playwright = (await import("playwright")) as typeof import("playwright");
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const reports: StepReport[] = [];
  const globalFindings: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") globalFindings.push(`console error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => globalFindings.push(`runtime exception: ${err.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("/_next/webpack-hmr")) {
      globalFindings.push(`HTTP ${res.status()}: ${res.url()}`);
    }
  });
  page.on("requestfailed", (req) => {
    if (!req.url().includes("/_next/webpack-hmr")) {
      globalFindings.push(`request failed: ${req.method()} ${req.url()} (${req.failure()?.errorText ?? "unknown"})`);
    }
  });

  await page.goto(`${BASE_URL}/vmb/start`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const useSample = page.getByRole("button", { name: /use sample book/i });
  if (await useSample.isVisible().catch(() => false)) {
    await useSample.click();
  } else {
    globalFindings.push("Use sample book button was not visible on start page");
  }
  reports.push(await captureStep(page, "Open VMB and load demo book", "/vmb/start", globalFindings.splice(0)));

  await page.goto(`${BASE_URL}/vmb/service-presets`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  reports.push(await captureStep(page, "Open Services and verify images", "/vmb/service-presets", globalFindings.splice(0)));

  await page.goto(`${BASE_URL}/vmb/invites`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const previewButton = page.getByRole("button", { name: /preview|view/i }).first();
  if (await previewButton.isVisible().catch(() => false)) {
    await previewButton.click().catch((err) => {
      globalFindings.push(`preview invitation click failed: ${err instanceof Error ? err.message : String(err)}`);
    });
    await page.waitForTimeout(500);
  } else {
    globalFindings.push("no invitation preview button visible");
  }
  reports.push(await captureStep(page, "Open Invitations and preview invite", "/vmb/invites", globalFindings.splice(0)));

  await page.goto(`${BASE_URL}/vmb/salon-page`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const salonText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  if (!/featured|service/i.test(salonText)) {
    globalFindings.push("featured services copy was not visible on salon page");
  }
  reports.push(await captureStep(page, "Open Salon Page and view featured services", "/vmb/salon-page", globalFindings.splice(0)));

  await browser.close();

  await fs.writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify({ baseUrl: BASE_URL, reports }, null, 2), "utf8");

  const overall: "PASS" | "WARN" | "FAIL" = reports.some((r) => r.status === "FAIL")
    ? "FAIL"
    : reports.some((r) => r.status === "WARN")
      ? "WARN"
      : "PASS";

  console.log(`Overall: ${overall}`);
  console.log("Step | Route | Status | Findings | Screenshot");
  console.log("--- | --- | --- | --- | ---");
  for (const report of reports) {
    console.log(`${report.step} | ${report.route} | ${report.status} | ${report.findings.join("; ") || "None"} | ${report.screenshot}`);
  }

  if (overall === "FAIL") process.exit(1);
}

void run().catch((err) => {
  console.error("FAIL: VMB Customer Journey Bot crashed");
  console.error(err);
  process.exit(1);
});
