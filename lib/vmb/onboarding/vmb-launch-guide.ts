export type LaunchGuideState = {
  completed: boolean;
  dismissed: boolean;
  currentStep: number;
  completedAt?: string;
};

export type LaunchGuideStepContent = {
  title: string;
  body: string;
  hint?: string;
  examples?: string[];
};

export const LAUNCH_GUIDE_STORAGE_COMPLETE = "vmb_launch_guide_complete";
export const LAUNCH_GUIDE_STORAGE_DISMISSED = "vmb_launch_guide_dismissed";

export const LAUNCH_GUIDE_TOTAL_STEPS = 6;

export const LAUNCH_GUIDE_STEPS: LaunchGuideStepContent[] = [
  {
    title: "Welcome to VMB",
    body: "Your client book has already been analyzed. TAIKOS can help identify opportunities hidden in your client relationships.",
    hint: "Try asking: Who should join my PCN?",
  },
  {
    title: "Ask TAIKOS",
    body: "Ask questions about your clients, services, appointments, opportunities, and relationships.",
    examples: [
      "Who should join my PCN?",
      "Who is overdue?",
      "Who were my January clients?",
    ],
  },
  {
    title: "Review Opportunities",
    body: "TAIKOS can identify clients who may benefit from a personal follow-up. The opportunity feed updates as new opportunities are discovered.",
  },
  {
    title: "Preview Invitations",
    body: "Preview a card before taking action. Every invitation can be reviewed and edited.",
  },
  {
    title: "Approve And Queue",
    body: "Approved items move into your queue. Nothing is sent automatically. You remain in control.",
  },
];

export type LaunchGuideStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createMemoryLaunchGuideStorage(): LaunchGuideStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

function defaultStorage(): LaunchGuideStorage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

export function readLaunchGuideState(storage?: LaunchGuideStorage): LaunchGuideState {
  const store = storage ?? defaultStorage();
  if (!store) {
    return { completed: false, dismissed: false, currentStep: 1 };
  }
  const completedRaw = store.getItem(LAUNCH_GUIDE_STORAGE_COMPLETE);
  const completed = !!completedRaw;
  const dismissed = store.getItem(LAUNCH_GUIDE_STORAGE_DISMISSED) === "1";
  return {
    completed,
    dismissed,
    currentStep: 1,
    completedAt: completedRaw ?? undefined,
  };
}

export function shouldShowLaunchGuide(
  hasActiveBook: boolean,
  state: LaunchGuideState = readLaunchGuideState(),
): boolean {
  return hasActiveBook && !state.completed && !state.dismissed;
}

export function shouldShowTaikosReminder(input: {
  hasActiveBook: boolean;
  hasActiveAnswer: boolean;
  guideVisible: boolean;
}): boolean {
  return input.hasActiveBook && !input.hasActiveAnswer && !input.guideVisible;
}

export function persistLaunchGuideCompletion(
  dismissed: boolean,
  storage?: LaunchGuideStorage,
  completedAt: string = new Date().toISOString(),
): LaunchGuideState {
  const store = storage ?? defaultStorage();
  if (!store) {
    return { completed: true, dismissed, currentStep: LAUNCH_GUIDE_TOTAL_STEPS, completedAt };
  }
  store.setItem(LAUNCH_GUIDE_STORAGE_COMPLETE, completedAt);
  if (dismissed) {
    store.setItem(LAUNCH_GUIDE_STORAGE_DISMISSED, "1");
  } else {
    store.removeItem(LAUNCH_GUIDE_STORAGE_DISMISSED);
  }
  return {
    completed: true,
    dismissed,
    currentStep: LAUNCH_GUIDE_TOTAL_STEPS,
    completedAt,
  };
}

export function dismissLaunchGuide(storage?: LaunchGuideStorage): LaunchGuideState {
  return persistLaunchGuideCompletion(true, storage);
}

export function completeLaunchGuide(storage?: LaunchGuideStorage): LaunchGuideState {
  return persistLaunchGuideCompletion(false, storage);
}

export function restartLaunchGuide(storage?: LaunchGuideStorage): LaunchGuideState {
  const store = storage ?? defaultStorage();
  if (store) {
    store.removeItem(LAUNCH_GUIDE_STORAGE_COMPLETE);
    store.removeItem(LAUNCH_GUIDE_STORAGE_DISMISSED);
  }
  return { completed: false, dismissed: false, currentStep: 1 };
}

export function advanceLaunchGuideStep(currentStep: number): number {
  return Math.min(currentStep + 1, LAUNCH_GUIDE_TOTAL_STEPS);
}

export function retreatLaunchGuideStep(currentStep: number): number {
  return Math.max(currentStep - 1, 1);
}

export const LAUNCH_GUIDE_RESTART_EVENT = "vmb-launch-guide-restart";

export function dispatchLaunchGuideRestart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LAUNCH_GUIDE_RESTART_EVENT));
}
