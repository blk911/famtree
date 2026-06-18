import type { LaunchGuideTarget } from "./vmb-launch-guide";

export const LAUNCH_GUIDE_TARGET_ATTR = "data-launch-target";
export const LAUNCH_GUIDE_HIGHLIGHT_CLASS = "launch-guide-target-highlight";
export const LAUNCH_GUIDE_MIN_TOP = 96;
export const LAUNCH_GUIDE_EDGE = 24;
export const LAUNCH_GUIDE_SIDEBAR_WIDTH = 220;
export const LAUNCH_GUIDE_BUBBLE_MAX_WIDTH = 360;

const NAV_TARGETS: LaunchGuideTarget[] = ["nav-today", "queue-nav"];

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

export type LaunchGuideViewportBounds = {
  minTop: number;
  minLeft: number;
  maxRight: number;
  maxBottom: number;
  width: number;
  height: number;
};

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

export function resolveLaunchGuideViewportBounds(input?: {
  windowWidth?: number;
  windowHeight?: number;
  sidebarWidth?: number;
}): LaunchGuideViewportBounds {
  const width = input?.windowWidth ?? 1200;
  const height = input?.windowHeight ?? 800;
  const sidebarWidth = input?.sidebarWidth ?? (width >= 768 ? LAUNCH_GUIDE_SIDEBAR_WIDTH : 0);

  return {
    minTop: LAUNCH_GUIDE_MIN_TOP,
    minLeft: sidebarWidth + 16,
    maxRight: width - LAUNCH_GUIDE_EDGE,
    maxBottom: height - LAUNCH_GUIDE_EDGE,
    width,
    height,
  };
}

export function measureLaunchGuideSidebarWidth(): number {
  if (typeof document === "undefined") {
    return LAUNCH_GUIDE_SIDEBAR_WIDTH;
  }

  const rail = document.querySelector(".vmb-salon-rail");
  if (!rail) {
    return window.innerWidth >= 768 ? LAUNCH_GUIDE_SIDEBAR_WIDTH : 0;
  }

  const rect = rail.getBoundingClientRect();
  if (rect.right <= 0 || rect.width <= 0) {
    return 0;
  }

  return rect.width;
}

function clampBubblePosition(input: {
  top: number;
  left: number;
  bubbleWidth: number;
  bubbleHeight: number;
  bounds: LaunchGuideViewportBounds;
}): { top: number; left: number } {
  const { bounds, bubbleWidth, bubbleHeight } = input;
  const maxLeft = Math.max(bounds.minLeft, bounds.maxRight - bubbleWidth);
  const maxTop = Math.max(bounds.minTop, bounds.maxBottom - bubbleHeight);

  let top = clamp(input.top, bounds.minTop, maxTop);
  let left = clamp(input.left, bounds.minLeft, maxLeft);

  if (left + bubbleWidth > bounds.maxRight) {
    left = bounds.maxRight - bubbleWidth;
  }
  if (top + bubbleHeight > bounds.maxBottom) {
    top = bounds.maxBottom - bubbleHeight;
  }

  top = Math.max(bounds.minTop, top);
  left = Math.max(bounds.minLeft, left);

  return { top, left };
}

function computeArrowOffset(input: {
  placement: LaunchGuideBubblePlacement;
  targetCenterX: number;
  targetCenterY: number;
  top: number;
  left: number;
  bubbleWidth: number;
  bubbleHeight: number;
}): number {
  const edgePad = 20;

  if (input.placement === "left" || input.placement === "right") {
    return clamp(input.targetCenterY - input.top, edgePad, input.bubbleHeight - edgePad);
  }

  return clamp(input.targetCenterX - input.left, edgePad, input.bubbleWidth - edgePad);
}

export type LaunchGuideBubblePlacementResult = {
  top: number;
  left: number;
  placement: LaunchGuideBubblePlacement;
  arrowOffset: number;
};

export function computeLaunchGuideBubblePlacement(input: {
  target: LaunchGuideTarget;
  targetRect: LaunchGuideRect;
  bubbleWidth: number;
  bubbleHeight: number;
  bounds: LaunchGuideViewportBounds;
  gap?: number;
}): LaunchGuideBubblePlacementResult {
  const gap = input.gap ?? 12;
  const { target, targetRect, bubbleWidth, bubbleHeight, bounds } = input;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  let placement: LaunchGuideBubblePlacement;
  let top: number;
  let left: number;

  if (NAV_TARGETS.includes(target)) {
    placement = "left";
    left = targetRect.right + gap;
    top = targetCenterY - bubbleHeight / 2;
    top = Math.max(top, bounds.minTop);
    left = Math.max(left, bounds.minLeft);
  } else {
    const candidates: Array<{
      placement: LaunchGuideBubblePlacement;
      top: number;
      left: number;
      score: number;
    }> = [
      {
        placement: "left",
        top: targetCenterY - bubbleHeight / 2,
        left: targetRect.right + gap,
        score: targetRect.right + gap + bubbleWidth <= bounds.maxRight ? 0 : 1000,
      },
      {
        placement: "right",
        top: targetCenterY - bubbleHeight / 2,
        left: targetRect.left - gap - bubbleWidth,
        score: targetRect.left - gap - bubbleWidth >= bounds.minLeft ? 1 : 1000,
      },
      {
        placement: "top",
        top: targetRect.bottom + gap,
        left: targetCenterX - bubbleWidth / 2,
        score: targetRect.bottom + gap + bubbleHeight <= bounds.maxBottom ? 2 : 1000,
      },
      {
        placement: "bottom",
        top: targetRect.top - gap - bubbleHeight,
        left: targetCenterX - bubbleWidth / 2,
        score: targetRect.top - gap - bubbleHeight >= bounds.minTop ? 3 : 1000,
      },
    ];

    const best = [...candidates].sort((a, b) => a.score - b.score)[0]!;
    placement = best.placement;
    top = best.top;
    left = best.left;
  }

  const clamped = clampBubblePosition({ top, left, bubbleWidth, bubbleHeight, bounds });
  top = clamped.top;
  left = clamped.left;

  const arrowOffset = computeArrowOffset({
    placement,
    targetCenterX,
    targetCenterY,
    top,
    left,
    bubbleWidth,
    bubbleHeight,
  });

  return { top, left, placement, arrowOffset };
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
  if (navId === "invitations") return "queue-nav";
  return undefined;
}
