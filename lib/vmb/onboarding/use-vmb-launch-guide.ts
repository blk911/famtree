"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  advanceLaunchGuideStep,
  dismissLaunchGuide,
  LAUNCH_GUIDE_RESTART_EVENT,
  LAUNCH_GUIDE_TOTAL_STEPS,
  persistLaunchGuideCompletion,
  readLaunchGuideState,
  restartLaunchGuide,
  retreatLaunchGuideStep,
  shouldShowLaunchGuide,
  type LaunchGuideState,
} from "./vmb-launch-guide";

export function useVmbLaunchGuide(hasActiveBook: boolean) {
  const [guideState, setGuideState] = useState<LaunchGuideState>(() => readLaunchGuideState());
  const [currentStep, setCurrentStep] = useState(1);
  const [open, setOpen] = useState(false);

  const visible = open && shouldShowLaunchGuide(hasActiveBook, guideState);

  const syncFromStorage = useCallback(() => {
    setGuideState(readLaunchGuideState());
  }, []);

  const beginGuide = useCallback(() => {
    const next = restartLaunchGuide();
    setGuideState(next);
    setCurrentStep(1);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!hasActiveBook) {
      setOpen(false);
      return;
    }
    const stored = readLaunchGuideState();
    setGuideState(stored);
    if (shouldShowLaunchGuide(hasActiveBook, stored)) {
      setCurrentStep(1);
      setOpen(true);
    }
  }, [hasActiveBook]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("launchGuide") === "1") {
      beginGuide();
    }
  }, [beginGuide]);

  useEffect(() => {
    function onRestart() {
      beginGuide();
    }
    window.addEventListener(LAUNCH_GUIDE_RESTART_EVENT, onRestart);
    return () => window.removeEventListener(LAUNCH_GUIDE_RESTART_EVENT, onRestart);
  }, [beginGuide]);

  const nextStep = useCallback(() => {
    setCurrentStep((step) => advanceLaunchGuideStep(step));
  }, []);

  const backStep = useCallback(() => {
    setCurrentStep((step) => retreatLaunchGuideStep(step));
  }, []);

  const skipGuide = useCallback(() => {
    const next = dismissLaunchGuide();
    setGuideState(next);
    setOpen(false);
  }, []);

  const finishGuide = useCallback((dontShowAgain: boolean) => {
    const next = persistLaunchGuideCompletion(dontShowAgain);
    setGuideState(next);
    setOpen(false);
  }, []);

  const showSummary = visible && currentStep >= LAUNCH_GUIDE_TOTAL_STEPS;
  const showBubble = visible && currentStep < LAUNCH_GUIDE_TOTAL_STEPS;

  return useMemo(
    () => ({
      visible,
      showBubble,
      showSummary,
      currentStep,
      guideState,
      nextStep,
      backStep,
      skipGuide,
      finishGuide,
      restartGuide: beginGuide,
      syncFromStorage,
    }),
    [
      visible,
      showBubble,
      showSummary,
      currentStep,
      guideState,
      nextStep,
      backStep,
      skipGuide,
      finishGuide,
      beginGuide,
      syncFromStorage,
    ],
  );
}
