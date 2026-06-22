/**
 * npm run test:admin:workspaces
 * Validates admin platform workspace route map — no duplicate engine files introduced.
 */
import fs from "node:fs";
import path from "node:path";
import {
  INVITES_BUILDER_HUB,
  INVITES_CANONICAL_ADMIN_ROUTES,
  INVITES_HUB_COMING_LATER,
  INVITES_HUB_SECONDARY_LINKS,
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
  assert(
    ADMIN_WORKSPACE_NAV.findIndex((item) => item.id === "service-catalog")
      < ADMIN_WORKSPACE_NAV.findIndex((item) => item.id === "invites"),
    "service catalog precedes invites in platform navigation",
  );

  for (const { href, label } of ADMIN_WORKSPACE_NAV) {
    assert(href.startsWith("/admin/"), `${label} href is under /admin`);
    assert(routePageExists(href), `${label} hub page exists at ${href}`);
  }

  for (const hub of ADMIN_PLATFORM_HUB_PATHS) {
    assert(routePageExists(hub), `hub path resolves to page: ${hub}`);
  }

  assert(ADMIN_WORKSPACE_ROUTES.invites === "/admin/invites/builder", "invites nav routes to template builder");
  assert(INVITES_BUILDER_HUB.href === "/admin/invites/builder", "template builder routes to builder page");
  assert(INVITES_HUB_SECONDARY_LINKS.length === 5, "five secondary invites hub links");
  assert(INVITES_HUB_COMING_LATER.length === 3, "three coming-later invites hub links");
  for (const card of INVITES_OPERATING_CARDS) {
    assert(routePageExists(card.href), `invites area route exists: ${card.href}`);
  }

  const invitesHubSource = fs.readFileSync(
    path.join(process.cwd(), "components/admin/workspaces/InvitesOperatingCenter.tsx"),
    "utf8",
  );
  assert(!invitesHubSource.includes("Open Template Builder"), "invites hub removes primary builder CTA");
  assert(!invitesHubSource.includes("vmb-invites-hub__primary"), "invites hub removes primary workbench card");
  assert(invitesHubSource.includes("INVITES_HUB_SECONDARY_LINKS"), "invites hub uses secondary text links");

  const invitesPageSource = fs.readFileSync(
    path.join(process.cwd(), "app/(app)/admin/(platform)/invites/page.tsx"),
    "utf8",
  );
  assert(invitesPageSource.includes('redirect("/admin/invites/builder")'), "invites index redirects to builder");
  assert(!invitesHubSource.includes("INVITES_OPERATING_CARDS.map"), "invites hub does not render card grid");
  assert(!invitesHubSource.includes("Operating areas"), "invites hub removes operating areas grid heading");

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

  const workspaceShellSource = fs.readFileSync(
    path.join(process.cwd(), "components/admin/workspaces/AdminWorkspaceShell.tsx"),
    "utf8",
  );
  assert(workspaceShellSource.includes("vmb-admin-workspace"), "admin workspace shell uses canonical container");
  assert(!workspaceShellSource.includes("MarketIntelPageShell"), "admin workspace shell does not nest market intel shell");

  const builderSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/TemplateBuilderAdminClient.tsx"),
    "utf8",
  );
  assert(builderSource.includes("vmb-admin-builder-grid"), "template builder uses standard three-column grid");
  assert(builderSource.includes("Headline"), "template builder edits headline");
  assert(builderSource.includes("Review Template"), "template builder uses review template action");
  assert(builderSource.includes("AdminTemplateReviewModal"), "template builder includes review modal");
  assert(builderSource.includes('title="Nails Template Builder"'), "builder page title is Nails Template Builder");
  assert(builderSource.includes("activeStep=\"builder\""), "builder uses builder flow step");
  assert(builderSource.includes("SnapshotPreviewCard"), "builder preview renders from snapshot");
  assert(!builderSource.includes("AdminTemplatePreviewCard"), "builder removes live draft preview card");
  assert(!builderSource.includes("Publish To Salons"), "builder does not publish to salons");
  assert(builderSource.includes("✓ Saved to Library"), "builder shows inline save confirmation");
  assert(builderSource.includes("View in Library"), "builder save offers view in library link");
  assert(builderSource.includes("libraryRouteForTemplate"), "view in library links to library route");
  assert(!builderSource.includes("router.push"), "builder save does not navigate away");
  assert(!builderSource.includes("await reload()"), "builder save does not block on full inventory reload");

  const librarySource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/NailsLibraryAdminClient.tsx"),
    "utf8",
  );
  assert(librarySource.includes('title="Nails Library"'), "library page title is Nails Library");
  assert(librarySource.includes("activeStep=\"library\""), "library uses library flow step");
  assert(librarySource.includes("Publish To Salons"), "library includes publish to salons action");
  assert(librarySource.includes("builderRouteForTemplate"), "library edit opens template builder");
  assert(librarySource.includes("Edit in Builder"), "library uses edit in builder label");
  assert(librarySource.includes("Review Final Card"), "library opens final card review");
  assert(librarySource.includes("AdminSalonInviteReviewModal"), "library uses salon invite review modal");
  assert(librarySource.includes("vmb-admin-builder-grid--two-col"), "library uses two-column layout without preview");
  assert(librarySource.includes("formatPublishedDate"), "library displays published date status");
  assert(librarySource.includes("/api/vmb/invite-library/publish"), "library publish persists via API");
  assert(!librarySource.includes("AdminTemplatePreviewCard"), "library removes permanent preview column");
  assert(!librarySource.includes("OfferNailSelectionFields"), "library is read-only — no service checkboxes");
  assert(!librarySource.includes("buildDraftInviteSnapshot"), "library reads stored snapshots only");
  assert(librarySource.includes("savedDrafts"), "library lists saved inventory assets only");
  assert(!librarySource.includes("<dt>Headline</dt>"), "library omits builder-style content fields");

  const flowNavSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/AdminBuilderFlowNav.tsx"),
    "utf8",
  );
  assert(flowNavSource.includes("Invite Builder"), "flow nav shows invite builder step");
  assert(flowNavSource.includes("Library"), "flow nav shows library step");
  assert(flowNavSource.includes("Offer Presets"), "flow nav starts with consolidated offer presets");
  assert(!flowNavSource.includes("Manage Presets"), "flow nav removes duplicate manage presets step");
  assert(!flowNavSource.includes("Service Offers"), "flow nav removes duplicate service offers step");
  assert(!flowNavSource.includes("Template Builder"), "flow nav uses builder label");
  assert(flowNavSource.includes("/admin/invites/builder"), "flow nav links to builder route");
  assert(flowNavSource.includes("/admin/invites/library"), "flow nav links to library route");
  assert(flowNavSource.includes('searchParams.get("categoryId")'), "flow nav preserves selected service category");
  assert(!flowNavSource.includes("Preview"), "flow nav removes preview hint");

  const categoryNavSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/AdminServiceCategoryNav.tsx"),
    "utf8",
  );
  assert(categoryNavSource.includes("listServiceCategories"), "shared builder shell renders canonical category pills");
  assert(categoryNavSource.includes("categoryId="), "category pills persist category in the URL");

  const offerSelectionSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/OfferNailSelectionFields.tsx"),
    "utf8",
  );
  assert(offerSelectionSource.includes("Nail Services"), "template selection shows nail services section");
  assert(offerSelectionSource.includes("Rewards Included"), "template selection shows rewards included section");

  const offerSelectionCss = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  assert(
    offerSelectionCss.includes(".vmb-offer-builder-selections") &&
      offerSelectionCss.includes("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)"),
    "builder services and rewards use two-column layout",
  );

  assert(librarySource.includes("override-dot--published"), "library turns the inventory dot green after publish");
  assert(librarySource.includes("Published ${formatPublishedDate"), "library shows one published status line");
  assert(!librarySource.includes("Publish verification"), "library omits publish verification diagnostics");

  const serviceCatalogSource = fs.readFileSync(
    path.join(process.cwd(), "components/vmb/admin/ServicePresetAdminClient.tsx"),
    "utf8",
  );
  assert(serviceCatalogSource.includes("AdminBuilderShell"), "service catalog uses shared builder shell");
  assert(serviceCatalogSource.includes("aria-expanded"), "offer presets open as an accordion");
  assert(serviceCatalogSource.includes("vmb-service-preset-admin__editor-wrap"), "offer preset accordion uses details and preview");

  const appShellSource = fs.readFileSync(path.join(process.cwd(), "components/AppShell.tsx"), "utf8");
  assert(appShellSource.includes("/admin/service-catalog"), "service catalog uses full-bleed admin layout without page hero");

  const builderStyles = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  assert(builderStyles.includes(".vmb-admin-workspace"), "globals define admin workspace container");
  assert(builderStyles.includes(".vmb-admin-builder"), "globals define admin builder page shell");
  assert(builderStyles.includes(".vmb-nails-library__count"), "globals define nails library shelf styles");

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
