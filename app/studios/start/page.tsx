import type { Metadata } from "next";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { StudioBuilder, type StudioBuilderUser } from "@/components/studios/StudioBuilder";
import { getCurrentUser } from "@/lib/auth";
import { studioDraftFromDebTemplate } from "@/lib/studio/studioDraft";
import { cloneDebDazzleStudioTemplate } from "@/lib/studio/templates/cloneStudioTemplate";

export const metadata: Metadata = {
  title: "Start your studio — Salon template | AIH Studios",
  description:
    "Build from the canonical Deb Dazzle nail studio template — identity, story, offers, proof, and launch. Save a draft, preview the live page, then publish.",
};

export default async function StudiosStartPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  const fromSlug =
    typeof searchParams?.from === "string" && searchParams.from.trim().length > 0
      ? searchParams.from.trim()
      : null;

  const user = await getCurrentUser();
  const draft = studioDraftFromDebTemplate(cloneDebDazzleStudioTemplate());
  if (user?.id) {
    draft.launch.ownerId = user.id;
  }

  const builderUser: StudioBuilderUser = user
    ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    : null;

  return (
    <>
      <StudioBuilder initialDraft={draft} currentUser={builderUser} mode="builder" fromSlug={fromSlug} />
      <StudiosFooter />
    </>
  );
}
