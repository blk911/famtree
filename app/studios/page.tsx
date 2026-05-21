// app/studios/page.tsx — AIH Studios marketing landing (see StudiosLandingClient)

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { StudiosLanding } from "@/components/studios/StudiosLandingClient";

export default async function StudiosLandingPage() {
  const user = await getCurrentUser();
  let continueDraftId: string | null = null;

  if (user) {
    const draft = await prisma.studioBuilderDraft.findFirst({
      where: { ownerUserId: user.id, status: { in: ["draft", "reviewed"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    continueDraftId = draft?.id ?? null;
  }

  return (
    <StudiosLanding
      isAuthenticated={Boolean(user)}
      continueDraftId={continueDraftId}
    />
  );
}
