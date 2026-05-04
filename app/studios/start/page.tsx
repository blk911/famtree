import type { Metadata } from "next";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { StudioEditor } from "@/components/studios/StudioEditor";
import { cloneDebDazzleStudioTemplate } from "@/lib/studio/templates/cloneStudioTemplate";
import { normalizeStudioTemplate } from "@/lib/studio/templates/normalizeStudioTemplate";

export const metadata: Metadata = {
  title: "Start your studio — Salon template | AIH Studios",
  description:
    "Build from the canonical Deb Dazzle nail studio template — hero & contact, story, services preview, and publish flow.",
};

/** Canonical creator start — `StudioEditor` + Deb template only; not shared with admin routes. */
export default async function StudiosStartPage() {
  const initialStudio = normalizeStudioTemplate(cloneDebDazzleStudioTemplate());

  return (
    <>
      <StudioEditor initialStudio={initialStudio} mode="template-start" />
      <StudiosFooter />
    </>
  );
}
