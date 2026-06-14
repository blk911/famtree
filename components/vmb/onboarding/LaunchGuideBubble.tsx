"use client";

import type { LaunchGuideStepContent } from "@/lib/vmb/onboarding/vmb-launch-guide";

type Props = {
  step: LaunchGuideStepContent;
  stepNumber: number;
  totalSteps: number;
  onCta: () => void;
  onBack?: () => void;
  onSkip: () => void;
};

export function LaunchGuideBubble({
  step,
  stepNumber,
  totalSteps,
  onCta,
  onBack,
  onSkip,
}: Props) {
  return (
    <article className="vmb-launch-guide-bubble" aria-live="polite">
      <p className="vmb-launch-guide-bubble__step">
        Step {stepNumber} of {totalSteps}
      </p>
      <h2 className="vmb-launch-guide-bubble__title">{step.title}</h2>
      <p className="vmb-launch-guide-bubble__body">{step.body}</p>
      {step.hint ? <p className="vmb-launch-guide-bubble__hint">{step.hint}</p> : null}
      {step.examples?.length ? (
        <ul className="vmb-launch-guide-bubble__examples">
          {step.examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
      ) : null}
      <div className="vmb-launch-guide-bubble__actions">
        {onBack ? (
          <button type="button" className="vmb-launch-guide-bubble__btn vmb-launch-guide-bubble__btn--ghost" onClick={onBack}>
            Back
          </button>
        ) : (
          <button type="button" className="vmb-launch-guide-bubble__btn vmb-launch-guide-bubble__btn--ghost" onClick={onSkip}>
            Skip Guide
          </button>
        )}
        <button type="button" className="vmb-launch-guide-bubble__btn" onClick={onCta}>
          {step.ctaLabel}
        </button>
      </div>
    </article>
  );
}
