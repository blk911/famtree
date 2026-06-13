"use client";

import type { WorkflowState } from "@/components/taikos/workflow/useInlineActionWorkflow";

const STEPS: { id: WorkflowState; label: string }[] = [
  { id: "detected", label: "Detected" },
  { id: "previewed", label: "Previewed" },
  { id: "approved", label: "Approved" },
  { id: "queued", label: "Queued" },
];

const ORDER: WorkflowState[] = ["detected", "previewed", "approved", "queued"];

function progressIndex(stage: WorkflowState): number {
  if (stage === "blocked") return ORDER.indexOf("queued");
  if (stage === "skipped") return -1;
  return ORDER.indexOf(stage);
}

type Props = {
  stage: WorkflowState;
  compact?: boolean;
};

export function OpportunityLifecycle({ stage, compact }: Props) {
  const activeIdx = progressIndex(stage);
  const skipped = stage === "skipped";
  const blocked = stage === "blocked";

  return (
    <ol
      className={`taikos-opp-lifecycle${compact ? " taikos-opp-lifecycle--compact" : ""}${skipped ? " taikos-opp-lifecycle--skipped" : ""}${blocked ? " taikos-opp-lifecycle--blocked" : ""}`}
      aria-label="Opportunity progress"
    >
      {STEPS.map((step, idx) => {
        const done = !skipped && idx < activeIdx;
        const active = !skipped && idx === activeIdx;
        const blockedStep = blocked && step.id === "queued";
        return (
          <li
            key={step.id}
            className={`taikos-opp-lifecycle__step${done ? " taikos-opp-lifecycle__step--done" : ""}${active ? " taikos-opp-lifecycle__step--active" : ""}${blockedStep ? " taikos-opp-lifecycle__step--blocked" : ""}`}
          >
            <span className="taikos-opp-lifecycle__dot" aria-hidden />
            <span className="taikos-opp-lifecycle__label">
              {compact ? null : skipped && step.id === "detected" ? "Skipped" : step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
