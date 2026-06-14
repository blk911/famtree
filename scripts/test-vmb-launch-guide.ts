/**
 * npm run test:vmb:launch-guide
 */
import {
  advanceLaunchGuideStep,
  createMemoryLaunchGuideStorage,
  dismissLaunchGuide,
  LAUNCH_GUIDE_STORAGE_COMPLETE,
  LAUNCH_GUIDE_STORAGE_DISMISSED,
  LAUNCH_GUIDE_STEPS,
  LAUNCH_GUIDE_TOTAL_STEPS,
  persistLaunchGuideCompletion,
  readLaunchGuideState,
  restartLaunchGuide,
  retreatLaunchGuideStep,
  shouldShowLaunchGuide,
  shouldShowTaikosReminder,
} from "../lib/vmb/onboarding/vmb-launch-guide";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function run(): void {
  const storage = createMemoryLaunchGuideStorage();

  assert(shouldShowLaunchGuide(true, readLaunchGuideState(storage)), "guide appears first time");
  assert(LAUNCH_GUIDE_STEPS.length === 5, "five coach steps before summary");
  assert(LAUNCH_GUIDE_TOTAL_STEPS === 6, "six total steps including summary");

  let step = 1;
  step = advanceLaunchGuideStep(step);
  assert(step === 2, "step progression works");
  step = retreatLaunchGuideStep(step);
  assert(step === 1, "step back works");
  step = advanceLaunchGuideStep(LAUNCH_GUIDE_TOTAL_STEPS - 1);
  assert(step === LAUNCH_GUIDE_TOTAL_STEPS, "final step reached");

  dismissLaunchGuide(storage);
  const dismissed = readLaunchGuideState(storage);
  assert(dismissed.dismissed, "dismiss persists");
  assert(dismissed.completed, "dismiss marks complete");
  assert(!shouldShowLaunchGuide(true, dismissed), "dismissed guide hidden");

  restartLaunchGuide(storage);
  const restarted = readLaunchGuideState(storage);
  assert(!restarted.completed && !restarted.dismissed, "restart clears flags");
  assert(shouldShowLaunchGuide(true, restarted), "restart shows guide again");

  persistLaunchGuideCompletion(false, storage, "2026-06-12T12:00:00.000Z");
  const completed = readLaunchGuideState(storage);
  assert(completed.completed, "completion persists");
  assert(completed.completedAt === "2026-06-12T12:00:00.000Z", "completion timestamp stored");
  assert(storage.store.get(LAUNCH_GUIDE_STORAGE_COMPLETE) === "2026-06-12T12:00:00.000Z", "complete key set");
  assert(!storage.store.has(LAUNCH_GUIDE_STORAGE_DISMISSED), "complete without dismiss clears dismissed");

  persistLaunchGuideCompletion(true, storage);
  assert(readLaunchGuideState(storage).dismissed, "dont show again sets dismissed");

  assert(
    shouldShowTaikosReminder({
      hasActiveBook: true,
      hasActiveAnswer: false,
      guideVisible: false,
    }),
    "TAIKOS reminder when no answer active",
  );
  assert(
    !shouldShowTaikosReminder({
      hasActiveBook: true,
      hasActiveAnswer: true,
      guideVisible: false,
    }),
    "TAIKOS reminder hidden when answer active",
  );
  assert(
    !shouldShowTaikosReminder({
      hasActiveBook: true,
      hasActiveAnswer: false,
      guideVisible: true,
    }),
    "TAIKOS reminder hidden while guide visible",
  );

  console.log("OK: VMB launch guide tests passed");
}

run();
