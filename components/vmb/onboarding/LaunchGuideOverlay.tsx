"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LaunchGuideTarget } from "@/lib/vmb/onboarding/vmb-launch-guide";
import {
  computeLaunchGuideBubblePlacement,
  findLaunchGuideTarget,
  LAUNCH_GUIDE_HIGHLIGHT_CLASS,
  rectFromBounds,
} from "@/lib/vmb/onboarding/launch-guide-targets";

type Props = {
  target: LaunchGuideTarget | null;
  children: ReactNode;
};

export function LaunchGuideOverlay({ target, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const [placement, setPlacement] = useState<"top" | "bottom" | "left" | "right">("left");
  const [useFallback, setUseFallback] = useState(!target);

  useLayoutEffect(() => {
    if (!target) {
      setUseFallback(true);
      setStyle({});
      return;
    }

    let highlighted: HTMLElement | null = null;

    function clearHighlight() {
      if (highlighted) {
        highlighted.classList.remove(LAUNCH_GUIDE_HIGHLIGHT_CLASS);
        highlighted = null;
      }
    }

    function updatePlacement() {
      const run = () => {
        const targetEl = findLaunchGuideTarget(target!);
        if (!targetEl) {
          clearHighlight();
          setUseFallback(true);
          setStyle({});
          return;
        }

        setUseFallback(false);
        if (highlighted !== targetEl) {
          clearHighlight();
          targetEl.classList.add(LAUNCH_GUIDE_HIGHLIGHT_CLASS);
          highlighted = targetEl;
        }

        const targetRect = rectFromBounds(targetEl.getBoundingClientRect());
        const panel = panelRef.current;
        const bubbleWidth = panel?.offsetWidth ?? 320;
        const bubbleHeight = panel?.offsetHeight ?? 220;
        const result = computeLaunchGuideBubblePlacement({
          targetRect,
          bubbleWidth,
          bubbleHeight,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        });

        setPlacement(result.placement);
        setStyle({
          position: "fixed",
          top: result.top,
          left: result.left,
          zIndex: 40,
          maxWidth: Math.min(360, window.innerWidth - 32),
        });
      };

      run();
      window.requestAnimationFrame(run);
    }

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
      clearHighlight();
    };
  }, [target]);

  return (
    <div
      className={`vmb-launch-guide-overlay${useFallback ? " vmb-launch-guide-overlay--fallback" : ""}`}
      aria-live="polite"
      style={useFallback ? undefined : style}
    >
      <div
        ref={panelRef}
        className={`vmb-launch-guide-overlay__panel vmb-launch-guide-overlay__panel--arrow-${placement}`}
      >
        {children}
      </div>
    </div>
  );
}
