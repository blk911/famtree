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
import {
  MARKET_INTEL_SIDEBAR_ITEMS,
  PLATFORM_ADMIN_SIDEBAR_ITEMS,
  SIDEBAR_ACCORDION_GROUPS,
  isMarketIntelNestedUnderPlatformAdmin,
  isMarketIntelNavItemActive,
  isMarketIntelSidebarActive,
  isPlatformAdminNavItemActive,
  isPlatformAdminSidebarActive,
  isSettingsSidebarActive,
  isSettingsSidebarRoute,
} from "../lib/admin/sidebar-nav";
import { MARKET_INTEL_ROUTES } from "../lib/markets/market-intel-routes";

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
  assert(ADMIN_WORKSPACE_NAV.length === 7, "seven platform workspaces defined");

  for (const { href, label } of ADMIN_WORKSPACE_NAV) {
    assert(href.startsWith("/admin/"), `${label} href is under /admin`);
    assert(routePageExists(href), `${label} hub page exists at ${href}`);
  }

  for (const hub of ADMIN_PLATFORM_HUB_PATHS) {
    assert(routePageExists(hub), `hub path resolves to page: ${hub}`);
  }

  assert(INVITES_OPERATING_CARDS.length === 8, "eight invites operating cards defined");
  for (const card of INVITES_OPERATING_CARDS) {
    assert(routePageExists(card.href), `invites card route exists: ${card.href}`);
  }

  for (const route of INVITES_CANONICAL_ADMIN_ROUTES) {
    assert(route.startsWith("/admin/invites/"), `canonical invites admin route: ${route}`);
    assert(routePageExists(route), `canonical invites page exists: ${route}`);
  }

  assert(
    INVITES_LEGACY_VMB_ADMIN_REDIRECTS.every(
      ({ from, to }) => from.startsWith("/vmb/admin/") && to.startsWith("/admin/"),
    ),
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

  const sidebarGroupIds = new Set([
    SIDEBAR_ACCORDION_GROUPS.platformAdmin.id,
    SIDEBAR_ACCORDION_GROUPS.marketIntel.id,
    SIDEBAR_ACCORDION_GROUPS.settings.id,
  ]);
  assert(sidebarGroupIds.size === 3, "sidebar accordion groups have distinct ids");
  assert(!isMarketIntelNestedUnderPlatformAdmin(), "market intel is not nested under platform admin");
  assert(
    !PLATFORM_ADMIN_SIDEBAR_ITEMS.some((item) => item.href === MARKET_INTEL_ROUTES.creatorDiscovery),
    "creator discovery route is separate from platform admin discovery hub",
  );
  assert(
    PLATFORM_ADMIN_SIDEBAR_ITEMS.some((item) => item.href === ADMIN_WORKSPACE_ROUTES.discovery),
    "platform admin includes discovery hub",
  );
  assert(
    MARKET_INTEL_SIDEBAR_ITEMS.every(
      (item) => !PLATFORM_ADMIN_SIDEBAR_ITEMS.some((platform) => platform.href === item.href),
    ),
    "market intel child links do not overlap platform admin hubs",
  );

  for (const item of MARKET_INTEL_SIDEBAR_ITEMS) {
    assert(routePageExists(item.href), `market intel sidebar link resolves: ${item.href}`);
  }

  assert(
    isPlatformAdminSidebarActive("/admin/discovery") && !isMarketIntelSidebarActive("/admin/discovery"),
    "/admin/discovery highlights platform admin only",
  );
  assert(
    isPlatformAdminSidebarActive("/admin/discovery") && !isSettingsSidebarActive("/admin/discovery"),
    "/admin/discovery does not highlight settings",
  );
  assert(
    !isSettingsSidebarActive("/admin/markets") && isMarketIntelSidebarActive("/admin/markets"),
    "/admin/markets highlights market intel only",
  );
  assert(isSettingsSidebarRoute("/admin/tools"), "settings routes include admin tools");
  assert(isSettingsSidebarRoute("/admin/activity"), "settings routes include activity log");
  assert(!isSettingsSidebarRoute("/admin/invites/templates"), "invites admin is not a settings route");
  assert(
    isMarketIntelSidebarActive("/admin/markets") && !isPlatformAdminSidebarActive("/admin/markets"),
    "/admin/markets highlights market intel only",
  );
  assert(
    isPlatformAdminNavItemActive("/admin/discovery", ADMIN_WORKSPACE_ROUTES.discovery),
    "platform admin discovery nav item active on hub",
  );
  assert(
    isMarketIntelNavItemActive("/admin/markets", MARKET_INTEL_ROUTES.markets),
    "market intel markets nav item active on hub",
  );
  assert(
    isMarketIntelNavItemActive("/admin/studios/source-ingest", MARKET_INTEL_ROUTES.creatorDiscovery),
    "creator discovery tools active under market intel",
  );

  const sidebarSource = fs.readFileSync(path.join(process.cwd(), "components/AppSidebar.tsx"), "utf8");
  assert(sidebarSource.includes("platformAdminOpen"), "sidebar keeps independent platform admin state");
  assert(sidebarSource.includes("marketIntelOpen"), "sidebar keeps independent market intel state");
  assert(sidebarSource.includes("settingsOpen"), "sidebar keeps independent settings state");
  assert(
    sidebarSource.includes("SIDEBAR_ACCORDION_GROUPS.marketIntel.defaultHref"),
    "market intel accordion navigates to its own default route",
  );
  assert(
    sidebarSource.includes("SIDEBAR_ACCORDION_GROUPS.platformAdmin.defaultHref"),
    "platform admin accordion navigates to its own default route",
  );

  const shellSource = fs.readFileSync(
    path.join(process.cwd(), "components/admin/MarketIntelPageShell.tsx"),
    "utf8",
  );
  assert(!shellSource.includes("mx-auto"), "market intel page shell is left-aligned, not centered");

  const cardTemplateSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/CardTemplateAdminClient.tsx"),
    "utf8",
  );
  assert(cardTemplateSource.includes("vmb-card-template-workspace__types"), "card templates use horizontal type pills");
  assert(cardTemplateSource.includes("vmb-card-template-workspace__body"), "card templates use editor/preview split");
  assert(cardTemplateSource.includes('role="tablist"'), "card template type selector is keyboard accessible");
  assert(
    cardTemplateSource.includes("vmb-card-template-workspace__copy-input"),
    "card template copy fields use two-line textarea inputs",
  );
  assert(
    (cardTemplateSource.match(/vmb-card-template-workspace__copy-input/g) ?? []).length >= 3,
    "headline, body, and CTA fields are editable",
  );
  assert(
    cardTemplateSource.includes("<AdminNailInviteCard"),
    "admin templates page renders AdminNailInviteCard directly",
  );
  assert(!cardTemplateSource.includes("<CardPreview"), "admin templates page does not use CardPreview");
  assert(
    !cardTemplateSource.includes("PersonalInvitePreview"),
    "admin templates page does not use PersonalInvitePreview",
  );
  assert(!cardTemplateSource.includes(">Tone<"), "tone is not shown in nail invite template editor");
  assert(!cardTemplateSource.includes(">Image mode<"), "image mode is not shown in nail invite template editor");
  assert(!cardTemplateSource.includes("CardBuilderImageSlots"), "card images disconnected from admin templates page");
  assert(
    cardTemplateSource.includes("selectedTemplateId"),
    "admin templates page keys selection by template id",
  );
  assert(cardTemplateSource.includes("selectTemplate"), "admin templates page uses shared selectTemplate");
  assert(cardTemplateSource.includes("Final Invite Preview"), "admin preview header is Final Invite Preview");
  assert(!cardTemplateSource.includes("Select invite"), "admin templates page has no invite dropdown");
  assert(
    cardTemplateSource.includes("DEFAULT_NAIL_INVITE_TEMPLATES"),
    "admin templates page seeds tabs from nail catalog ids",
  );
  assert(cardTemplateSource.includes("AdminFinalCardCheckModal"), "admin final card check modal is available");
  assert(cardTemplateSource.includes("Save template"), "invite template save action remains available");
  assert(cardTemplateSource.includes("Reset to default"), "invite template reset action remains available");

  const cardBodySource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/cards/CardBody.tsx"),
    "utf8",
  );
  assert(!cardBodySource.includes("vmb-card-preview__title"), "invite preview hides large title block");
  assert(cardBodySource.includes("vmb-card-preview__copy--lead"), "personal note leads invite preview body");

  const offerOrderSource = fs.readFileSync(
    path.join(process.cwd(), "lib/vmb/offers/offer-display-order.ts"),
    "utf8",
  );
  assert(offerOrderSource.includes("PCN Early Access"), "offer selector priority list includes PCN");
  assert(offerOrderSource.includes("sortOffersForSelectorDisplay"), "offer selector sort helper exists");

  const cardTemplateStyles = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  assert(
    cardTemplateStyles.includes("grid-template-columns: minmax(0, 1fr) minmax(0, 2fr)"),
    "card template layout gives preview the wider column",
  );
  assert(
    cardTemplateStyles.includes(".vmb-card-template-workspace__preview") &&
      cardTemplateStyles.includes("position: sticky"),
    "card template preview remains sticky",
  );
  assert(
    !fs.readFileSync(
      path.join(process.cwd(), "app/(app)/admin/(platform)/invites/templates/page.tsx"),
      "utf8",
    ).includes("InvitesWorkspaceBreadcrumb"),
    "card templates page omits breadcrumb for compact header",
  );

  console.log("OK: admin workspace route tests passed");
  console.log(`  workspaces: ${ADMIN_WORKSPACE_NAV.map((w) => w.href).join(", ")}`);
  console.log(`  invites cards: ${INVITES_OPERATING_CARDS.map((c) => c.id).join(", ")}`);
  console.log(
    `  sidebar groups: ${SIDEBAR_ACCORDION_GROUPS.platformAdmin.id}, ${SIDEBAR_ACCORDION_GROUPS.marketIntel.id}, ${SIDEBAR_ACCORDION_GROUPS.settings.id}`,
  );
}

run();
