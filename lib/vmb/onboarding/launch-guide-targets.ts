import type { LaunchGuideTarget } from "./vmb-launch-guide";

export const LAUNCH_GUIDE_TARGET_ATTR = "data-launch-target";
export const LAUNCH_GUIDE_HIGHLIGHT_CLASS = "launch-guide-target-highlight";

export function launchGuideTargetSelector(target: LaunchGuideTarget): string {
  return `[${LAUNCH_GUIDE_TARGET_ATTR}="${target}"]`;
}

export function findLaunchGuideTarget(
  target: LaunchGuideTarget,
  root: ParentNode = typeof document !== "undefined" ? document : (null as unknown as ParentNode),
): HTMLElement | null {
  if (!root) return null;
  return root.querySelector<HTMLElement>(launchGuideTargetSelector(target));
}

export type LaunchGuideRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type LaunchGuideBubblePlacement = "top" | "bottom" | "left" | "right";

export function rectFromBounds(input: {
  top: number;
  left: number;
  width: number;
  height: number;
}): LaunchGuideRect {
  return {
    top: input.top,
    left: input.left,
    width: input.width,
    height: input.height,
    right: input.left + input.width,
    bottom: input.top + input.height,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeLaunchGuideBubblePlacement(input: {
  targetRect: LaunchGuideRect;
  bubbleWidth: number;
  bubbleHeight: number;
  viewport: { width: number; height: number };
  gap?: number;
  padding?: number;
}): { top: number; left: number; placement: LaunchGuideBubblePlacement } {
  const gap = input.gap ?? 12;
  const padding = input.padding ?? 16;
  const { targetRect: target, bubbleWidth, bubbleHeight, viewport } = input;
  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;

  const candidates: Array<{
    placement: LaunchGuideBubblePlacement;
    top: number;
    left: number;
    score: number;
  }> = [
    {
      placement: "left",
      top: clamp(targetCenterY - bubbleHeight / 2, padding, viewport.height - bubbleHeight - padding),
      left: target.right + gap,
      score: target.right + gap + bubbleWidth <= viewport.width - padding ? 0 : 1000,
    },
    {
      placement: "right",
      top: clamp(targetCenterY - bubbleHeight / 2, padding, viewport.height - bubbleHeight - padding),
      left: target.left - gap - bubbleWidth,
      score: target.left - gap - bubbleWidth >= padding ? 1 : 1000,
    },
    {
      placement: "top",
      top: target.bottom + gap,
      left: clamp(targetCenterX - bubbleWidth / 2, padding, viewport.width - bubbleWidth - padding),
      score: target.bottom + gap + bubbleHeight <= viewport.height - padding ? 2 : 1000,
    },
    {
      placement: "bottom",
      top: target.top - gap - bubbleHeight,
      left: clamp(targetCenterX - bubbleWidth / 2, padding, viewport.width - bubbleWidth - padding),
      score: target.top - gap - bubbleHeight >= padding ? 3 : 1000,
    },
  ];

  const best = [...candidates].sort((a, b) => a.score - b.score)[0]!;
  return { top: best.top, left: best.left, placement: best.placement };
}

export type LaunchGuideCtaAction = "click" | "focus" | "scroll" | "none";

export type LaunchGuideCtaResult = {
  acted: boolean;
  action: LaunchGuideCtaAction;
};

export function performLaunchGuideCta(target: LaunchGuideTarget): LaunchGuideCtaResult {
  if (typeof document === "undefined") {
    return { acted: false, action: "none" };
  }

  const element = findLaunchGuideTarget(target);
  if (!element) {
    return { acted: false, action: "none" };
  }

  element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

  switch (target) {
    case "nav-today":
      element.focus({ preventScroll: true });
      return { acted: true, action: "focus" };

    case "taikos-input": {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.focus({ preventScroll: true });
        return { acted: true, action: "focus" };
      }
      element.focus({ preventScroll: true });
      return { acted: true, action: "focus" };
    }

    case "opportunity-feed":
      return { acted: true, action: "scroll" };

    case "preview-button":
      element.focus({ preventScroll: true });
      return { acted: true, action: "focus" };

    case "queue-nav":
      element.focus({ preventScroll: true });
      return { acted: true, action: "focus" };

    case "help-menu":
      element.focus({ preventScroll: true });
      return { acted: true, action: "focus" };

    default:
      return { acted: false, action: "none" };
  }
}

export function launchGuideTargetForNavId(navId: string): LaunchGuideTarget | undefined {
  if (navId === "home") return "nav-today";
  if (navId === "queue") return "queue-nav";
  return undefined;
}
