/**
 * npm run test:taikos:storage
 */
import { recordActivity } from "../lib/taikos/activity/activity-store";
import {
  archiveDraft,
  createDraft,
  getDraftById,
  listDrafts,
  updateDraft,
} from "../lib/taikos/drafts/draft-store";
import { createGoal, getGoalById, listGoals, updateGoal } from "../lib/taikos/goals/goal-store";
import {
  createQueueItem,
  getQueueItemById,
  listAllQueueItems,
  updateQueueItemStatus,
} from "../lib/taikos/queue/queue-store";
import { getSessionRecord, upsertSessionRecord } from "../lib/taikos/session/session-store";
import { ensureTaikosStorageTables, resetTaikosStorageBackendCache, resolveTaikosStorageBackend } from "../lib/taikos/storage/taikos-db";
import { assertTaikosWritableBackend, taikosJsonFallbackAllowed } from "../lib/taikos/storage/taikos-storage-policy";
import { getTaikosStorageStats } from "../lib/taikos/storage/taikos-storage-stats";

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

  const writable = await assertTaikosWritableBackend();
  assert(!writable.ok, "Vercel without DATABASE_URL must not allow JSON writes");

  const stats = await getTaikosStorageStats();
  assert(stats.durable === false, "durable:false when no DATABASE_URL on Vercel");
  assert(taikosJsonFallbackAllowed() === false, "JSON fallback blocked on Vercel");

  if (prevVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prevVercel;
  if (prevDb) process.env.DATABASE_URL = prevDb;
  resetTaikosStorageBackendCache();
}

async function run(): Promise<void> {
  await testVercelWithoutDatabase();

  const tablesOk = await ensureTaikosStorageTables();
  const backend = await resolveTaikosStorageBackend();
  console.log(`Storage backend: ${backend} (tables ensured: ${tablesOk})`);

  const salonId = `taikos-storage-test-${Date.now()}`;
  const operatorId = "storage-test-op";

  const draft = await createDraft({
    salonId,
    operatorId,
    sourcePage: "/vmb/campaigns",
    draftType: "campaign",
    title: "Storage test draft",
    status: "draft",
    payload: { message: "Hello from storage test" },
    estimatedValue: 99,
    audit: {},
  });
  assert(!!draft.draftId, "draft create");

  const listedDrafts = await listDrafts({ salonId, type: "campaign" });
  assert(listedDrafts.some((d) => d.draftId === draft.draftId), "draft list");

  const fetchedDraft = await getDraftById(salonId, draft.draftId);
  assert(fetchedDraft?.title === "Storage test draft", "draft get");

  const updatedDraft = await updateDraft(salonId, draft.draftId, {
    title: "Updated storage draft",
    status: "reviewed",
  });
  assert(updatedDraft?.status === "reviewed", "draft update");

  const archivedDraft = await archiveDraft(salonId, draft.draftId);
  assert(archivedDraft?.status === "archived", "draft archive");

  const queueItem = await createQueueItem({
    salonId,
    operatorId,
    draftId: draft.draftId,
    draftTitle: updatedDraft?.title ?? draft.title,
    draftType: draft.draftType,
    estimatedValue: 99,
  });
  assert(!!queueItem.queueId, "queue create");

  const queueListed = await listAllQueueItems(salonId);
  assert(queueListed.some((q) => q.queueId === queueItem.queueId), "queue list");

  const queueFetched = await getQueueItemById(salonId, queueItem.queueId);
  assert(queueFetched?.draftId === draft.draftId, "queue get");

  const queueUpdated = await updateQueueItemStatus(salonId, queueItem.queueId, "ready");
  assert(queueUpdated?.status === "ready", "queue update");

  const goal = await createGoal({
    salonId,
    operatorId,
    title: "Storage test goal",
    category: "REVENUE",
    targetValue: 1000,
    currentValue: 100,
    status: "active",
  });
  assert(!!goal.goalId, "goal create");

  const goals = await listGoals(salonId);
  assert(goals.some((g) => g.goalId === goal.goalId), "goal list");

  const goalFetched = await getGoalById(salonId, goal.goalId);
  assert(goalFetched?.title === "Storage test goal", "goal get");

  const goalUpdated = await updateGoal(salonId, goal.goalId, { currentValue: 250 });
  assert(goalUpdated?.currentValue === 250, "goal update");

  const activity = await recordActivity({
    salonId,
    operatorId,
    kind: "draft_created",
    emoji: "📝",
    headline: "Storage test activity",
    detail: "Created during storage test",
    linkedDraftId: draft.draftId,
  });
  assert(!!activity.activityId, "activity append");

  const session = await upsertSessionRecord(salonId, operatorId, {
    lastViewedPage: "/vmb/opportunities",
    briefingShownToday: true,
  });
  assert(session.lastViewedPage === "/vmb/opportunities", "session upsert");

  const sessionFetched = await getSessionRecord(salonId, operatorId);
  assert(sessionFetched?.briefingShownToday === true, "session read");

  const stats = await getTaikosStorageStats();
  assert(stats.queueCount >= 1 || backend === "json", "storage stats queue count");
  assert(stats.draftCount >= 1 || backend === "json", "storage stats draft count");

  console.log("Sample tAIkOS storage status:", {
    backend: stats.backend,
    durable: stats.durable,
    databaseConnected: stats.databaseConnected,
    queueCount: stats.queueCount,
    draftCount: stats.draftCount,
    goalCount: stats.goalCount,
    activityCount: stats.activityCount,
    sessionCount: stats.sessionCount,
  });

  console.log("OK: tAIkOS storage durability tests passed");
}

void run().catch((err) => {
  console.error(err);
  process.exit(1);
});
