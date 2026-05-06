import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hydrateNormalizedStudioFromProfile } from "@/lib/studio/hydrateStudioFromProfile";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { StudioEditor } from "@/components/studios/StudioEditor";
import { cloneNeutralStudioTemplate } from "@/lib/studio/templates/cloneStudioTemplate";
import { normalizeStudioTemplate } from "@/lib/studio/templates/normalizeStudioTemplate";
import { parseStudioBuilderNavModeFromSearchParams } from "@/lib/studios/builderNavMode";

export const metadata: Metadata = {
  title: "Start your studio — AIH Studios",
  description:
    "Neutral personal-services starter — hero & contact pre-filled from your AMIHUMAN.NET profile when you are signed in.",
};

/** `/studios/start` loads the neutral base envelope + optional profile hydration. See docs/studio-templates.md. */
export default async function StudiosStartPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getCurrentUser();
  const initialBuilderNavMode = parseStudioBuilderNavModeFromSearchParams(searchParams);

  const profile = user
    ? await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { phone: true, location: true, bio: true },
      })
    : null;

  let initialStudio = normalizeStudioTemplate(cloneNeutralStudioTemplate());

  if (user) {
    initialStudio = hydrateNormalizedStudioFromProfile(initialStudio, user, profile);
  }

  return (
    <>
      <StudioEditor
        initialStudio={initialStudio}
        mode="template-start"
        initialBuilderNavMode={initialBuilderNavMode}
      />
      <StudiosFooter />
    </>
  );
}
