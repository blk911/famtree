/**
 * npm run test:vmb:operator-flow
 * Smoke tests for VMB operator shell wiring after admin consolidation.
 */
import fs from "node:fs";
import path from "node:path";
import {
  VMB_BOOK_LOAD_LABEL,
  VMB_BOOK_LOAD_ROUTE,
} from "../lib/vmb/book-load-cta";
import {
  VMB_BOOK_IMPORT_CHAIN,
  VMB_GGEN_BRIDGE_MODULE,
  VMB_OPERATOR_SHELL_ROUTES,
} from "../lib/vmb/vmb-operator-routes";
import { VMB_SALON_NAV } from "../lib/vmb/salon-nav";
import { VMB_ANALYSIS_ROUTES } from "../lib/vmb/salon-href";
import { buildVmbSalonNavHref } from "../lib/vmb/salon-nav-href";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function routePageExists(routePath: string): boolean {
  if (routePath === "/vmb") {
    return fs.existsSync(path.join(process.cwd(), "app", "vmb", "page.tsx"));
  }
  const segments = routePath.replace(/^\/vmb\//, "").split("/").filter(Boolean);
  const pagePath = path.join(process.cwd(), "app", "vmb", ...segments, "page.tsx");
  if (fs.existsSync(pagePath)) return true;
  if (segments.length === 1) {
    return fs.existsSync(path.join(process.cwd(), "app", "vmb", `${segments[0]}.tsx`));
  }
  return false;
}

function run(): void {
  assert(VMB_BOOK_LOAD_ROUTE === "/vmb/start", "book load route is /vmb/start");
  assert(VMB_BOOK_LOAD_LABEL === "Load your book", "book load label canonical");

  for (const route of VMB_OPERATOR_SHELL_ROUTES) {
    assert(routePageExists(route), `operator shell page exists: ${route}`);
  }

  assert(routePageExists("/vmb/start"), "book load page exists");
  assert(
    fs.existsSync(path.join(process.cwd(), "app/vmb/invite/[inviteId]/page.tsx")),
    "recipient landing page exists",
  );
  assert(
    fs.existsSync(path.join(process.cwd(), "app/vmb/invite/[inviteId]/claim/page.tsx")),
    "recipient claim page exists",
  );

  const todaySource = read("components/vmb/VmbTodayClient.tsx");
  assert(todaySource.includes("LoadYourBookCta"), "Today locked state exposes Load your book CTA");
  assert(todaySource.includes("TodayCommandCenter"), "Today loaded state renders command center");
  assert(todaySource.includes("buildTodayCommandCenterSnapshot"), "Today builds command center snapshot");

  const summaryRail = read("components/vmb/VmbSummaryRail.tsx");
  assert(summaryRail.includes("LoadYourBookCta"), "summary rail shows load book CTA when empty");

  const salonShell = read("components/vmb/VmbSalonShell.tsx");
  assert(salonShell.includes("LoadYourBookCta"), "salon shell topbar shows load book CTA when no analysis");

  const startFlow = read("components/vmb/VmbStartFlow.tsx");
  assert(startFlow.includes("/api/vmb/analyze-book"), "start flow posts to analyze-book API");
  assert(startFlow.includes("/api/vmb/trial"), "start flow uses trial API");
  assert(startFlow.includes("VMB_BOOK_LOAD_LABEL"), "start flow uses Load your book label constant");

  const nextConfig = read("next.config.mjs");
  assert(nextConfig.includes('"/vmb/dashboard"'), "dashboard redirect configured");
  assert(nextConfig.includes('"/vmb/today"'), "dashboard redirect targets today");

  assert(VMB_SALON_NAV.some((item) => item.href === "/vmb/today"), "nav home is Today");
  assert(VMB_SALON_NAV.some((item) => item.href === "/vmb/queue"), "nav includes queue");
  assert(VMB_SALON_NAV.some((item) => item.href === "/vmb/invites"), "nav includes invites");

  const analysisId = "analysis-test-id";
  for (const route of ["/vmb/today", "/vmb/queue", "/vmb/campaigns", "/vmb/opportunities"]) {
    assert(VMB_ANALYSIS_ROUTES.has(route), `${route} preserves analysis param`);
    const href = buildVmbSalonNavHref(
      VMB_SALON_NAV.find((item) => item.href === route)!,
      analysisId,
    );
    assert(href.includes("analysis="), `${route} nav href carries analysis`);
  }

  assert(
    VMB_BOOK_IMPORT_CHAIN.loadUiRoute === VMB_BOOK_LOAD_ROUTE,
    "import chain starts at load UI",
  );
  assert(
    fs.existsSync(path.join(process.cwd(), VMB_GGEN_BRIDGE_MODULE)),
    "GGen bridge module retained (admin/intelligence path)",
  );
  assert(
    !read("components/vmb/VmbStartFlow.tsx").includes("/admin/discovery"),
    "product start flow does not link admin discovery",
  );

  console.log("OK: VMB operator flow wiring tests passed");
  console.log(`  shell routes: ${VMB_OPERATOR_SHELL_ROUTES.join(", ")}`);
  console.log(`  book load: ${VMB_BOOK_LOAD_ROUTE}`);
}

run();
