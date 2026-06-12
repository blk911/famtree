/**
 * npm run test:vmb:invite-drafts-storage
 */
import { promises as fs } from "fs";
import { ensureVmbStorageTables, resetVmbStorageBackendCache, resolveVmbStorageBackend } from "../lib/vmb/db";
import {
  ensureInviteDraftsForAnalysis,
  listInviteDraftsForTrialAnalysis,
  patchInviteDraftForTrial,
} from "../lib/vmb/invite-drafts/invite-draft-store";
import { deleteInviteDraftsForTrialPostgres } from "../lib/vmb/invite-drafts/invite-draft-store-postgres";
import {
  INVITE_DRAFT_POSTGRES_REQUIRED,
  mapInviteDraftStoreErrorForApi,
} from "../lib/vmb/invite-drafts/invite-draft-storage-errors";
import { getVmbInviteDraftsFile } from "../lib/vmb/paths";
import { vmbJsonFallbackAllowed } from "../lib/vmb/storage-policy";
import { runVmbBookAnalysis } from "../lib/vmb/run-book-analysis";
import { VMB_SAMPLE_BOOK_TEXT } from "../lib/vmb/sample-book";
import { createVmbTrialLead } from "../lib/vmb/trial-store";
import { upsertWorkspaceForTrial, setLatestAnalysis } from "../lib/vmb/workspace-store";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function testVercelWithoutDatabase(): Promise<void> {
  const prevVercel = process.env.VERCEL;
  const prevDb = process.env.DATABASE_URL;
  process.env.VERCEL = "1";
  delete process.env.DATABASE_URL;
  resetVmbStorageBackendCache();

  const patchResult = await patchInviteDraftForTrial("draft-no-db", "trial-no-db", {
    status: "approved",
  });
  assert("error" in patchResult, "Vercel without DATABASE_URL must not persist invite drafts");
  if ("error" in patchResult) {
    assert(patchResult.error === INVITE_DRAFT_POSTGRES_REQUIRED, "returns POSTGRES_REQUIRED code");
    const mapped = mapInviteDraftStoreErrorForApi(patchResult.error);
    assert(mapped.error === INVITE_DRAFT_POSTGRES_REQUIRED, "API maps to POSTGRES_REQUIRED");
    assert(mapped.status === 503, "API status 503 for postgres required");
  }
  assert(vmbJsonFallbackAllowed() === false, "JSON fallback blocked on Vercel");

  if (prevVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prevVercel;
  if (prevDb) process.env.DATABASE_URL = prevDb;
  resetVmbStorageBackendCache();
}

async function run(): Promise<void> {
  await testVercelWithoutDatabase();

  if (!process.env.DATABASE_URL?.trim()) {
    console.log("SKIP: Postgres invite draft persistence tests (no DATABASE_URL)");
    console.log("OK: VMB invite draft storage policy tests passed");
    return;
  }

  await ensureVmbStorageTables();
  const backend = await resolveVmbStorageBackend();
  assert(backend === "postgres", `expected postgres backend, got ${backend}`);

  const trial = await createVmbTrialLead({
    salonName: "Invite Storage Salon",
    ownerName: "Owner",
    email: `invite-storage-${Date.now()}@salon.test`,
    providerPlatform: "glossgenius",
  });
  if ("error" in trial) process.exit(1);
  const trialId = trial.lead.id;

  await upsertWorkspaceForTrial({
    trialId,
    salonName: trial.lead.salonName,
    ownerName: trial.lead.ownerName,
    email: trial.lead.email,
    providerPlatform: "glossgenius",
  });

  const analyzed = await runVmbBookAnalysis({
    trialId,
    salonName: trial.lead.salonName,
    providerPlatform: "glossgenius",
    rawText: VMB_SAMPLE_BOOK_TEXT,
    sourceType: "sample",
  });
  if (!analyzed.ok) process.exit(1);
  const analysisId = analyzed.data.analysis.analysisId;
  await setLatestAnalysis(trialId, analysisId);

  const ensured = await ensureInviteDraftsForAnalysis(trialId, analysisId);
  if ("error" in ensured) {
    console.error("ensure failed:", ensured.error);
    process.exit(1);
  }
  assert(ensured.drafts.length > 0, "ensure builds invite drafts in Postgres");
  assert(typeof ensured.drafts[0]?.draftId === "string", "API shape: draftId present");
  assert(typeof ensured.drafts[0]?.clientName === "string", "API shape: clientName present");
  assert(typeof ensured.drafts[0]?.status === "string", "API shape: status present");

  const listed = await listInviteDraftsForTrialAnalysis(trialId, analysisId);
  assert(listed.length === ensured.drafts.length, "list returns persisted drafts");

  const target = ensured.drafts[0];
  const approved = await patchInviteDraftForTrial(target.draftId, trialId, {
    status: "approved",
    editableMessage: "Edited invite copy for storage test.",
  });
  if ("error" in approved) {
    console.error("patch approve failed:", approved.error);
    process.exit(1);
  }
  assert(approved.draft.status === "approved", "patch approve persists");
  assert(
    approved.draft.editableMessage === "Edited invite copy for storage test.",
    "patch edit message persists",
  );

  const reloaded = await listInviteDraftsForTrialAnalysis(trialId, analysisId);
  const reloadedDraft = reloaded.find((d) => d.draftId === target.draftId);
  assert(reloadedDraft?.status === "approved", "approved status survives reload");
  assert(
    reloadedDraft?.editableMessage === "Edited invite copy for storage test.",
    "edited message survives reload",
  );

  if (ensured.drafts[1]) {
    const skipped = await patchInviteDraftForTrial(ensured.drafts[1].draftId, trialId, {
      status: "skipped",
    });
    if ("error" in skipped) process.exit(1);
    const afterSkip = await listInviteDraftsForTrialAnalysis(trialId, analysisId);
    assert(
      afterSkip.find((d) => d.draftId === ensured.drafts[1].draftId)?.status === "skipped",
      "skip persists after reload",
    );
  }

  const secondEnsure = await ensureInviteDraftsForAnalysis(trialId, analysisId);
  if ("error" in secondEnsure) process.exit(1);
  assert(secondEnsure.drafts.length === ensured.drafts.length, "ensure does not duplicate drafts");
  assert(
    secondEnsure.drafts.find((d) => d.draftId === target.draftId)?.status === "approved",
    "ensure preserves approved status",
  );

  await deleteInviteDraftsForTrialPostgres(trialId);

  try {
    const raw = await fs.readFile(getVmbInviteDraftsFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const leaked = parsed.some(
        (d) =>
          typeof d === "object" &&
          d &&
          (d as { trialId?: string }).trialId === trialId,
      );
      assert(!leaked, "production path did not require json file for this trial");
    }
  } catch {
    // no json file is fine
  }

  console.log(`Invite draft storage backend: ${backend}`);
  console.log("OK: VMB invite draft Postgres storage tests passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
