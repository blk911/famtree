"use client";

import type { InlineWorkflowStage } from "@/components/taikos/workflow/useInlineActionWorkflow";

const STEPS: { id: InlineWorkflowStage; label: string }[] = [
  { id: "detected", label: "Detected" },
  { id: "drafted", label: "Drafted" },
  { id: "approved", label: "Approved" },
  { id: "queued", label: "Queued" },
];

const ORDER: InlineWorkflowStage[] = ["detected", "drafted", "approved", "queued"];

type Props = {
  stage: InlineWorkflowStage;
};

export function OpportunityLifecycle({ stage }: Props) {
  const activeIdx = ORDER.indexOf(stage);

  return (
    <ol className="taikos-opp-lifecycle" aria-label="Opportunity progress">
      {STEPS.map((step, idx) => {
        const done = idx < activeIdx;
        const active = idx === activeIdx;
        return (
          <li
            key={step.id}
            className={`taikos-opp-lifecycle__step${done ? " taikos-opp-lifecycle__step--done" : ""}${active ? " taikos-opp-lifecycle__step--active" : ""}`}
          >
            <span className="taikos-opp-lifecycle__dot" aria-hidden />
            <span className="taikos-opp-lifecycle__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
