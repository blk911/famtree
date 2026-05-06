import type { Metadata } from "next";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { StudioEditor } from "@/components/studios/StudioEditor";
import { cloneFitnessStudioTemplate } from "@/lib/studio/templates/cloneStudioTemplate";
import { normalizeStudioTemplate } from "@/lib/studio/templates/normalizeStudioTemplate";

export const metadata: Metadata = {
  title: "Start your studio — Fitness template | AIH Studios",
  description:
    "Fitness / performance studio starter — hero & contact, story, services preview, publish flow. Neutral spine + vertical presets coming next.",
};

/** Canonical creator start — `StudioEditor` + fitness starter template; see docs/studio-templates.md. */
export default async function StudiosStartPage() {
  const initialStudio = normalizeStudioTemplate(cloneFitnessStudioTemplate());

  return (
    <>
      <StudioEditor initialStudio={initialStudio} mode="template-start" />
      <StudiosFooter />
    </>
  );
}
