/**
 * npm run test:vmb:workspace
 * Verifies VMB salon workspace lifecycle store and helpers.
 */
import { promises as fs } from "fs";
import path from "path";
import {
  getWorkspaceForTrial,
  setLatestAnalysis,
  upsertWorkspaceForTrial,
} from "../lib/vmb/workspace-store";
import { isRefreshDue, workspaceLatestAnalysisId } from "../lib/vmb/workspace-lifecycle";
import { getVmbWorkspacesFile } from "../lib/vmb/paths";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const trialA = `test-workspace-a-${Date.now()}`;
const trialB = `test-workspace-b-${Date.now()}`;

async function cleanupTestWorkspaces(): Promise<void> {
  const filePath = getVmbWorkspacesFile();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const kept = parsed.filter(
      (w) =>
        typeof w === "object" &&
        w &&
        typeof (w as { trialId?: string }).trialId === "string" &&
        !(w as { trialId: string }).trialId.startsWith("test-workspace-"),
    );
    await fs.writeFile(filePath, JSON.stringify(kept, null, 2), "utf8");
  } catch {
    // no file yet
  }
}

async function run(): Promise<void> {
  await cleanupTestWorkspaces();

  const upsertA = await upsertWorkspaceForTrial({
    trialId: trialA,
    salonName: "Salon A",
    ownerName: "Owner A",
    email: "a@example.com",
    providerPlatform: "vagaro",
  });
  assert(!("error" in upsertA), "upsert workspace A succeeds");

  const firstAnalysis = "analysis-first-a";
  const setFirst = await setLatestAnalysis(trialA, firstAnalysis);
  assert(!("error" in setFirst), "first ingest sets latest analysis");
  const workspaceAfterFirst = ("workspace" in setFirst ? setFirst.workspace : null)!;
  assert(workspaceAfterFirst.firstIngestCompleted === true, "first ingest marks complete");
  assert(workspaceAfterFirst.latestAnalysisId === firstAnalysis, "latestAnalysisId set on first ingest");
  assert(
    workspaceAfterFirst.analysisIds.includes(firstAnalysis),
    "analysisIds includes first analysis",
  );
  assert(!!workspaceAfterFirst.lastIngestAt, "lastIngestAt set");
  assert(!!workspaceAfterFirst.nextRefreshDueAt, "nextRefreshDueAt set");

  const resolved = workspaceLatestAnalysisId(workspaceAfterFirst);
  assert(resolved === firstAnalysis, "dashboard can resolve latest analysis with no query param");

  const notDue = isRefreshDue(workspaceAfterFirst, new Date("2020-01-01"));
  assert(!notDue, "refresh not due before nextRefreshDueAt");

  const dueWorkspace = {
    ...workspaceAfterFirst,
    nextRefreshDueAt: "2020-01-01T00:00:00.000Z",
  };
  assert(isRefreshDue(dueWorkspace, new Date("2021-01-01")), "refresh due calculation works");

  const secondAnalysis = "analysis-second-a";
  const setSecond = await setLatestAnalysis(trialA, secondAnalysis);
  assert(!("error" in setSecond), "second ingest updates workspace");
  const workspaceAfterSecond = ("workspace" in setSecond ? setSecond.workspace : null)!;
  assert(workspaceAfterSecond.latestAnalysisId === secondAnalysis, "latestAnalysisId updated");
  assert(
    workspaceAfterSecond.analysisIds.includes(firstAnalysis) &&
      workspaceAfterSecond.analysisIds.includes(secondAnalysis),
    "second ingest appends analysisId without wiping list",
  );
  assert(workspaceAfterSecond.analysisIds.length === 2, "analysisIds has both entries");

  await upsertWorkspaceForTrial({
    trialId: trialB,
    salonName: "Salon B",
    ownerName: "Owner B",
    email: "b@example.com",
  });
  await setLatestAnalysis(trialB, "analysis-b-only");

  const wsA = await getWorkspaceForTrial(trialA);
  const wsB = await getWorkspaceForTrial(trialB);
  assert(wsA?.trialId === trialA, "trial A reads own workspace");
  assert(wsB?.trialId === trialB, "trial B reads own workspace");
  assert(wsA?.latestAnalysisId !== wsB?.latestAnalysisId, "no cross-trial workspace access");

  const cross = await getWorkspaceForTrial(trialA);
  assert(cross?.latestAnalysisId === secondAnalysis, "trial A latest unchanged after trial B ingest");

  await cleanupTestWorkspaces();
  console.log("OK: VMB workspace lifecycle tests passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
