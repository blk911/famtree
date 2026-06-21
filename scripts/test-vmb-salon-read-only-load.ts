/**
 * npm run test:vmb:salon-read-only-load
 */
import fs from "node:fs";
import path from "node:path";
import {
  isBookAlreadyLoaded,
  shouldRunBookIngest,
} from "../lib/vmb/book-ingest-policy";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function run(): void {
  assert(
    isBookAlreadyLoaded({
      workspace: { firstIngestCompleted: true } as never,
      activeBook: { hasActiveBook: true, analysisId: "analysis-1" },
    }),
    "loaded book detected from workspace ingest flag",
  );

  assert(
    !shouldRunBookIngest(
      {
        workspace: { firstIngestCompleted: true } as never,
        activeBook: { hasActiveBook: true, analysisId: "analysis-1" },
      },
      {},
    ),
    "implicit ingest blocked when book already loaded",
  );

  assert(
    shouldRunBookIngest(
      {
        workspace: { firstIngestCompleted: true } as never,
        activeBook: { hasActiveBook: true, analysisId: "analysis-1" },
      },
      { reprocess: true },
    ),
    "explicit reprocess still allowed",
  );

  const invitesRoute = read("app/api/vmb/invite-drafts/route.ts");
  assert(
    invitesRoute.includes("listInviteDraftsForTrialAnalysis"),
    "invite drafts GET is read-only list",
  );
  assert(
    !invitesRoute.includes("ensureInviteDraftsForAnalysis"),
    "invite drafts GET does not ensure/build drafts",
  );

  const invitesClient = read("components/vmb/VmbInvitesClient.tsx");
  const loadSuggestedBlock = invitesClient.match(/const loadSuggested = useCallback[\s\S]*?\}, \[/);
  assert(!!loadSuggestedBlock, "invites client defines loadSuggested");
  assert(
    !loadSuggestedBlock![0].includes('method: "POST"'),
    "invites suggested tab initial load does not POST",
  );
  assert(!invitesClient.includes("/api/vmb/analyze-book"), "invites client never calls analyze-book");
  assert(invitesClient.includes("/api/taikos/opportunities"), "suggested tab reads existing opportunities");
  assert(invitesClient.includes("/api/vmb/salon-invites"), "suggested tab loads published salon copies");
  assert(invitesClient.includes("SuggestedInviteMatchingDebug"), "suggested tab exposes invite match debug");

  const salonInvitesRoute = read("app/api/vmb/salon-invites/route.ts");
  assert(salonInvitesRoute.includes("salonId"), "salon invites API includes salonId in response");

  const publishStore = read("lib/vmb/invites/salon-invite-local-copy-store.ts");
  assert(publishStore.includes("normalizeSourceTemplateId"), "publish dedupes by normalized template keys");
  assert(
    !publishStore.includes("SALON_INVITE_COPY_POSTGRES_REQUIRED"),
    "publish store does not hard-require postgres in local/dev",
  );
  assert(publishStore.includes("resolveVmbStorageBackend"), "publish store resolves json/postgres backend");
  assert(publishStore.includes("updateSalonInviteLocalCopy"), "salon invite store supports inventory updates");

  const inventoryCard = read("components/vmb/salon/PublishedInvitationInventoryCard.tsx");
  assert(inventoryCard.includes("SalonInvitationThumbnail"), "inventory card renders invitation thumbnail");
  assert(!inventoryCard.includes("Duplicate"), "inventory card omits duplicate action");

  const publishRoute = read("app/api/vmb/invite-library/publish/route.ts");
  assert(publishRoute.includes("backend"), "publish API returns backend diagnostic");

  const approvalsStore = read("lib/vmb/invites/salon-invitation-approval-store.ts");
  assert(approvalsStore.includes("getVmbSalonInvitationApprovalsFile"), "approval store uses json fallback path helper");

  const invitesClientApprovals = read("components/vmb/VmbInvitesClient.tsx");
  assert(invitesClientApprovals.includes("Approved"), "invites client shows Approved tab");
  assert(invitesClientApprovals.includes("/api/vmb/salon-invitation-approvals"), "invites client uses approval API");

  const useInviteDrafts = read("components/vmb/dashboard/useInviteDrafts.ts");
  assert(
    !useInviteDrafts.includes("/api/vmb/invite-drafts/build"),
    "dashboard invite drafts hook does not auto-build on load",
  );

  const analyzeBookRoute = read("app/api/vmb/analyze-book/route.ts");
  assert(analyzeBookRoute.includes("shouldRunBookIngest"), "analyze-book POST guards duplicate ingest");
  assert(analyzeBookRoute.includes("skippedIngest"), "analyze-book returns existing analysis when skipped");

  const startFlow = read("components/vmb/VmbStartFlow.tsx");
  assert(startFlow.includes("/api/vmb/analyze-book"), "explicit load book still posts analyze-book");
  assert(startFlow.includes("reprocess"), "start flow sends reprocess flag for refresh/replace");
  assert(startFlow.includes("UseAdminDemoBookButton"), "load book flow offers admin demo book in dev");

  const restoreRoute = read("app/api/vmb/active-book/restore/route.ts");
  assert(!restoreRoute.includes("analyze-book"), "restore route does not call analyze-book");
  assert(!restoreRoute.includes("ensureInviteDraftsForAnalysis"), "restore route does not generate drafts");

  const restorePanel = read("components/vmb/RestoreExistingBookPanel.tsx");
  assert(!restorePanel.includes("/api/vmb/analyze-book"), "restore panel does not call analyze-book");

  const dashboardClient = read("components/vmb/VmbDashboardClient.tsx");
  assert(dashboardClient.includes("RestoreExistingBookPanel"), "dashboard empty state offers restore");
  assert(dashboardClient.includes("UseAdminDemoBookButton"), "dashboard empty state offers admin demo book");
  assert(dashboardClient.includes("AdminDemoBookNote"), "dashboard shows admin demo book note");

  const salonPagePage = read("app/vmb/salon-page/page.tsx");
  assert(salonPagePage.includes("SalonPageClient"), "salon page route renders client preview");
  assert(salonPagePage.includes("loadVmbPageContext"), "salon page loads trial salon context");

  const salonPageClient = read("components/vmb/salon/SalonPageClient.tsx");
  assert(salonPageClient.includes('status === "active"'), "salon page renders active services only");
  assert(salonPageClient.includes("publishedCopiesForMatching"), "salon page uses published invitations only");
  assert(salonPageClient.includes("SalonInvitationThumbnail"), "salon page renders invitation thumbnails");
  assert(salonPageClient.includes("possessiveLabel"), "salon page personalizes owner copy");
  assert(salonPageClient.includes("shortDescription"), "salon page shows service descriptions");
  assert(salonPageClient.includes("getServiceImage"), "salon page resolves service photos");
  assert(salonPageClient.includes("View Offer"), "salon page includes offer CTA placeholder");
  assert(salonPageClient.includes("Featured Services"), "salon page uses featured services title");
  assert(salonPageClient.includes("Private Offers"), "salon page uses private offers title");
  assert(salonPageClient.includes("resolveInvitationPricing"), "salon page shows offer pricing on cards");
  assert(salonPageClient.includes("Join My Private Client Network"), "salon page includes PCN section");
  assert(salonPageClient.includes("Favorite Providers"), "salon page includes favorite providers section");
  assert(salonPageClient.includes("Join for Updates"), "salon page includes PCN CTA placeholder");
  assert(!salonPageClient.includes("Client preview"), "salon page removes admin preview badge");
  assert(!salonPageClient.includes("Client destination preview"), "salon page removes internal preview banner");
  assert(!salonPageClient.includes("salonServiceStatusLabel"), "salon page hides lifecycle status badges");
  assert(!salonPageClient.includes("/api/vmb/analyze-book"), "salon page does not trigger book ingest");

  const sendPackageCopy = read("lib/vmb/invites/send-package-copy.ts");
  assert(sendPackageCopy.includes("buildSendPackageCopy"), "send package copy helper exists");

  const sendPackageModal = read("components/vmb/salon/SendPackagePreviewModal.tsx");
  assert(sendPackageModal.includes("Send Package Preview"), "send package modal has title");
  assert(sendPackageModal.includes("ViewSalonPageLink"), "send package modal links to salon page");
  assert(sendPackageModal.includes("Send Email — Coming Next"), "send package modal stubs email send");

  const approvedCard = read("components/vmb/salon/ApprovedInvitationCard.tsx");
  assert(approvedCard.includes("Review Send Package"), "approved card exposes send package action");

  const viewSalonPageLink = read("components/vmb/salon/ViewSalonPageLink.tsx");
  assert(viewSalonPageLink.includes("/vmb/salon-page"), "view salon page link targets salon landing route");

  const servicesClient = read("components/vmb/salon/SalonServicesClient.tsx");
  assert(servicesClient.includes("ViewSalonPageLink"), "services page links to salon landing preview");

  const invitesClientLanding = read("components/vmb/VmbInvitesClient.tsx");
  assert(invitesClientLanding.includes("Touch Points"), "invites reframed as touch points");
  assert(
    invitesClientLanding.includes("on your salon page"),
    "invites subhead aligns with salon landing destination",
  );
  assert(invitesClientLanding.includes("ViewSalonPageLink"), "touch points links to salon landing preview");
  assert(invitesClientLanding.includes("SendPackagePreviewModal"), "invites client wires send package preview");

  const approvedSection = read("components/vmb/salon/ApprovedInvitationsSection.tsx");
  assert(approvedSection.includes("Ready to prepare send package"), "approved tab aligns with send package flow");

  const pageContextLoader = read("lib/vmb/load-vmb-page-context.ts");
  assert(pageContextLoader.includes("resolveActiveBookForSession"), "page context auto-binds demo book in dev");

  const activeBookDebug = read("lib/vmb/active-book-debug.ts");
  assert(activeBookDebug.includes("resolveActiveBookForSession"), "active-book API auto-binds demo book in dev");

  const useDemoRoute = read("app/api/vmb/active-book/use-demo/route.ts");
  assert(useDemoRoute.includes("bindAdminDemoBookToSalon"), "use-demo route binds demo analysis");
  assert(!useDemoRoute.includes("analyze-book"), "use-demo does not call analyze-book");
  assert(!useDemoRoute.includes("runVmbBookAnalysis"), "use-demo does not ingest book");

  const clearDemoRoute = read("app/api/vmb/active-book/clear-demo/route.ts");
  assert(clearDemoRoute.includes("clearAdminDemoBookBindingForSalon"), "clear-demo route clears salon binding");
  assert(!clearDemoRoute.includes("deleteVmbBookAnalysis"), "clear-demo does not delete analysis");

  const adminDemoBook = read("lib/vmb/admin-demo-book.ts");
  assert(adminDemoBook.includes("VMB_ADMIN_DEMO_ANALYSIS_ID"), "admin demo book reads analysis env");
  assert(adminDemoBook.includes("isVmbDevOperatorApiEnabled"), "admin demo book disabled in production");
}

