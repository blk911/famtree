import type { Metadata } from "next";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { StudioEditor } from "@/components/studios/StudioEditor";
import { DEB_DAZZLE_STUDIO_TEMPLATE } from "@/lib/studio/templates/deb-dazzle-template";
import { normalizeStudioTemplate } from "@/lib/studio/templates/normalizeStudioTemplate";

export const metadata: Metadata = {
  title: "Start your studio — Salon template | AIH Studios",
  description:
    "Build from the canonical Deb Dazzle nail studio template — services, hero, and preview flow. Live profile appears only in the header; editable content comes from the golden template.",
};

export default async function StudiosStartPage() {
  console.log("[studios/start] page render — canonical Deb template (no DB / user studio base)");
  try {
    const initialStudio = normalizeStudioTemplate(DEB_DAZZLE_STUDIO_TEMPLATE);
    return (
      <>
        <StudioEditor initialStudio={initialStudio} mode="template-start" />
        <StudiosFooter />
      </>
    );
  } catch (error) {
    console.error("[studios/start] render failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
