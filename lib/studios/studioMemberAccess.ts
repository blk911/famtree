import { prisma } from "@/lib/db/prisma";

export type StudioMemberAccess = {
  isOwner: boolean;
  isMember: boolean;
  trustUnitId: string | null;
};

export async function resolveStudioMemberAccess(
  studioId: string,
  ownerUserId: string,
  trustUnitId: string | null,
  viewerUserId: string | null,
): Promise<StudioMemberAccess> {
  if (!viewerUserId) {
    return { isOwner: false, isMember: false, trustUnitId };
  }
  if (viewerUserId === ownerUserId) {
    return { isOwner: true, isMember: true, trustUnitId };
  }
  if (!trustUnitId) {
    return { isOwner: false, isMember: false, trustUnitId };
  }
  const membership = await prisma.trustUnitMember.findFirst({
    where: { trustUnitId, userId: viewerUserId },
    select: { id: true },
  });
  return {
    isOwner: false,
    isMember: Boolean(membership),
    trustUnitId,
  };
}