async function runIntegrationChecks(): Promise<void> {
  const { bindAdminDemoBookToSalon, clearAdminDemoBookBindingForSalon, maybeAutoBindAdminDemoBook } =
    await import("../lib/vmb/admin-demo-book");
  const { resolveActiveBookForSession } = await import("../lib/vmb/active-book-session-resolver");
  const { resolveActiveBook } = await import("../lib/vmb/active-book-resolver");
  const { runVmbBookAnalysis } = await import("../lib/vmb/run-book-analysis");
  const { createVmbTrialLead } = await import("../lib/vmb/trial-store");
  const { upsertWorkspaceForTrial } = await import("../lib/vmb/workspace-store");
  const { VMB_SAMPLE_BOOK_TEXT } = await import("../lib/vmb/sample-book");

  const prevDemoId = process.env.VMB_ADMIN_DEMO_ANALYSIS_ID;

  const sourceTrial = await createVmbTrialLead({
    salonName: "Demo Source Salon",
    ownerName: "Jenny",
    email: `vmb-demo-source-${Date.now()}@salon.test`,
    providerPlatform: "glossgenius",
  });
  if ("error" in sourceTrial) process.exit(1);

  await upsertWorkspaceForTrial({
    trialId: sourceTrial.lead.id,
    salonName: sourceTrial.lead.salonName,
    providerPlatform: "glossgenius",
  });
  const analyzed = await runVmbBookAnalysis({
    trialId: sourceTrial.lead.id,
    salonName: sourceTrial.lead.salonName,
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  assert(analyzed.ok, "demo bind integration creates source analysis");
  if (!analyzed.ok) process.exit(1);

  process.env.VMB_ADMIN_DEMO_ANALYSIS_ID = analyzed.data.analysis.analysisId;

  const targetTrial = await createVmbTrialLead({
    salonName: "Demo Target Salon",
    ownerName: "Pat",
    email: `vmb-demo-target-${Date.now()}@salon.test`,
    providerPlatform: "glossgenius",
  });
  if ("error" in targetTrial) process.exit(1);
  const targetSalonId = targetTrial.lead.id;
  await upsertWorkspaceForTrial({
    trialId: targetSalonId,
    salonName: targetTrial.lead.salonName,
    providerPlatform: "glossgenius",
  });

  const before = await resolveActiveBookForSession(targetSalonId, {});
  assert(before.hasActiveBook, "auto-bind attaches demo book when session has no active book");
  assert(before.analysisId === analyzed.data.analysis.analysisId, "auto-bind uses configured demo analysis");

  const rebound = await maybeAutoBindAdminDemoBook(targetSalonId);
  assert(!rebound.bound, "auto-bind does not re-bind when active book already exists");

  const cleared = await clearAdminDemoBookBindingForSalon(targetSalonId);
  assert(cleared.ok, "clear-demo removes demo binding for current salon");

  const afterClear = await resolveActiveBook(targetSalonId, {});
  assert(!afterClear.hasActiveBook, "clear-demo returns salon to empty active-book state");

  const manualBind = await bindAdminDemoBookToSalon(targetSalonId);
  assert(manualBind.ok, "manual use-demo bind succeeds");
  if (!manualBind.ok) process.exit(1);

  const afterManual = await resolveActiveBookForSession(targetSalonId, {});
  assert(afterManual.hasActiveBook, "dashboard resolves after manual use-demo bind");

  if (prevDemoId) process.env.VMB_ADMIN_DEMO_ANALYSIS_ID = prevDemoId;
  else delete process.env.VMB_ADMIN_DEMO_ANALYSIS_ID;
}

async function main(): Promise<void> {
  run();
  await runIntegrationChecks();
  console.log("OK: VMB salon read-only load tests passed");
}

void main();
