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

  console.log("OK: VMB salon read-only load tests passed");
}

run();
