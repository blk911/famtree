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
import {
  computeLaunchGuideBubblePlacement,
  launchGuideTargetForNavId,
  launchGuideTargetSelector,
  rectFromBounds,
} from "../lib/vmb/onboarding/launch-guide-targets";

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

  LAUNCH_GUIDE_STEPS.forEach((step) => {
    assert(!!step.target, `step "${step.title}" has target`);
    assert(!!step.ctaLabel.trim(), `step "${step.title}" has cta label`);
  });

  assert(LAUNCH_GUIDE_STEPS[0]?.ctaLabel === "Select Today", "step 1 cta is Select Today");
  assert(LAUNCH_GUIDE_STEPS[0]?.target === "nav-today", "step 1 targets nav-today");
  assert(LAUNCH_GUIDE_STEPS[1]?.target === "taikos-input", "step 2 targets taikos input");
  assert(LAUNCH_GUIDE_STEPS[3]?.target === "preview-button", "step 4 targets preview button");
  assert(LAUNCH_GUIDE_STEPS[3]?.ctaLabel === "Find Preview", "step 4 cta is Find Preview");

  assert(
    launchGuideTargetSelector("taikos-input") === '[data-launch-target="taikos-input"]',
    "target selector format",
  );
  assert(launchGuideTargetForNavId("home") === "nav-today", "home nav maps to nav-today");
  assert(launchGuideTargetForNavId("queue") === "queue-nav", "queue nav maps to queue-nav");

  const targetRect = rectFromBounds({ top: 200, left: 100, width: 120, height: 40 });
  const placement = computeLaunchGuideBubblePlacement({
    targetRect,
    bubbleWidth: 320,
    bubbleHeight: 200,
    viewport: { width: 1200, height: 800 },
  });
  assert(placement.placement === "left", "bubble prefers right-of-target (arrow on left)");
  assert(placement.left > targetRect.right, "bubble sits to the right of target");

  const fallbackPlacement = computeLaunchGuideBubblePlacement({
    targetRect: rectFromBounds({ top: 200, left: 20, width: 80, height: 40 }),
    bubbleWidth: 320,
    bubbleHeight: 200,
    viewport: { width: 360, height: 800 },
  });
  assert(
    ["right", "top", "bottom"].includes(fallbackPlacement.placement),
    "fallback placement when right side lacks room",
  );

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
