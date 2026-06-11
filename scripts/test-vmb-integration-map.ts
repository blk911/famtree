/**
 * npm run test:vmb:integration-map
 * Verifies integration map modules exist and nav/context contracts hold.
 */
import { existsSync } from "fs";
import path from "path";
import { getActiveVmbAnalysis } from "../lib/vmb/active-analysis-resolver";
import { loadVmbPageContext } from "../lib/vmb/load-vmb-page-context";
import {
  buildVmbInviteSectionHref,
  buildVmbSalonHref,
  VMB_ANALYSIS_ROUTES,
} from "../lib/vmb/salon-href";
import { VMB_SALON_NAV } from "../lib/vmb/salon-nav";
import { buildVmbSalonNavHref } from "../lib/vmb/salon-nav-href";
import { workspaceLatestAnalysisId } from "../lib/vmb/workspace-lifecycle";
import { getWorkspaceForTrial, setLatestAnalysis, upsertWorkspaceForTrial } from "../lib/vmb/workspace-store";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "../lib/vmb/trial-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const ROOT = process.cwd();

const ENGINE_MODULES = [
  "lib/vmb/trial-store.ts",
  "lib/vmb/workspace-store.ts",
  "lib/vmb/active-analysis-resolver.ts",
  "lib/vmb/load-vmb-page-context.ts",
  "lib/vmb/invites/build-invite-drafts-for-analysis.ts",
  "lib/vmb/invite-drafts/invite-draft-store.ts",
  "lib/vmb/operating-system/index.ts",
  "lib/vmb/client-opportunities.ts",
  "docs/vmb-mvp-integration-map.md",
];

async function run(): Promise<void> {
  for (const rel of ENGINE_MODULES) {
    assert(existsSync(path.join(ROOT, rel)), `engine module exists: ${rel}`);
  }

  const trial = await createVmbTrialLead({
    salonName: "Map Test Salon",
    ownerName: "Map Owner",
    email: `map-${Date.now()}@salon.test`,
  });
  if ("error" in trial) process.exit(1);
  const trialId = trial.lead.id;

  await upsertWorkspaceForTrial({
    trialId,
    salonName: trial.lead.salonName,
    ownerName: trial.lead.ownerName,
    email: trial.lead.email,
  });

  const analyzed = await runVmbBookAnalysis({
    trialId,
    salonName: trial.lead.salonName,
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  if (!analyzed.ok) process.exit(1);
  await setLatestAnalysis(trialId, analyzed.data.analysis.analysisId);

  const ws = await getWorkspaceForTrial(trialId);
  const latestId = workspaceLatestAnalysisId(ws);
  assert(!!latestId, "context loader path: workspace latest set");

  const resolved = await getActiveVmbAnalysis(trialId, {});
  assert(resolved.analysisId === latestId, "context resolves workspace latest");

  for (const route of Array.from(VMB_ANALYSIS_ROUTES)) {
    const href = buildVmbSalonHref(route, latestId!);
    assert(href.includes("analysis="), `${route} preserves analysis in nav href`);
  }

  assert(
    buildVmbSalonHref("/vmb/start?mode=refresh", latestId!) === "/vmb/start?mode=refresh",
    "book refresh href stable",
  );

  for (const item of VMB_SALON_NAV) {
    const href = buildVmbSalonNavHref(item, latestId!);
    assert(href.startsWith("/vmb"), `nav item ${item.label} produces valid href`);
  }

  const invitesHandoff = buildVmbInviteSectionHref(latestId!, "new_client_welcome");
  assert(invitesHandoff.includes("/vmb/invites"), "dashboard handoff targets invites");
  assert(invitesHandoff.includes("section=new_client_welcome"), "dashboard handoff section");

  assert(VMB_SALON_NAV.some((n) => n.href === "/vmb/invites"), "invites in salon nav");
  assert(!VMB_SALON_NAV.some((n) => n.href.includes("/admin")), "no admin in salon nav");

  assert(typeof loadVmbPageContext === "function", "loadVmbPageContext available");

  console.log("OK: VMB integration map tests passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
