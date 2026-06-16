/**
 * npm run test:admin:workspaces
 * Validates admin platform workspace route map — no duplicate engine files introduced.
 */
import fs from "node:fs";
import path from "node:path";
import {
  INVITES_CANONICAL_ADMIN_ROUTES,
  INVITES_LEGACY_VMB_ADMIN_REDIRECTS,
  INVITES_OPERATING_CARDS,
} from "../lib/admin/invites-workspace";
import {
  ADMIN_PLATFORM_HUB_PATHS,
  ADMIN_WORKSPACE_NAV,
  ADMIN_WORKSPACE_ROUTES,
  DISCOVERY_WORKSPACE_SECTIONS,
} from "../lib/admin/workspace-routes";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function routePageExists(routePath: string): boolean {
  const afterAdmin = routePath.replace(/^\/admin\//, "");
  const segments = afterAdmin.split("/").filter(Boolean);
  const platformPath = path.join(
    process.cwd(),
    "app",
    "(app)",
    "admin",
    "(platform)",
    ...segments,
    "page.tsx",
  );
  const legacyPath = path.join(process.cwd(), "app", "(app)", "admin", ...segments, "page.tsx");
  const vmbPath = path.join(process.cwd(), "app", "vmb", "admin", ...segments.slice(1), "page.tsx");
  return (
    fs.existsSync(platformPath) || fs.existsSync(legacyPath) || (segments[0] === "invites" && fs.existsSync(vmbPath))
  );
}

function run(): void {
  assert(ADMIN_WORKSPACE_NAV.length === 6, "six platform workspaces defined");

  for (const { href, label } of ADMIN_WORKSPACE_NAV) {
    assert(href.startsWith("/admin/"), `${label} href is under /admin`);
    assert(routePageExists(href), `${label} hub page exists at ${href}`);
  }

  for (const hub of ADMIN_PLATFORM_HUB_PATHS) {
    assert(routePageExists(hub), `hub path resolves to page: ${hub}`);
  }

  assert(INVITES_OPERATING_CARDS.length === 9, "nine invites operating cards defined");
  for (const card of INVITES_OPERATING_CARDS) {
    assert(routePageExists(card.href), `invites card route exists: ${card.href}`);
  }

  for (const route of INVITES_CANONICAL_ADMIN_ROUTES) {
    assert(route.startsWith("/admin/invites/"), `canonical invites admin route: ${route}`);
    assert(routePageExists(route), `canonical invites page exists: ${route}`);
  }

  assert(
    INVITES_LEGACY_VMB_ADMIN_REDIRECTS.every(({ from, to }) => from.startsWith("/vmb/admin/") && to.startsWith("/admin/invites/")),
    "legacy vmb admin redirect map is valid",
  );

  const discoveryLinks = DISCOVERY_WORKSPACE_SECTIONS.flatMap((s) => s.links);
  const enginePaths = [
    "lib/intelligence/salon/source-ingest/vagaro-directory-scraper.ts",
    "lib/intelligence/salon/source-ingest/vagaro-browser-scraper.ts",
    "lib/intelligence/salon/provider-validation/validators/glossgenius-validator.ts",
    "lib/intelligence/salon/source-ingest/sola-ingest-handoff.ts",
    "lib/intelligence/salon/public-presence/discovery-engine.ts",
  ];
  for (const engine of enginePaths) {
    assert(fs.existsSync(path.join(process.cwd(), engine)), `single source engine retained: ${engine}`);
  }

  const duplicateCandidates = [
    "lib/vmbsalons/discovery",
    "lib/vmb/discovery/harvester.ts",
    "lib/vmb/social/harvester.ts",
  ];
  for (const dup of duplicateCandidates) {
    assert(!fs.existsSync(path.join(process.cwd(), dup)), `no duplicate engine path: ${dup}`);
  }

  assert(
    ADMIN_WORKSPACE_ROUTES.discovery === "/admin/discovery",
    "discovery route canonical",
  );

  assert(
    DISCOVERY_WORKSPACE_SECTIONS.some((section) =>
      section.links.some((link) => link.href === "/admin/studios/source-ingest"),
    ),
    "discovery hub links to source ingest tool",
  );
  assert(
    DISCOVERY_WORKSPACE_SECTIONS.some((section) =>
      section.links.some((link) => link.href === "/admin/studios/creator-lab/hashtag-harvest"),
    ),
    "discovery hub links to hashtag harvest tool",
  );

  for (const route of ["/admin/invites/opens", "/admin/invites/conversions"]) {
    const pagePath = path.join(
      process.cwd(),
      "app",
      "(app)",
      "admin",
      "(platform)",
      route.replace(/^\/admin\//, ""),
      "page.tsx",
    );
    assert(fs.existsSync(pagePath), `invites analytics page exists: ${route}`);
    const source = fs.readFileSync(pagePath, "utf8");
    assert(source.includes("InvitesEventsAdminPanel"), `${route} reads invite events`);
    assert(source.includes("emptyMessage"), `${route} renders empty state copy`);
  }

  const claimsPagePath = path.join(
    process.cwd(),
    "app",
    "(app)",
    "admin",
    "(platform)",
    "invites",
    "claims",
    "page.tsx",
  );
  assert(fs.existsSync(claimsPagePath), "invites claims page exists");
  const claimsSource = fs.readFileSync(claimsPagePath, "utf8");
  assert(claimsSource.includes("InvitesClaimsAdminPanel"), "claims page uses claims admin panel");

  console.log("OK: admin workspace route tests passed");
  console.log(`  workspaces: ${ADMIN_WORKSPACE_NAV.map((w) => w.href).join(", ")}`);
  console.log(`  invites cards: ${INVITES_OPERATING_CARDS.map((c) => c.id).join(", ")}`);
}

run();
